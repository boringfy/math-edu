import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DailyChallenges from '../components/DailyChallenges';
import CoinIcon from '../components/CoinIcon';
import MapTrail from '../components/MapTrail';
import ProfilePicker from '../components/ProfilePicker';
import { Library } from '../content';
import { AdaptiveStore, adaptiveKey } from '../lib/adaptive';
import { formatElapsed } from '../lib/format';
import { highestOpenLevel, isEndless, stopsUpTo, windowOf } from '../lib/endless';
import { ProfileStore, activeProfile } from '../lib/profiles';
import { dayKey } from '../lib/progress';
import { chargesForLessons } from '../lib/unlocks';
import { UnlockMap } from '../lib/unlocks';
import { starsEarned } from '../lib/mapProgress';
import { FAMILY_LABEL, TOPIC_LABEL, lessonLength, wordCount } from '../lib/maps';
import { colors } from '../theme';
import {
  DailyState,
  Grade,
  Lesson,
  MapStop,
  ProgressMap,
  PuzzleSet,
  QuizResult,
  Story,
  Subject,
  Tier,
  TIER_LABELS,
} from '../types';

const COUNTS = [5, 10, 15];

/**
 * How much of the trail to leave above the current stop when jumping to it,
 * so the stops already cleared stay in sight and the jump reads as a place on
 * a map rather than a new screen.
 */
const HEADROOM = 130;

const TIER_NAME = ['Easy', 'Normal', 'Hard'];

/** The words each subject uses for its own map and its own past results. */
const SUBJECT_UI: Record<
  Subject,
  { icon: string; tail: string; history: string; empty: string }
> = {
  math: {
    icon: '🧮',
    tail: 'lessons get harder as you go',
    history: 'Past quizzes',
    empty: 'No quizzes yet — your results will show up here.',
  },
  reading: {
    icon: '📖',
    tail: 'stories get longer as you go',
    history: 'Past reads',
    empty: 'No stories read yet — your results will show up here.',
  },
  logic: {
    icon: '🧩',
    tail: 'puzzles get trickier as you go',
    history: 'Past puzzles',
    empty: 'No puzzles solved yet — your results will show up here.',
  },
};

interface Props {
  planRevision?: number;
  subject: Subject;
  /** The content for this launch; maps are drawn from its catalogs. */
  library: Library;
  history: QuizResult[];
  grade: Grade;
  tiers: Record<Grade, Tier>;
  coins: number;
  onOpenSettings: () => void;
  daily: DailyState;
  /** Map progress for this subject only. */
  progress: ProgressMap;
  /** How practice has adapted so far, for the types-in-play chips. */
  adaptive: AdaptiveStore;
  /** Who is playing, and the chooser that swaps them. */
  profiles: ProfileStore;
  onSwitchProfile: (id: string) => void;
  onRenameProfile: (id: string, name: string) => void;
  onAddProfile: () => void;
  /** What a lesson costs, and what has been bought so far. */
  unlocks: UnlockMap;
  unlockCost: number;
  /** Which maps charge for the next lesson. */
  paidSubjects: Subject[];
  onStartLesson: (lesson: Lesson) => void;
  onStartStory: (story: Story) => void;
  onStartPuzzles: (set: PuzzleSet) => void;
  onStartPractice: (subject: 'math' | 'logic', grade: Grade, count: number) => void;
}

/**
 * The home of whichever subject is showing. All three are laid out the same
 * way — purse, day's challenges, grade, map, past results — because a child
 * moving between the tabs shouldn't have to learn a second screen. Only the
 * map's contents and the maths-only free practice differ.
 */
export default function HomeScreen({
  planRevision = 0,
  subject,
  library,
  history,
  grade,
  tiers,
  coins,
  onOpenSettings,
  daily,
  progress,
  adaptive,
  profiles,
  onSwitchProfile,
  onRenameProfile,
  onAddProfile,
  unlocks,
  unlockCost,
  paidSubjects,
  onStartLesson,
  onStartStory,
  onStartPuzzles,
  onStartPractice,
}: Props) {
  const [count, setCount] = useState(10);
  const [showPractice, setShowPractice] = useState(false);
  const [picking, setPicking] = useState(false);
  const scroller = useRef<ScrollView>(null);
  // The map that has been jumped to already. Coming back from a lesson
  // remounts this screen, so a fresh mount always jumps; changing tab or
  // grade swaps the map under it, which counts as a new one to aim at.
  const aimedAt = useRef('');

  const ui = SUBJECT_UI[subject];
  const playingAs = activeProfile(profiles);
  const lessons = library.lessons(grade);
  const stories = library.stories(grade);
  const puzzleSets = library.puzzleSets(grade);
  const authored = subject === 'reading' ? stories : subject === 'logic' ? puzzleSets : lessons;
  const mine = history.filter((r) => r.subject === subject);
  // History spans all three tabs. Count from it so an app update can recover
  // everything already finished today instead of starting the badge at zero.
  const totalToday = history.filter((result) => dayKey(new Date(result.date)) === daily.date).length;
  const stopNoun = subject === 'reading' ? 'Story' : subject === 'logic' ? 'Puzzle' : 'Lesson';
  const [showHistory, setShowHistory] = useState(false);

  /**
   * The map is shown a level at a time — ten lessons — rather than as one
   * column of every lesson there is. Sixty was already a lot of scrolling;
   * past the authored map there is no end to scroll to at all.
   */
  const mapKey = `${subject}-${grade}`;
  const openLevel = highestOpenLevel(subject, grade, authored, progress);

  /**
   * Which level is on screen: wherever the child is up to, unless they have
   * paged back to an earlier one on this map.
   *
   * Deliberately not `useState(openLevel)`. Progress is loaded from storage
   * after the first render, so at that moment every map looks untouched and
   * `openLevel` is 1 — seeding state from it would open a child on level 1
   * and stay there. Holding only the level they *chose* means the default
   * follows the progress in whenever it arrives.
   */
  const [chosen, setChosen] = useState<{ mapKey: string; level: number } | null>(null);
  const level =
    chosen && chosen.mapKey === mapKey ? Math.min(chosen.level, openLevel) : openLevel;
  const showLevel = (next: number) => setChosen({ mapKey, level: next });

  /**
   * Every stop up to the end of the level being looked at. The composed ones
   * are rebuilt rather than stored, which is cheap and keeps the map and the
   * quiz agreeing about what lesson 73 is.
   */
  const allStops = useMemo(
    () => stopsUpTo(subject, grade, level, authored, isEndless(subject) ? adaptive[adaptiveKey(subject, grade)] : undefined),
    [subject, grade, level, authored, adaptive, planRevision],
  );
  const stops = windowOf<MapStop>(allStops, level);
  const stars = starsEarned(stops, progress);
  /** Opens each map where the child left off rather than back at stop one. */
  const jumpToCurrent = (y: number) => {
    if (aimedAt.current === mapKey) return;
    aimedAt.current = mapKey;
    scroller.current?.scrollTo({ y: Math.max(0, y - HEADROOM), animated: false });
  };

  return (
    <View style={styles.container}>
      <ProfilePicker
        visible={picking}
        profiles={profiles}
        onPick={(id) => {
          setPicking(false);
          onSwitchProfile(id);
        }}
        onRename={onRenameProfile}
        onAdd={() => {
          setPicking(false);
          onAddProfile();
        }}
        onClose={() => setPicking(false)}
      />

      {/*
        Outside the ScrollView rather than a sticky header inside it. A sticky
        header is held in place with a transform, and on Android a view
        translated out of its parent's bounds stops receiving touches — the
        settings gear was there but dead. Making it a sibling keeps it
        genuinely fixed, and genuinely tappable.
      */}
      <View style={styles.titleRow}>
        {/* The whole player pill opens the chooser; editing lives inside it. */}
        {profiles.profiles.length > 0 && (
          <Pressable
            style={styles.whoPill}
            accessibilityRole="button"
            accessibilityLabel={`Switch player. Playing as ${playingAs?.name ?? 'nobody'}`}
            onPress={() => setPicking(true)}
          >
            <Text style={styles.whoAvatar}>{playingAs?.avatar ?? '🙂'}</Text>
            <Text style={styles.whoName} numberOfLines={1}>{playingAs?.name ?? 'Player'}</Text>
          </Pressable>
        )}
        <View style={styles.statusRow}>
          {/* Which grade this subject is on. Tapping it goes where it is set. */}
          <Pressable
            style={styles.gradePill}
            accessibilityRole="button"
            accessibilityLabel={`Grade ${grade}. Change it in settings`}
            onPress={onOpenSettings}
          >
            <Text style={styles.gradeText}>Grade {grade}</Text>
          </Pressable>
          <View style={styles.coinPill} accessibilityLabel={`${coins} coins`}>
            <CoinIcon size={20} />
            <Text style={styles.coinText}>{coins}</Text>
          </View>
          {/* Quiet and out of the way: this page is for a grown-up. */}
          <Pressable
            style={styles.settings}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={onOpenSettings}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </Pressable>
        </View>
      </View>

      {/*
        The map is one level at a time. The arrows walk back over levels
        already finished and forward as far as the child has actually got —
        never further, so the next level stays something to reach rather than
        something to skip to.
      */}
      <View style={styles.levelBar}>
        <Pressable
          style={[styles.levelStep, level <= 1 && styles.levelStepOff]}
          disabled={level <= 1}
          accessibilityRole="button"
          accessibilityLabel="Previous level"
          onPress={() => showLevel(level - 1)}
        >
          <Text style={[styles.levelStepText, level <= 1 && styles.levelStepTextOff]}>‹</Text>
        </Pressable>

        <View style={styles.levelMiddle}>
          <View style={styles.levelTitleRow}>
            <Text style={styles.levelSubjectIcon} testID="subject-level-icon">{ui.icon}</Text>
            <Text style={styles.levelTitle}>Level {level}</Text>
          </View>
          <Text style={styles.levelMeta}>
            ★ {stars} of {stops.length * 3} · {ui.tail}
          </Text>
        </View>

        <Pressable
          style={[styles.levelStep, level >= openLevel && styles.levelStepOff]}
          disabled={level >= openLevel}
          accessibilityRole="button"
          accessibilityLabel="Next level"
          onPress={() => showLevel(level + 1)}
        >
          <Text style={[styles.levelStepText, level >= openLevel && styles.levelStepTextOff]}>
            ›
          </Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scroller}
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <DailyChallenges daily={daily} totalToday={totalToday} />

      {subject === 'reading' && (
        <MapTrail
          stops={windowOf(allStops as Story[], level)}
          allStops={allStops as Story[]}
          progress={progress}
          meta={(story: Story) => [
            `${wordCount(story.text)} words`,
            `${story.questions.length} questions · ${TIER_NAME[story.tier - 1]}`,
          ]}
          onStart={onStartStory}
          unlocks={unlocks}
          subject={subject}
          coins={coins}
          unlockCost={unlockCost}
          charges={chargesForLessons(subject, paidSubjects)}
          onCurrentOffset={jumpToCurrent}
        />
      )}
      {subject === 'logic' && (
        <MapTrail
          stops={windowOf(allStops as PuzzleSet[], level)}
          allStops={allStops as PuzzleSet[]}
          progress={progress}
          meta={(set: PuzzleSet) => [
            set.focus.map((f: string) => FAMILY_LABEL[f]).join(' · '),
            `${set.questionCount} puzzles · ${TIER_NAME[set.tier - 1]}`,
          ]}
          onStart={onStartPuzzles}
          unlocks={unlocks}
          subject={subject}
          coins={coins}
          unlockCost={unlockCost}
          charges={chargesForLessons(subject, paidSubjects)}
          onCurrentOffset={jumpToCurrent}
        />
      )}
      {subject === 'math' && (
        <MapTrail
          stops={windowOf(allStops as Lesson[], level)}
          allStops={allStops as Lesson[]}
          progress={progress}
          meta={(lesson: Lesson) =>
            lesson.speed
              ? // A Speed Match says what it is and what it costs you: the
                // number of problems and the seconds each one gets. A tier
                // would be the wrong thing to promise — the sums are easy and
                // the clock is the difficulty.
                ['quick maths · no paper', `${lessonLength(lesson)} in ${lesson.speed.seconds}s`]
              : [
                  lesson.focus.map((f: string) => TOPIC_LABEL[f] ?? f).join(' · '),
                  `${lessonLength(lesson)} questions · ${TIER_NAME[lesson.tier - 1]}`,
                ]
          }
          onStart={onStartLesson}
          unlocks={unlocks}
          subject={subject}
          coins={coins}
          unlockCost={unlockCost}
          charges={chargesForLessons(subject, paidSubjects)}
          onCurrentOffset={jumpToCurrent}
        />
      )}

      {subject !== 'reading' && (
        <>
          <Pressable style={styles.practiceToggle} onPress={() => setShowPractice(!showPractice)}>
            <Text style={styles.practiceToggleText}>
              {showPractice ? '▾' : '▸'} Free practice (
              {subject === 'math' ? 'mixed questions' : 'mixed puzzles'})
            </Text>
          </Pressable>
          {showPractice && (
            <View style={styles.practiceCard}>
              <Text style={styles.tierNote}>
                {subject === 'math'
                  ? `A mixed quiz outside the map. Difficulty for grade ${grade} is ` +
                    `${TIER_LABELS[tiers[grade]]} and adjusts with your results — get everything ` +
                    'right and a new kind of question joins the mix.'
                  : 'A mixed set outside the map. It starts with a few puzzle types and ' +
                    'unlocks more as you get them right.'}
              </Text>
              {(() => {
                const unlocked = adaptive[adaptiveKey(subject, grade)]?.unlocked ?? [];
                const labels = subject === 'math' ? TOPIC_LABEL : FAMILY_LABEL;
                if (unlocked.length === 0) return null;
                return (
                  <View style={styles.chipRow}>
                    <Text style={styles.chipLead}>In play:</Text>
                    {unlocked.map((topic) => (
                      <View key={topic} style={styles.chip}>
                        <Text style={styles.chipText}>{labels[topic] ?? topic}</Text>
                      </View>
                    ))}
                  </View>
                );
              })()}
              <View style={[styles.row, styles.practiceCounts]}>
                {COUNTS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCount(c)}
                    style={[styles.pill, count === c && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, count === c && styles.pillTextActive]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                style={styles.startButton}
                onPress={() => onStartPractice(subject, grade, count)}
              >
                <Text style={styles.startButtonText}>Start practice</Text>
              </Pressable>
            </View>
          )}
        </>
      )}

      {/* Folded away by default: the map is what a child comes here for, and
          a long history pushes it off the screen. */}
      <Pressable
        style={styles.historyHeader}
        accessibilityRole="button"
        accessibilityLabel={ui.history}
        onPress={() => setShowHistory(!showHistory)}
      >
        <Text style={styles.sectionLabel}>
          {ui.history}
          {mine.length > 0 ? ` · ${mine.length}` : ''}
        </Text>
        <Text style={styles.historyToggle}>{showHistory ? 'Hide ▴' : 'Show ▾'}</Text>
      </Pressable>

      {showHistory &&
        (mine.length === 0 ? (
          <Text style={styles.emptyHistory}>{ui.empty}</Text>
        ) : (
          mine.map((r) => (
          <View key={r.id} style={styles.historyItem}>
            <View style={styles.historyLeft}>
              <Text style={styles.historyScore}>
                {r.correctCount}/{r.total}
              </Text>
              <Text style={styles.historyMeta}>
                Grade {r.grade} · {TIER_LABELS[r.tier]} · {formatElapsed(r.elapsedMs)}
              </Text>
              {r.level !== undefined && r.lesson !== undefined && (
                <Text style={styles.historyMeta}>
                  Level {r.level} · {stopNoun} {r.lesson}{r.stopTitle ? ` · ${r.stopTitle}` : ''}
                </Text>
              )}
              {(r.fixedCount > 0 || r.skippedCount > 0) && (
                <Text style={styles.historyMeta}>
                  {r.fixedCount} fixed{r.skippedCount > 0 ? ` · ${r.skippedCount} skipped` : ''}
                </Text>
              )}
            </View>
              <View style={styles.historyRight}>
                <Text style={styles.historyDate}>{new Date(r.date).toLocaleDateString()}</Text>
                {r.coins !== undefined && (
                  <View style={styles.historyCoinRow}>
                    <CoinIcon size={14} />
                    <Text style={styles.historyCoins}>{r.coins}</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: 20, paddingTop: 16, paddingBottom: 40 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settings: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: { fontSize: 16 },
  // Reads as a label rather than a button, because the grade is a fact about
  // where the child is, not a control they should be fiddling with.
  whoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 150,
    flexShrink: 1,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: colors.card,
  },
  whoAvatar: { fontSize: 18 },
  whoName: { fontSize: 14, fontWeight: '700', color: colors.text, flexShrink: 1 },
  gradePill: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  gradeText: { fontSize: 15, fontWeight: '800', color: colors.primary },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff5d6',
    borderWidth: 2,
    borderColor: '#f5b700',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  coinText: { fontSize: 17, fontWeight: '800', color: '#a86b00' },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  historyToggle: { fontSize: 13, fontWeight: '700', color: colors.primary, marginTop: 18 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: 22,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 8 },
  pill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  pillActive: { borderColor: colors.primary, backgroundColor: '#edf0fe' },
  pillText: { fontSize: 18, fontWeight: '700', color: colors.textMuted },
  pillTextActive: { color: colors.primaryDark },
  // Fixed above the scroll, so the level a lesson belongs to never scrolls
  // away from it. Padded to line up with the title row it sits under.
  levelBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  // Big enough for a child's thumb, which is bigger than the chevron looks.
  levelStep: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelStepOff: { opacity: 0.3 },
  levelStepText: { fontSize: 24, lineHeight: 28, fontWeight: '800', color: colors.primary },
  levelStepTextOff: { color: colors.textMuted },
  levelMiddle: { flex: 1, alignItems: 'center' },
  levelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  levelSubjectIcon: { fontSize: 19 },
  levelTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  levelMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  practiceToggle: { marginTop: 26, alignItems: 'center' },
  practiceToggleText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  practiceCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 10,
  },
  practiceCounts: { marginTop: 12 },
  tierNote: { fontSize: 13, color: colors.textMuted },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  chipLead: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  chip: {
    backgroundColor: '#edf0fe',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  emptyHistory: { color: colors.textMuted, fontSize: 14 },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  historyLeft: { gap: 2 },
  historyRight: { alignItems: 'flex-end', gap: 2 },
  historyScore: { fontSize: 18, fontWeight: '800', color: colors.text },
  historyMeta: { fontSize: 13, color: colors.textMuted },
  historyDate: { fontSize: 13, color: colors.textMuted },
  historyCoinRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  historyCoins: { fontSize: 13, fontWeight: '700', color: '#a86b00' },
});
