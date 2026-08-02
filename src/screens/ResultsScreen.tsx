import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatElapsed } from '../lib/format';
import { colors } from '../theme';
import { AnswerRecord } from '../types';

interface Props {
  records: AnswerRecord[];
  elapsedMs: number;
  /** 'down' when too many mistakes lowered the difficulty for next time. */
  tierChange: 'up' | 'down' | null;
  afterCorrection: boolean;
  onFixMistakes: () => void;
  onHome: () => void;
}

export default function ResultsScreen({
  records,
  elapsedMs,
  tierChange,
  afterCorrection,
  onFixMistakes,
  onHome,
}: Props) {
  const total = records.length;
  const correctCount = records.filter((r) => r.correct).length;
  const mistakes = records.filter((r) => !r.correct);
  const fixedCount = mistakes.filter((r) => r.fixed).length;
  const skipped = mistakes.filter((r) => r.skipped);
  const percent = Math.round((correctCount / total) * 100);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{afterCorrection ? 'Practice complete!' : 'Quiz complete!'}</Text>

      <View style={styles.scoreCard}>
        <Text style={styles.score}>
          {correctCount}/{total}
        </Text>
        <Text style={styles.percent}>{percent}% correct</Text>
        <Text style={styles.time}>⏱ Time: {formatElapsed(elapsedMs)}</Text>
        {afterCorrection && mistakes.length > 0 && (
          <Text style={styles.fixSummary}>
            {fixedCount} of {mistakes.length} mistakes fixed
            {skipped.length > 0 ? ` · ${skipped.length} skipped after 3 tries` : ''}
          </Text>
        )}
      </View>

      {tierChange === 'down' && (
        <View style={[styles.banner, styles.bannerDown]}>
          <Text style={styles.bannerDownText}>
            That was a tough one — the next quiz will be a bit easier. 💪
          </Text>
        </View>
      )}
      {tierChange === 'up' && (
        <View style={[styles.banner, styles.bannerUp]}>
          <Text style={styles.bannerUpText}>
            Amazing score — the next quiz will be a bit harder! 🚀
          </Text>
        </View>
      )}

      {records.map((r, i) => {
        const isSkipped = !r.correct && r.skipped;
        const isFixed = !r.correct && r.fixed;
        return (
          <View
            key={r.question.id}
            style={[styles.item, r.correct ? styles.itemCorrect : styles.itemWrong]}
          >
            <Text style={styles.itemPrompt}>
              {i + 1}. {r.question.prompt.replace(' = ?', '')}
              {r.question.prompt.endsWith('= ?') ? ` = ${r.question.correctAnswer}` : ''}
            </Text>
            {!r.question.prompt.endsWith('= ?') && (
              <Text style={styles.itemAnswer}>Answer: {r.question.correctAnswer}</Text>
            )}
            {r.correct ? (
              <Text style={styles.itemStatusCorrect}>✔ Correct</Text>
            ) : (
              <View>
                <Text style={styles.itemStatusWrong}>✘ You answered {r.chosen ?? '—'}</Text>
                {isFixed && <Text style={styles.itemStatusFixed}>✔ Fixed in practice</Text>}
                {isSkipped && (
                  <Text style={styles.itemStatusSkipped}>⏭ Skipped after 3 tries</Text>
                )}
              </View>
            )}
          </View>
        );
      })}

      {!afterCorrection && mistakes.length > 0 && (
        <Pressable style={styles.primaryButton} onPress={onFixMistakes}>
          <Text style={styles.primaryButtonText}>
            Fix your {mistakes.length} mistake{mistakes.length > 1 ? 's' : ''}
          </Text>
        </Pressable>
      )}
      <Pressable style={styles.secondaryButton} onPress={onHome}>
        <Text style={styles.secondaryButtonText}>Back to Home</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 24, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, textAlign: 'center' },
  scoreCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    padding: 24,
    marginTop: 18,
    marginBottom: 12,
  },
  score: { fontSize: 44, fontWeight: '800', color: colors.primary },
  percent: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 4 },
  time: { fontSize: 15, color: colors.textMuted, marginTop: 6 },
  fixSummary: { fontSize: 15, color: colors.text, marginTop: 10, fontWeight: '600' },
  banner: { borderRadius: 12, padding: 14, marginBottom: 12 },
  bannerDown: { backgroundColor: colors.warningBg },
  bannerDownText: { color: colors.warning, fontWeight: '600', fontSize: 15 },
  bannerUp: { backgroundColor: colors.correctBg },
  bannerUpText: { color: colors.correct, fontWeight: '600', fontSize: 15 },
  item: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderLeftWidth: 5,
    padding: 14,
    marginBottom: 8,
  },
  itemCorrect: { borderLeftColor: colors.correct },
  itemWrong: { borderLeftColor: colors.wrong },
  itemPrompt: { fontSize: 17, fontWeight: '700', color: colors.text },
  itemAnswer: { fontSize: 15, color: colors.text, marginTop: 2 },
  itemStatusCorrect: { color: colors.correct, marginTop: 4, fontWeight: '600' },
  itemStatusWrong: { color: colors.wrong, marginTop: 4, fontWeight: '600' },
  itemStatusFixed: { color: colors.correct, marginTop: 2, fontWeight: '600' },
  itemStatusSkipped: { color: colors.warning, marginTop: 2, fontWeight: '600' },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  secondaryButtonText: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
