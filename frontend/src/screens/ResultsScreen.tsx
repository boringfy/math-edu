import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import PuzzleTile from '../components/PuzzleTile';
import { AdaptiveEvent } from '../lib/adaptive';
import { formatElapsed } from '../lib/format';
import { FAMILY_LABEL, TOPIC_LABEL } from '../lib/maps';
import { ChallengeDef } from '../lib/progress';
import { colors } from '../theme';
import { AnswerRecord, CoinAward, MapStop, Stars, Subject } from '../types';

/** What a stop is called in each subject, for the headings and messages. */
const NAMES: Record<Subject, { heading: string; noun: string }> = {
  math: { heading: 'Lesson', noun: 'lesson' },
  reading: { heading: 'Story', noun: 'story' },
  logic: { heading: 'Puzzles', noun: 'puzzle set' },
};

interface Props {
  records: AnswerRecord[];
  elapsedMs: number;
  /** 'down' when too many mistakes lowered the difficulty for next time. */
  tierChange: 'up' | 'down' | null;
  /** What this round unlocked or re-tuned, each celebrated as a banner. */
  adaptiveEvents: AdaptiveEvent[];
  afterCorrection: boolean;
  subject: Subject;
  /** null for free practice, which sits outside the map. */
  stop: MapStop | null;
  stars: Stars | null;
  bestCombo: number;
  award: CoinAward;
  /** Day challenges this session finished off, celebrated once here. */
  completedChallenges: ChallengeDef[];
  coinTotal: number;
  onFixMistakes: () => void;
  onHome: () => void;
}

export default function ResultsScreen({
  records,
  elapsedMs,
  tierChange,
  adaptiveEvents,
  afterCorrection,
  subject,
  stop,
  stars,
  bestCombo,
  award,
  completedChallenges,
  coinTotal,
  onFixMistakes,
  onHome,
}: Props) {
  const total = records.length;
  const correctCount = records.filter((r) => r.correct).length;
  const mistakes = records.filter((r) => !r.correct);
  const fixedCount = mistakes.filter((r) => r.fixed).length;
  const skipped = mistakes.filter((r) => r.skipped);
  const percent = Math.round((correctCount / total) * 100);
  const { heading, noun } = NAMES[subject];

  const coinLines: { label: string; value: number }[] = [
    { label: `${correctCount} correct answers`, value: award.correct },
    { label: `${fixedCount} mistakes fixed`, value: award.fixed },
    { label: `Best combo: ${bestCombo} in a row`, value: award.combo },
    { label: `Perfect ${noun}`, value: award.perfect },
    { label: 'First time cleared', value: award.firstClear },
    { label: 'Daily challenges', value: award.challenges },
  ].filter((line) => line.value > 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{afterCorrection ? 'Practice complete!' : 'Quiz complete!'}</Text>
      {stop && (
        <Text style={styles.lessonName}>
          {stop.icon} {heading} {stop.index}: {stop.title}
        </Text>
      )}

      <View style={styles.scoreCard}>
        {stars !== null && (
          <Text style={styles.stars}>
            {'★'.repeat(stars)}
            <Text style={styles.starsEmpty}>{'★'.repeat(3 - stars)}</Text>
          </Text>
        )}
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

      {award.total > 0 && (
        <View style={styles.coinCard}>
          <Text style={styles.coinHeadline}>🪙 +{award.total} coins</Text>
          {coinLines.map((line) => (
            <View key={line.label} style={styles.coinLine}>
              <Text style={styles.coinLabel}>{line.label}</Text>
              <Text style={styles.coinValue}>+{line.value}</Text>
            </View>
          ))}
          <Text style={styles.coinTotal}>Purse: 🪙 {coinTotal}</Text>
        </View>
      )}

      {completedChallenges.map((c) => (
        <View key={c.id} style={[styles.banner, styles.bannerUp]}>
          <Text style={styles.bannerUpText}>
            🎉 Challenge complete — {c.icon} {c.title} (+{c.reward} coins)
          </Text>
        </View>
      ))}

      {stars === 3 && !afterCorrection && (
        <View style={[styles.banner, styles.bannerUp]}>
          <Text style={styles.bannerUpText}>Three stars — a perfect {noun}! 🌟</Text>
        </View>
      )}
      {stars === 0 && !afterCorrection && (
        <View style={[styles.banner, styles.bannerDown]}>
          <Text style={styles.bannerDownText}>
            Fix your mistakes to earn a star and open the next {noun}. 💪
          </Text>
        </View>
      )}

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

      {adaptiveEvents.map((event) => {
        const labels = subject === 'logic' ? FAMILY_LABEL : TOPIC_LABEL;
        const name = labels[event.topic] ?? event.topic;
        if (event.kind === 'unlock') {
          return (
            <View key={`unlock-${event.topic}`} style={[styles.banner, styles.bannerUp]}>
              <Text style={styles.bannerUpText}>
                🔓 New question type unlocked — {name}! It joins your next practice.
              </Text>
            </View>
          );
        }
        return event.direction === 'up' ? (
          <View key={`tier-${event.topic}`} style={[styles.banner, styles.bannerUp]}>
            <Text style={styles.bannerUpText}>
              {name} questions just got harder — nice work! 💪
            </Text>
          </View>
        ) : (
          <View key={`tier-${event.topic}`} style={[styles.banner, styles.bannerDown]}>
            <Text style={styles.bannerDownText}>
              We'll make {name} questions a bit easier for now.
            </Text>
          </View>
        );
      })}

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
            {/* A drawn puzzle's answer is a letter, which says nothing on its
                own — so the winning tile is shown beside it. */}
            {r.question.puzzle && (
              <View style={styles.itemTile}>
                <PuzzleTile
                  tile={r.question.puzzle.options[r.question.correctAnswer]}
                  size={58}
                />
              </View>
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
  lessonName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  stars: { fontSize: 38, color: '#f5b700', letterSpacing: 4, marginBottom: 2 },
  starsEmpty: { color: colors.border },
  coinCard: {
    backgroundColor: '#fff5d6',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#f5b700',
    padding: 16,
    marginBottom: 12,
  },
  coinHeadline: { fontSize: 24, fontWeight: '800', color: '#a86b00', textAlign: 'center' },
  coinLine: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  coinLabel: { fontSize: 14, color: colors.text, flexShrink: 1 },
  coinValue: { fontSize: 14, fontWeight: '700', color: '#a86b00', marginLeft: 8 },
  coinTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#a86b00',
    textAlign: 'center',
    marginTop: 12,
  },
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
  itemTile: { marginTop: 6 },
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
