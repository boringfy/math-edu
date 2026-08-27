import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DailyChallenges from '../components/DailyChallenges';
import MapTrail from '../components/MapTrail';
import { Library } from '../content';
import { formatElapsed } from '../lib/format';
import { starsEarned } from '../lib/mapProgress';
import { FAMILY_LABEL, lessonLength, wordCount } from '../lib/maps';
import { colors } from '../theme';
import {
  DailyState,
  Grade,
  Lesson,
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

const TOPIC_LABEL: Record<string, string> = {
  addSub: '+ −',
  mulDiv: '× ÷',
  fractions: 'fractions',
  decimals: 'decimals',
  order: 'order of ops',
  word: 'stories',
  geometry: 'geometry',
  measurement: 'measuring',
  money: 'money',
  speed: 'speed',
  time: 'clocks',
  place: 'place value',
};

const TIER_NAME = ['Easy', 'Normal', 'Hard'];

/** The words each subject uses for its own map and its own past results. */
const SUBJECT_UI: Record<
  Subject,
  { title: string; tail: string; history: string; empty: string }
> = {
  math: {
    title: '🧮 Boring Quest',
    tail: 'lessons get harder as you go',
    history: 'Past quizzes',
    empty: 'No quizzes yet — your results will show up here.',
  },
  reading: {
    title: '📖 Boring Quest',
    tail: 'stories get longer as you go',
    history: 'Past reads',
    empty: 'No stories read yet — your results will show up here.',
  },
  logic: {
    title: '🧩 Boring Quest',
    tail: 'puzzles get trickier as you go',
    history: 'Past puzzles',
    empty: 'No puzzles solved yet — your results will show up here.',
  },
};

interface Props {
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
  onStartLesson: (lesson: Lesson) => void;
  onStartStory: (story: Story) => void;
  onStartPuzzles: (set: PuzzleSet) => void;
  onStartPractice: (grade: Grade, count: number) => void;
}

/**
 * The home of whichever subject is showing. All three are laid out the same
 * way — purse, day's challenges, grade, map, past results — because a child
 * moving between the tabs shouldn't have to learn a second screen. Only the
 * map's contents and the maths-only free practice differ.
 */
export default function HomeScreen({
  subject,
  library,
  history,
  grade,
  tiers,
  coins,
  onOpenSettings,
  daily,
  progress,
  onStartLesson,
  onStartStory,
  onStartPuzzles,
  onStartPractice,
}: Props) {
  const [count, setCount] = useState(10);
  const [showPractice, setShowPractice] = useState(false);
  const scroller = useRef<ScrollView>(null);
  // The map that has been jumped to already. Coming back from a lesson
  // remounts this screen, so a fresh mount always jumps; changing tab or
  // grade swaps the map under it, which counts as a new one to aim at.
  const aimedAt = useRef('');

  const ui = SUBJECT_UI[subject];
  const lessons = library.lessons(grade);
  const stories = library.stories(grade);
  const puzzleSets = library.puzzleSets(grade);
  const stops = subject === 'reading' ? stories : subject === 'logic' ? puzzleSets : lessons;
  const stars = starsEarned(stops, progress);
  const mine = history.filter((r) => r.subject === subject);
  const [showHistory, setShowHistory] = useState(false);

  const mapKey = `${subject}-${grade}`;
  /** Opens each map where the child left off rather than back at stop one. */
  const jumpToCurrent = (y: number) => {
    if (aimedAt.current === mapKey) return;
    aimedAt.current = mapKey;
    scroller.current?.scrollTo({ y: Math.max(0, y - HEADROOM), animated: false });
  };

  return (
    <ScrollView
      ref={scroller}
      style={styles.container}
      contentContainerStyle={styles.content}
      // The header carries the grade, and the grade is the thing that is
      // easiest to lose track of once the map has been scrolled away from.
      stickyHeaderIndices={[0]}
    >
      <View style={styles.titleRow}>
        {/* One app name on every tab; the icon and the tab bar say which part. */}
        <Text style={styles.title} numberOfLines={1}>
          {ui.title}
        </Text>
        <View style={styles.titleRight}>
          {/* Which grade this subject is on. Tapping it goes where it is set. */}
          <Pressable
            style={styles.gradePill}
            accessibilityRole="button"
            accessibilityLabel={`Grade ${grade}. Change it in settings`}
            onPress={onOpenSettings}
          >
            <Text style={styles.gradeText}>Grade {grade}</Text>
          </Pressable>
          <View style={styles.coinPill}>
            <Text style={styles.coinText}>🪙 {coins}</Text>
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

      <DailyChallenges daily={daily} />

      <Text style={styles.mapSummary}>
        ★ {stars} of {stops.length * 3} · {ui.tail}
      </Text>

      {subject === 'reading' && (
        <MapTrail
          stops={stories}
          progress={progress}
          meta={(story: Story) => [
            `${wordCount(story.text)} words`,
            `${story.questions.length} questions · ${TIER_NAME[story.tier - 1]}`,
          ]}
          onStart={onStartStory}
          onCurrentOffset={jumpToCurrent}
        />
      )}
      {subject === 'logic' && (
        <MapTrail
          stops={puzzleSets}
          progress={progress}
          meta={(set: PuzzleSet) => [
            set.focus.map((f: string) => FAMILY_LABEL[f]).join(' · '),
            `${set.questionCount} puzzles · ${TIER_NAME[set.tier - 1]}`,
          ]}
          onStart={onStartPuzzles}
          onCurrentOffset={jumpToCurrent}
        />
      )}
      {subject === 'math' && (
        <MapTrail
          stops={lessons}
          progress={progress}
          meta={(lesson: Lesson) => [
            lesson.focus.map((f: string) => TOPIC_LABEL[f] ?? f).join(' · '),
            `${lessonLength(lesson)} questions · ${TIER_NAME[lesson.tier - 1]}`,
          ]}
          onStart={onStartLesson}
          onCurrentOffset={jumpToCurrent}
        />
      )}

      {subject === 'math' && (
        <>
          <Pressable style={styles.practiceToggle} onPress={() => setShowPractice(!showPractice)}>
            <Text style={styles.practiceToggleText}>
              {showPractice ? '▾' : '▸'} Free practice (mixed questions)
            </Text>
          </Pressable>
          {showPractice && (
            <View style={styles.practiceCard}>
              <Text style={styles.tierNote}>
                A mixed quiz outside the map. Difficulty for grade {grade} is{' '}
                {TIER_LABELS[tiers[grade]]} and adjusts with your results — about{' '}
                {Math.round((library.rules?.entryShare[tiers[grade]] ?? 0.5) * 100)}% of questions are typed on the number
                pad.
              </Text>
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
              <Pressable style={styles.startButton} onPress={() => onStartPractice(grade, count)}>
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
              {(r.fixedCount > 0 || r.skippedCount > 0) && (
                <Text style={styles.historyMeta}>
                  {r.fixedCount} fixed{r.skippedCount > 0 ? ` · ${r.skippedCount} skipped` : ''}
                </Text>
              )}
            </View>
              <View style={styles.historyRight}>
                <Text style={styles.historyDate}>{new Date(r.date).toLocaleDateString()}</Text>
                {r.coins !== undefined && <Text style={styles.historyCoins}>🪙 {r.coins}</Text>}
              </View>
            </View>
          ))
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 24, paddingBottom: 40 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // A sticky header is drawn over whatever scrolls past it, so it has to
    // paint its own background rather than let the map show through.
    backgroundColor: colors.background,
    paddingBottom: 10,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settings: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: { fontSize: 16 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text },
  // Reads as a label rather than a button, because the grade is a fact about
  // where the child is, not a control they should be fiddling with.
  gradePill: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  gradeText: { fontSize: 17, fontWeight: '800', color: colors.primary },
  coinPill: {
    backgroundColor: '#fff5d6',
    borderWidth: 2,
    borderColor: '#f5b700',
    borderRadius: 16,
    paddingHorizontal: 12,
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
  mapSummary: { fontSize: 13, color: colors.textMuted, marginTop: 10, textAlign: 'center' },
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
  historyCoins: { fontSize: 13, fontWeight: '700', color: '#a86b00' },
});
