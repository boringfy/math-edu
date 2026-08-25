import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
// The app draws edge-to-edge on Android, so real insets are needed to keep
// the number pad clear of the navigation bar.
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import SubjectTabs from './src/components/SubjectTabs';
import { passageOf, storyQuestions, useContent } from './src/content';
import { CursorState } from './src/content/cursor';
import { adjustTier, promoteToEntry, shuffle } from './src/lib/grading';
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
  loadCoins,
  loadCursors,
  loadDaily,
  loadHistory,
  loadProgress,
  loadSettings,
  loadTier,
  saveCoins,
  saveCursors,
  saveDaily,
  saveProgress,
  saveResult,
  saveSettings,
  saveTier,
} from './src/lib/storage';
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
  afterCorrection: boolean;
}

/** What opening a session needs; everything else starts empty. */
type SessionStart = Pick<Session, 'subject' | 'grade' | 'tier' | 'stop' | 'passage' | 'questions'>;

export default function App() {
  const [phase, setPhase] = useState<Phase>('home');
  const [subject, setSubject] = useState<Subject>('math');
  // One grade for the whole app: a child is the same age in every subject.
  const [grade, setGrade] = useState<Grade>(1);
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

  useEffect(() => {
    (async () => {
      setHistory(await loadHistory());
      setSettings(await loadSettings());
      const loaded = await Promise.all(GRADES.map((g) => loadTier(g)));
      setTiers({ 1: loaded[0], 2: loaded[1], 3: loaded[2], 4: loaded[3], 5: loaded[4] });
      setCoins(await loadCoins());
      setCursors(library.pruneCursors(await loadCursors()));
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
    })();
  }, []);

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
      afterCorrection: false,
      ...start,
    });
    setPhase('quiz');
  };

  /**
   * Takes a draw from the library, advances the pool cursors and finishes
   * the questions off for play: a share of them promoted to typed entry, and
   * the order shuffled.
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
    promoteToEntry(questions, tier, library.rules?.entryShare ?? { 1: 0.25, 2: 0.5, 3: 0.75 });
    return shuffle(questions);
  };

  const startLesson = (lesson: Lesson) => {
    newSession({
      subject: 'math',
      grade: lesson.grade,
      tier: lesson.tier,
      stop: lesson,
      passage: null,
      questions: drawQuestions(
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
    newSession({
      subject: 'logic',
      grade: set.grade,
      tier: set.tier,
      stop: set,
      passage: null,
      questions: drawQuestions(
        (state) => library.puzzleQuestions(set, state, Math.random),
        set.tier,
      ),
    });
  };

  const startPractice = (practiceGrade: Grade, count: number) => {
    const tier = tiers[practiceGrade];
    newSession({
      subject: 'math',
      grade: practiceGrade,
      tier,
      stop: null,
      passage: null,
      questions: drawQuestions(
        (state) => library.practiceQuestions(practiceGrade, tier, count, state, Math.random),
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
    if (newTier !== s.tier) {
      await saveTier(s.grade, newTier);
      setTiers((prev) => ({ ...prev, [s.grade]: newTier }));
    }
  };

  /** Records stars against the map the session came from. */
  const persistStars = async (s: Session, stop: MapStop, stars: Stars, percent: number) => {
    const next = await saveProgress(s.subject, stop.id, {
      stars,
      bestPercent: percent,
      clearedAt: new Date().toISOString(),
    });
    setProgress((prev) => ({ ...prev, [s.subject]: next }));
  };

  /** Banks coins, rolls the day's challenges on, and pays their rewards. */
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

    // Map stops run at a fixed difficulty; only free practice adapts.
    const newTier = session.stop ? session.tier : adjustTier(session.tier, correctCount / total);
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
              onGradeChange={setGrade}
              tiers={tiers}
              coins={coins}
              daily={daily}
              progress={progress[subject]}
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
            settings={settings}
            onChange={(next) => {
              setSettings(next);
              void saveSettings(next);
            }}
            onBack={() => setPhase('home')}
          />
        )}
        {phase === 'quiz' && session && (
          <QuizScreen
            subject={session.subject}
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
