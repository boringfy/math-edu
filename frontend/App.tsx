import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
// The app draws edge-to-edge on Android, so real insets are needed to keep
// the number pad clear of the navigation bar.
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import SubjectTabs from './src/components/SubjectTabs';
import { passageOf, storyQuestions, useContent } from './src/content';
import { CursorState } from './src/content/cursor';
import {
  AdaptiveEvent,
  AdaptiveState,
  AdaptiveStore,
  adaptiveKey,
  adaptRound,
  baseTier,
  DEFAULT_ADAPTIVE,
  initState,
  practicePlan,
  topicOfId,
} from './src/lib/adaptive';
import {
  composedQuestions,
  highestOpenLevel,
  isEndless,
  levelOf,
  masteryFor,
  stopsUpTo,
  strugglingSkills,
} from './src/lib/endless';
import { fetchPlan, loadPlans } from './src/lib/levelPlanFetch';
import { promoteToEntry, shuffle } from './src/lib/grading';
import { starsFor } from './src/lib/mapProgress';
import {
  applyMetrics,
  ChallengeDef,
  correctionAward,
  dailyForDate,
  dayKey,
  emptyMetrics,
  freshDaily,
  lessonAward,
} from './src/lib/progress';
import {
  currentProfile,
  forgetProfile,
  loadAdaptive,
  loadCoins,
  loadCursors,
  loadGrades,
  loadDaily,
  loadHistory,
  loadProgress,
  loadSettings,
  loadTier,
  loadUnlocks,
  migrateToProfiles,
  saveAdaptive,
  saveCoins,
  saveCursors,
  saveDaily,
  saveGrades,
  saveProgress,
  saveResult,
  saveSettings,
  saveProfiles,
  saveTier,
  saveUnlocks,
  useProfile as useProfileStorage,
} from './src/lib/storage';
import {
  ProfileStore,
  activeProfile,
  addProfile,
  canAddProfile,
  emptyProfiles,
  makeProfile,
  removeProfile,
  renameProfile,
  switchTo,
} from './src/lib/profiles';
import { markDirty, pullAndMerge } from './src/lib/sync';
import {
  DEFAULT_PAID_SUBJECTS,
  DEFAULT_UNLOCK_COST,
  UnlockMap,
  canBuy,
  chargesForLessons,
  emptyUnlocks,
  withPaid,
} from './src/lib/unlocks';
import CorrectionScreen, { CorrectionOutcome } from './src/screens/CorrectionScreen';
import HomeScreen from './src/screens/HomeScreen';
import QuizScreen from './src/screens/QuizScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { colors } from './src/theme';
import {
  AnswerRecord,
  CoinAward,
  DailyState,
  DEFAULT_SETTINGS,
  Grade,
  Lesson,
  MapStop,
  Passage,
  ProgressMap,
  PuzzleSet,
  Question,
  QuizResult,
  Settings,
  Stars,
  Story,
  Subject,
  Tier,
} from './src/types';

type Phase = 'home' | 'quiz' | 'results' | 'correction' | 'settings';

const GRADES: Grade[] = [1, 2, 3, 4, 5];

/** Coins a session has banked so far, itemised for the results screen. */
const noAward: CoinAward = {
  correct: 0,
  fixed: 0,
  combo: 0,
  perfect: 0,
  firstClear: 0,
  challenges: 0,
  total: 0,
};

const noProgress: Record<Subject, ProgressMap> = { math: {}, reading: {}, logic: {} };

interface Session {
  resultId: string;
  subject: Subject;
  grade: Grade;
  tier: Tier;
  /** null for free practice, which sits outside the maps. */
  stop: MapStop | null;
  /** The story to keep on screen, for a reading round. */
  passage: Passage | null;
  questions: Question[];
  records: AnswerRecord[];
  elapsedMs: number;
  bestCombo: number;
  stars: Stars | null;
  award: CoinAward;
  completedChallenges: ChallengeDef[];
  tierChange: 'up' | 'down' | null;
  /** What adapting to this round changed: unlocks and per-topic tier moves. */
  adaptiveEvents: AdaptiveEvent[];
  afterCorrection: boolean;
}

/** What opening a session needs; everything else starts empty. */
type SessionStart = Pick<Session, 'subject' | 'grade' | 'tier' | 'stop' | 'passage' | 'questions'>;

export default function App() {
  const [phase, setPhase] = useState<Phase>('home');
  const [subject, setSubject] = useState<Subject>('math');
  /**
   * One grade per subject. A child who reads ahead of their arithmetic — or
   * the other way round — should not have to pick which of the two to get
   * wrong.
   */
  const [grades, setGrades] = useState<Record<Subject, Grade>>({
    math: 1,
    reading: 1,
    logic: 1,
  });
  const [history, setHistory] = useState<QuizResult[]>([]);
  const [tiers, setTiers] = useState<Record<Grade, Tier>>({ 1: 2, 2: 2, 3: 2, 4: 2, 5: 2 });
  const [coins, setCoins] = useState(0);
  const [progress, setProgress] = useState<Record<Subject, ProgressMap>>(noProgress);
  const [daily, setDaily] = useState<DailyState>(() => freshDaily(dayKey(new Date())));
  const [session, setSession] = useState<Session | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  // Content for this launch. Fixed until the app is restarted — an update
  // downloaded now takes effect next time, never mid-session.
  const { library } = useContent();
  const [cursors, setCursors] = useState<CursorState>({});
  const [adaptive, setAdaptive] = useState<AdaptiveStore>({});
  const [unlocks, setUnlocks] = useState<UnlockMap>(emptyUnlocks());
  const [profiles, setProfiles] = useState<ProfileStore>(emptyProfiles());
  /** Held while a purchase is in flight, so a double tap cannot double-spend. */
  const buying = useRef(false);
  /** Bumped when a planned level arrives, purely to redraw the map. */
  const [planTick, setPlanTick] = useState(0);

  /**
   * Reads one child's world in. Called at launch and again on every switch,
   * so a swap of profile is a reload rather than a special case — which is
   * what keeps a half-swapped state, one child's coins beside another's map,
   * from being possible at all.
   */
  const loadForActiveProfile = async () => {
    // Plans belong to the child they were planned for: they follow that
    // child's mastery, so one child's level must not be shown to another.
    await loadPlans(currentProfile());
    setHistory(await loadHistory());
    setAdaptive(await loadAdaptive());
    setUnlocks(await loadUnlocks());
    const loaded = await Promise.all(GRADES.map((g) => loadTier(g)));
    setTiers({ 1: loaded[0], 2: loaded[1], 3: loaded[2], 4: loaded[3], 5: loaded[4] });
    setCoins(await loadCoins());
    setCursors(library.pruneCursors(await loadCursors()));
    setGrades(await loadGrades());
    setProgress({
      math: await loadProgress('math'),
      reading: await loadProgress('reading'),
      logic: await loadProgress('logic'),
    });
    // Challenges roll over on the local date, so a stored day that isn't
    // today is replaced rather than resumed.
    const today = dailyForDate(await loadDaily(), dayKey(new Date()));
    setDaily(today);
    await saveDaily(today);
  };

  useEffect(() => {
    (async () => {
      // Before anything is read: a device that predates profiles gets its
      // first one here, carrying everything already on it across.
      const store = await migrateToProfiles();
      useProfileStorage(store.activeId);
      setProfiles(store);

      // Device-wide, so it is read once and not again on a switch.
      setSettings(await loadSettings());
      await loadForActiveProfile();

      // Then, without holding the app up, fold in whatever the sync server
      // has: progress from another device lands as if it were always here.
      void pullAndMerge().then((merged) => {
        if (!merged) return;
        setGrades(merged.grades);
        setTiers(merged.tiers);
        setCoins(merged.coins);
        setProgress(merged.progress);
        setHistory(merged.history);
        setSettings(merged.settings);
        setAdaptive(merged.adaptive);
        const day = dailyForDate(merged.daily, dayKey(new Date()));
        setDaily(day);
        void saveDaily(day);
      });
    })();
  }, []);

  const grade = grades[subject];
  const whoIsPlaying = activeProfile(profiles);

  /**
   * Asks the server to plan the level being looked at, in the background.
   *
   * Fire and forget by design: the map is already showing a level the app
   * composed, and a plan arriving simply replaces it with a better-named one.
   * If nothing arrives, nothing changes and nobody waits.
   */
  useEffect(() => {
    if (!isEndless(subject)) return;
    const authored =
      subject === 'logic' ? library.puzzleSets(grade).length : library.lessons(grade).length;
    const firstComposed = Math.ceil(authored / 10) + 1;
    const level = highestOpenLevel(
      subject,
      grade,
      subject === 'logic' ? library.puzzleSets(grade) : library.lessons(grade),
      progress[subject],
    );
    if (level < firstComposed) return;

    const state = adaptive[adaptiveKey(subject, grade)];
    void fetchPlan(
      {
        subject,
        grade,
        level,
        firstComposedLevel: firstComposed,
        mastery: masteryFor(state, grade, level, authored) as Record<string, number>,
        struggling: strugglingSkills(state),
      },
      currentProfile(),
    ).then((arrived) => {
      // Nudges a redraw so the freshly planned level is the one on screen.
      if (arrived) setPlanTick((n) => n + 1);
    });
  }, [subject, grade, progress, adaptive, library, profiles.activeId]);

  /**
   * Hands the tablet to another child.
   *
   * Any round in progress is dropped: finishing one child's lesson and
   * banking it against another's coins is the one outcome worth being blunt
   * about avoiding.
   */
  const switchProfile = async (id: string) => {
    if (id === profiles.activeId) return;
    const next = switchTo(profiles, id);
    setProfiles(next);
    await saveProfiles(next);
    useProfileStorage(next.activeId);
    setSession(null);
    setPhase('home');
    await loadForActiveProfile();
  };

  const addKid = async (name: string) => {
    if (!canAddProfile(profiles)) return;
    const next = addProfile(profiles, makeProfile(name, profiles.profiles));
    setProfiles(next);
    await saveProfiles(next);
    // A brand-new child starts on an empty slate, which is what the reload
    // finds under their own keys.
    useProfileStorage(next.activeId);
    setSession(null);
    setPhase('home');
    await loadForActiveProfile();
  };

  const renameKid = async (id: string, name: string) => {
    const next = renameProfile(profiles, id, name);
    setProfiles(next);
    await saveProfiles(next);
  };

  /** Removing a child throws their progress away, so it asks first upstairs. */
  const removeKid = async (id: string) => {
    const next = removeProfile(profiles, id);
    if (next === profiles) return;
    setProfiles(next);
    await saveProfiles(next);
    await forgetProfile(id);
    if (next.activeId !== profiles.activeId) {
      useProfileStorage(next.activeId);
      setSession(null);
      setPhase('home');
      await loadForActiveProfile();
    }
  };

  const changeGrade = (forSubject: Subject, next: Grade) => {
    setGrades((current) => {
      const updated = { ...current, [forSubject]: next };
      void saveGrades(updated);
      markDirty();
      return updated;
    });
  };

  /** Drops whatever round is open and shows the maps again. */
  const goHome = () => {
    setSession(null);
    setPhase('home');
  };

  const newSession = (start: SessionStart) => {
    setSession({
      resultId: `r${Date.now()}`,
      records: [],
      elapsedMs: 0,
      bestCombo: 0,
      stars: null,
      award: noAward,
      completedChallenges: [],
      tierChange: null,
      adaptiveEvents: [],
      afterCorrection: false,
      ...start,
    });
    setPhase('quiz');
  };

  /**
   * The last of it, whichever way the questions were come by: a share of them
   * promoted to typed entry, and the order shuffled.
   */
  const finishForPlay = (questions: Question[], tier: Tier): Question[] => {
    promoteToEntry(questions, tier, library.rules?.entryShare ?? { 1: 0.25, 2: 0.5, 3: 0.75 });
    return shuffle(questions);
  };

  /**
   * Takes a draw from the library and advances the pool cursors.
   *
   * The cursor is what stops a pool repeating, so it is saved as a side
   * effect here rather than left to the caller to remember.
   */
  const drawQuestions = (
    take: (state: CursorState) => { questions: Question[]; cursors: CursorState },
    tier: Tier,
  ): Question[] => {
    const { questions, cursors: next } = take(cursors);
    setCursors(next);
    void saveCursors(next);
    return finishForPlay(questions, tier);
  };

  const startLesson = (lesson: Lesson) => {
    // Past the authored sixty a lesson carries its own recipe, so its
    // problems are built here rather than drawn from a baked pool. There is
    // no cursor to keep: the lesson's seed is what stops it repeating.
    const composed = composedQuestions(
      lesson,
      library.lessons(lesson.grade).length,
      adaptive[adaptiveKey('math', lesson.grade)],
    );

    newSession({
      subject: 'math',
      grade: lesson.grade,
      tier: lesson.tier,
      stop: lesson,
      passage: null,
      questions: composed
        ? finishForPlay(composed, lesson.tier)
        : drawQuestions(
            (state) => library.lessonQuestions(lesson, state, Math.random),
            lesson.tier,
          ),
    });
  };

  const startStory = (story: Story) => {
    newSession({
      subject: 'reading',
      grade: story.grade,
      tier: story.tier,
      stop: story,
      passage: passageOf(story),
      // Comprehension questions are authored with the story, so they are
      // taken whole rather than drawn from a pool.
      questions: storyQuestions(story, shuffle),
    });
  };

  const startPuzzles = (set: PuzzleSet) => {
    const composed = composedQuestions(
      set,
      library.puzzleSets(set.grade).length,
      adaptive[adaptiveKey('logic', set.grade)],
    );

    newSession({
      subject: 'logic',
      grade: set.grade,
      tier: set.tier,
      stop: set,
      passage: null,
      questions: composed
        ? finishForPlay(composed, set.tier)
        : drawQuestions(
            (state) => library.puzzleQuestions(set, state, Math.random),
            set.tier,
          ),
    });
  };

  const adaptiveRules = () => library.rules?.adaptive ?? DEFAULT_ADAPTIVE;

  /**
   * The adaptive state for one subject and grade, seeded on first play: the
   * opening types are the front of the unlock ladder, at the tier the old
   * per-grade dial had reached, so an established player starts where they
   * left off rather than back at Normal.
   */
  const practiceState = (forSubject: 'math' | 'logic', forGrade: Grade): AdaptiveState => {
    const existing = adaptive[adaptiveKey(forSubject, forGrade)];
    if (existing) return existing;
    const rules = adaptiveRules();
    return initState(
      library.availableTopics(forSubject, forGrade, rules.unlockOrder[forSubject]),
      rules.starterCount[forSubject],
      forSubject === 'math' ? tiers[forGrade] : 2,
    );
  };

  const startPractice = (
    practiceSubject: 'math' | 'logic',
    practiceGrade: Grade,
    count: number,
  ) => {
    const state = practiceState(practiceSubject, practiceGrade);
    const key = adaptiveKey(practiceSubject, practiceGrade);
    if (!adaptive[key]) {
      const seeded = { ...adaptive, [key]: state };
      setAdaptive(seeded);
      void saveAdaptive(seeded);
    }

    const tier = baseTier(state);
    const plan = practicePlan(state, adaptiveRules(), library.practicePools(practiceSubject, practiceGrade));
    // A pack with none of the planned pools still has to produce a quiz, so
    // an empty plan falls back to an even draw across the tier.
    const picks =
      plan.length > 0
        ? plan
        : library
            .practicePools(practiceSubject, practiceGrade)
            .filter((k) => k.endsWith(`:${tier}`) && !k.startsWith('draw:'))
            .map((poolKey) => ({ key: poolKey, weight: 1 }));

    newSession({
      subject: practiceSubject,
      grade: practiceGrade,
      tier,
      stop: null,
      passage: null,
      questions: drawQuestions(
        (state2) =>
          library.weightedPractice(practiceSubject, practiceGrade, picks, tier, count, state2, Math.random),
        tier,
      ),
    });
  };

  const resultFromSession = (s: Session): QuizResult => {
    const mistakes = s.records.filter((r) => !r.correct);
    return {
      id: s.resultId,
      date: new Date().toISOString(),
      subject: s.subject,
      grade: s.grade,
      tier: s.tier,
      total: s.records.length,
      correctCount: s.records.length - mistakes.length,
      fixedCount: mistakes.filter((r) => r.fixed).length,
      skippedCount: mistakes.filter((r) => r.skipped).length,
      elapsedMs: s.elapsedMs,
      stopId: s.stop?.id,
      stars: s.stars ?? undefined,
      coins: s.award.total,
    };
  };

  const persistResult = async (s: Session, newTier: Tier) => {
    const result = resultFromSession(s);
    await saveResult(result);
    setHistory((prev) => [result, ...prev.filter((r) => r.id !== result.id)]);
    // The legacy per-grade dial stays live for math, so rolling this build
    // back loses nothing. It was never a logic setting, so logic never writes.
    if (newTier !== s.tier && s.subject === 'math') {
      await saveTier(s.grade, newTier);
      setTiers((prev) => ({ ...prev, [s.grade]: newTier }));
    }
    markDirty();
  };

  /** Records stars against the map the session came from. */
  const persistStars = async (s: Session, stop: MapStop, stars: Stars, percent: number) => {
    const next = await saveProgress(s.subject, stop.id, {
      stars,
      bestPercent: percent,
      clearedAt: new Date().toISOString(),
    });
    setProgress((prev) => ({ ...prev, [s.subject]: next }));
    markDirty();
  };

  /** Banks coins, rolls the day's challenges on, and pays their rewards. */
  /** What the next lesson costs, from the rules pack or the compiled default. */
  const unlockCost = library.rules?.unlockCost ?? DEFAULT_UNLOCK_COST;
  const paidSubjects = library.rules?.paidSubjects ?? DEFAULT_PAID_SUBJECTS;

  /**
   * A subject's map, far enough along to include the stop being asked about.
   * Composed stops are rebuilt rather than stored, so "far enough" is however
   * many levels it takes to reach the one in question.
   */
  const mapFor = (forSubject: Subject, forGrade: Grade, level = 1): MapStop[] => {
    if (forSubject === 'reading') return library.stories(forGrade);
    const authored =
      forSubject === 'logic' ? library.puzzleSets(forGrade) : library.lessons(forGrade);
    return stopsUpTo(forSubject, forGrade, level, authored, adaptive[adaptiveKey(forSubject, forGrade)]);
  };

  /** Buys the next lesson. */
  const buyStop = async (forSubject: Subject, stop: MapStop) => {
    /*
      One purchase at a time. Both the coins and the purchases are React
      state, so two taps landing before the first re-render would each read
      the same purse and the same list — charging once for two lessons, and
      losing one of them when the second write overwrote the first.
    */
    if (buying.current) return;

    // Checked here rather than trusted from the map: this is the only place
    // coins leave the purse, so it is the only place that has to be sure.
    const stops = mapFor(forSubject, stop.grade, levelOf(stop.index));
    const charges = chargesForLessons(forSubject, paidSubjects);
    if (!canBuy(forSubject, stops, stop, progress[forSubject], unlocks, coins, unlockCost, charges)) {
      return;
    }
    buying.current = true;
    try {
      // The purchase is written before the coins are taken. If the app dies
      // between the two the child has a lesson they did not pay for, which is
      // a kindness; the other order would take the coins and lose the lesson.
      const next = withPaid(forSubject, stop.id, unlocks);
      setUnlocks(next);
      await saveUnlocks(next);

      const left = coins - unlockCost;
      setCoins(left);
      await saveCoins(left);
      markDirty();
    } finally {
      buying.current = false;
    }
  };

  const bank = async (
    earned: CoinAward,
    metrics: Parameters<typeof applyMetrics>[1],
  ): Promise<CoinAward & { completed: ChallengeDef[] }> => {
    const update = applyMetrics(daily, { ...metrics, coinsEarned: earned.total });
    setDaily(update.state);
    await saveDaily(update.state);

    const total = earned.total + update.coins;
    const next = coins + total;
    setCoins(next);
    await saveCoins(next);
    markDirty();

    return {
      ...earned,
      challenges: update.coins,
      total,
      completed: update.completed,
    };
  };

  const onQuizComplete = async (
    records: AnswerRecord[],
    elapsedMs: number,
    bestCombo: number,
  ) => {
    if (!session) return;
    const correctCount = records.filter((r) => r.correct).length;
    const total = records.length;

    /**
     * Every maths and logic round teaches us something about the child, so
     * every one of them is recorded — map lessons included, which they were
     * not before. That per-skill record is what the composer reads to decide
     * how hard to make the next level, so a lesson that goes badly has to
     * count or the levels only ever climb.
     *
     * What stays free-practice-only is what the child is *shown*: the tier
     * dial and the unlock banners belong to practice's own ladder, and a map
     * lesson's difficulty comes from its own recipe.
     */
    let newTier = session.tier;
    let adaptiveEvents: AdaptiveEvent[] = [];
    if (session.subject === 'math' || session.subject === 'logic') {
      const rules = adaptiveRules();
      const order = library.availableTopics(
        session.subject,
        session.grade,
        rules.unlockOrder[session.subject],
      );
      const answers = records
        .map((r) => ({ topic: topicOfId(r.question.id), correct: r.correct }))
        .filter((a): a is { topic: string; correct: boolean } => a.topic !== null);
      if (answers.length > 0) {
        const adapted = adaptRound(
          practiceState(session.subject, session.grade),
          answers,
          rules,
          order,
        );
        const store = { ...adaptive, [adaptiveKey(session.subject, session.grade)]: adapted.state };
        setAdaptive(store);
        void saveAdaptive(store);
        markDirty();
        if (!session.stop) {
          adaptiveEvents = adapted.events;
          newTier = baseTier(adapted.state);
        }
      }
    }
    const tierChange = newTier > session.tier ? 'up' : newTier < session.tier ? 'down' : null;

    const stars = session.stop ? starsFor(correctCount, total) : null;
    const firstClear =
      session.stop !== null &&
      stars !== null &&
      stars > 0 &&
      (progress[session.subject][session.stop.id]?.stars ?? 0) === 0;

    const earned = await bank(
      lessonAward({ correctCount, total, bestCombo, firstClear }),
      {
        ...emptyMetrics(),
        lessonsPlayed: 1,
        lessonsCleared: stars !== null && stars > 0 ? 1 : 0,
        perfectLessons: stars === 3 ? 1 : 0,
        correctAnswers: correctCount,
        bestCombo,
      },
    );

    if (session.stop && stars !== null) {
      await persistStars(session, session.stop, stars, Math.round((correctCount / total) * 100));
    }

    const updated: Session = {
      ...session,
      records,
      elapsedMs,
      bestCombo,
      stars,
      tierChange,
      adaptiveEvents,
      award: earned,
      completedChallenges: earned.completed,
    };
    setSession(updated);
    setPhase('results');
    await persistResult(updated, newTier);
  };

  const onCorrectionDone = async (outcomes: CorrectionOutcome[]) => {
    if (!session) return;
    const byId = new Map(outcomes.map((o) => [o.questionId, o]));
    const records = session.records.map((r) => {
      const o = byId.get(r.question.id);
      return o ? { ...r, attempts: o.attempts, fixed: o.fixed, skipped: o.skipped } : r;
    });

    const fixedCount = outcomes.filter((o) => o.fixed).length;
    const earned = await bank(correctionAward(fixedCount), {
      ...emptyMetrics(),
      mistakesFixed: fixedCount,
    });

    // Practice can rescue a failed stop to a single star — enough to open
    // the next one — but never to the two or three a clean run earns.
    let stars = session.stars;
    if (session.stop && stars === 0) {
      const correctCount = records.filter((r) => r.correct).length;
      const rescued = Math.min(1, starsFor(correctCount + fixedCount, records.length)) as Stars;
      if (rescued > 0) {
        stars = rescued;
        await persistStars(
          session,
          session.stop,
          rescued,
          Math.round((correctCount / records.length) * 100),
        );
      }
    }

    const updated: Session = {
      ...session,
      records,
      stars,
      afterCorrection: true,
      award: earned,
      completedChallenges: earned.completed,
    };
    setSession(updated);
    setPhase('results');
    await persistResult(updated, updated.tier);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        {phase === 'home' && (
          <View style={styles.home}>
            <HomeScreen
              subject={subject}
              library={library}
              history={history}
              grade={grade}
              tiers={tiers}
              coins={coins}
              daily={daily}
              progress={progress[subject]}
              adaptive={adaptive}
              profiles={profiles}
            onSwitchProfile={(id) => void switchProfile(id)}
            onAddProfile={() => setPhase('settings')}
            unlocks={unlocks}
            unlockCost={unlockCost}
            paidSubjects={paidSubjects}
            onUnlock={(forSubject, stop) => void buyStop(forSubject, stop)}
            onStartLesson={startLesson}
              onStartStory={startStory}
              onStartPuzzles={startPuzzles}
              onStartPractice={startPractice}
              onOpenSettings={() => setPhase('settings')}
            />
            <SubjectTabs subject={subject} onSelect={setSubject} />
          </View>
        )}
        {phase === 'settings' && (
          <SettingsScreen
            profiles={profiles}
            onAddProfile={(name) => void addKid(name)}
            onRenameProfile={(id, name) => void renameKid(id, name)}
            onRemoveProfile={(id) => void removeKid(id)}
            settings={settings}
            onChange={(next) => {
              setSettings(next);
              void saveSettings(next);
              markDirty();
            }}
            grades={grades}
            onGradeChange={changeGrade}
            onBack={() => setPhase('home')}
          />
        )}
        {phase === 'quiz' && session && (
          <QuizScreen
            subject={session.subject}
            grade={session.grade}
            scratchPaper={settings.scratchPaper}
            penOnly={settings.penOnly}
            questions={session.questions}
            passage={session.passage ?? undefined}
            onComplete={onQuizComplete}
            onQuit={goHome}
          />
        )}
        {phase === 'results' && session && (
          <ResultsScreen
            records={session.records}
            elapsedMs={session.elapsedMs}
            tierChange={session.tierChange}
            adaptiveEvents={session.adaptiveEvents}
            afterCorrection={session.afterCorrection}
            subject={session.subject}
            stop={session.stop}
            stars={session.stars}
            bestCombo={session.bestCombo}
            award={session.award}
            completedChallenges={session.completedChallenges}
            coinTotal={coins}
            onFixMistakes={() => setPhase('correction')}
            onHome={goHome}
          />
        )}
        {phase === 'correction' && session && (
          <CorrectionScreen
            subject={session.subject}
            grade={session.grade}
            scratchPaper={settings.scratchPaper}
            penOnly={settings.penOnly}
            questions={session.records.filter((r) => !r.correct).map((r) => r.question)}
            passage={session.passage ?? undefined}
            onDone={onCorrectionDone}
          />
        )}
        <StatusBar style="dark" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  home: { flex: 1 },
});
