import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatElapsed } from '../lib/format';
import { ENTRY_SHARE } from '../lib/questions';
import { colors } from '../theme';
import { Grade, QuizResult, Tier, TIER_LABELS } from '../types';

const GRADES: Grade[] = [1, 2, 3, 4, 5];
const COUNTS = [5, 10, 15];

interface Props {
  history: QuizResult[];
  tiers: Record<Grade, Tier>;
  onStart: (grade: Grade, count: number) => void;
}

export default function HomeScreen({ history, tiers, onStart }: Props) {
  const [grade, setGrade] = useState<Grade>(1);
  const [count, setCount] = useState(10);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>🧮 Math Quest</Text>
      <Text style={styles.subtitle}>Pick your grade and start a quiz!</Text>

      <Text style={styles.sectionLabel}>Grade</Text>
      <View style={styles.row}>
        {GRADES.map((g) => (
          <Pressable
            key={g}
            onPress={() => setGrade(g)}
            style={[styles.pill, grade === g && styles.pillActive]}
          >
            <Text style={[styles.pillText, grade === g && styles.pillTextActive]}>{g}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.tierNote}>
        Current difficulty for grade {grade}: {TIER_LABELS[tiers[grade]]} (adjusts with your
        results)
      </Text>
      <Text style={styles.tierNote}>
        Expect story problems, and about {Math.round(ENTRY_SHARE[tiers[grade]] * 100)}% of
        questions typed on the number pad instead of multiple choice.
      </Text>

      <Text style={styles.sectionLabel}>Questions</Text>
      <View style={styles.row}>
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

      <Pressable style={styles.startButton} onPress={() => onStart(grade, count)}>
        <Text style={styles.startButtonText}>Start Quiz</Text>
      </Pressable>

      <Text style={styles.sectionLabel}>Past quizzes</Text>
      {history.length === 0 ? (
        <Text style={styles.emptyHistory}>No quizzes yet — your results will show up here.</Text>
      ) : (
        history.map((r) => (
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
            <Text style={styles.historyDate}>{new Date(r.date).toLocaleDateString()}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 24, paddingBottom: 40 },
  title: { fontSize: 34, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: 18,
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
  tierNote: { fontSize: 13, color: colors.textMuted, marginTop: 8 },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  startButtonText: { color: '#fff', fontSize: 20, fontWeight: '800' },
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
  historyScore: { fontSize: 18, fontWeight: '800', color: colors.text },
  historyMeta: { fontSize: 13, color: colors.textMuted },
  historyDate: { fontSize: 13, color: colors.textMuted },
});
