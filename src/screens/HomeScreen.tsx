import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DailyChallenges from '../components/DailyChallenges';
import MapTrail from '../components/MapTrail';
import { formatElapsed } from '../lib/format';
import { LESSONS, LESSONS_PER_GRADE, lessonLength } from '../lib/lessons';
import { starsEarned } from '../lib/mapProgress';
import { FAMILY_LABEL, PUZZLE_SETS, PuzzleSet, SETS_PER_GRADE } from '../lib/puzzles';
import { ENTRY_SHARE } from '../lib/questions';
import { STORIES, STORIES_PER_GRADE, wordCount } from '../lib/stories';
import { colors } from '../theme';
import {
  DailyState,
  Grade,
  Lesson,
  ProgressMap,
  QuizResult,
  Story,
  Subject,
  Tier,
  TIER_LABELS,
} from '../types';

const GRADES: Grade[] = [1, 2, 3, 4, 5];
const COUNTS = [5, 10, 15];

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
};

const TIER_NAME = ['Easy', 'Normal', 'Hard'];

/** The words each subject uses for its own map and its own past results. */
const SUBJECT_UI: Record<
  Subject,
  { title: string; perGrade: number; tail: string; history: string; empty: string }
> = {
  math: {
    title: '🧮 Boring Quest',
    perGrade: LESSONS_PER_GRADE,
    tail: 'lessons get harder as you go',
    history: 'Past quizzes',
    empty: 'No quizzes yet — your results will show up here.',
  },
  reading: {
    title: '📖 Boring Quest',
    perGrade: STORIES_PER_GRADE,
    tail: 'stories get longer as you go',
    history: 'Past reads',
    empty: 'No stories read yet — your results will show up here.',
  },
  logic: {
    title: '🧩 Boring Quest',
    perGrade: SETS_PER_GRADE,
    tail: 'puzzles get trickier as you go',
    history: 'Past puzzles',
    empty: 'No puzzles solved yet — your results will show up here.',
  },
};

interface Props {
  subject: Subject;
  history: QuizResult[];
  grade: Grade;
  onGradeChange: (grade: Grade) => void;
  tiers: Record<Grade, Tier>;
  coins: number;
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
  history,
  grade,
  onGradeChange,
  tiers,
  coins,
  daily,
  progress,
  onStartLesson,
  onStartStory,
  onStartPuzzles,
  onStartPractice,
}: Props) {
  const [count, setCount] = useState(10);
  const [showPractice, setShowPractice] = useState(false);

  const ui = SUBJECT_UI[subject];
  const stops =
    subject === 'reading'
      ? STORIES[grade]
      : subject === 'logic'
        ? PUZZLE_SETS[grade]
        : LESSONS[grade];
  const stars = starsEarned(stops, progress);
  const mine = history.filter((r) => r.subject === subject);
  const [showHistory, setShowHistory] = useState(false);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        {/* One app name on every tab; the icon and the tab bar say which part. */}
        <Text style={styles.title}>{ui.title}</Text>
        <View style={styles.coinPill}>
          <Text style={styles.coinText}>🪙 {coins}</Text>
        </View>
      </View>

      <DailyChallenges daily={daily} />

      <Text style={styles.sectionLabel}>Grade</Text>
      <View style={styles.row}>
        {GRADES.map((g) => (
          <Pressable
            key={g}
            onPress={() => onGradeChange(g)}
            style={[styles.pill, grade === g && styles.pillActive]}
          >
            <Text style={[styles.pillText, grade === g && styles.pillTextActive]}>{g}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.mapSummary}>
        ★ {stars} of {ui.perGrade * 3} · {ui.tail}
      </Text>

      {subject === 'reading' && (
        <MapTrail
          stops={STORIES[grade]}
          progress={progress}
          meta={(story) => [
            `${wordCount(story.text)} words`,
            `${story.questions.length} questions · ${TIER_NAME[story.tier - 1]}`,
          ]}
          onStart={onStartStory}
        />
      )}
      {subject === 'logic' && (
        <MapTrail
          stops={PUZZLE_SETS[grade]}
          progress={progress}
          meta={(set) => [
            set.focus.map((f) => FAMILY_LABEL[f]).join(' · '),
            `${set.questionCount} puzzles · ${TIER_NAME[set.tier - 1]}`,
          ]}
          onStart={onStartPuzzles}
        />
      )}
      {subject === 'math' && (
        <MapTrail
          stops={LESSONS[grade]}
          progress={progress}
          meta={(lesson) => [
            lesson.focus.map((f) => TOPIC_LABEL[f] ?? f).join(' · '),
            `${lessonLength(lesson)} questions · ${TIER_NAME[lesson.tier - 1]}`,
          ]}
          onStart={onStartLesson}
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
                {Math.round(ENTRY_SHARE[tiers[grade]] * 100)}% of questions are typed on the number
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
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 30, fontWeight: '800', color: colors.text },
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
