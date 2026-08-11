import { StyleSheet, Text, View } from 'react-native';
import { CHALLENGES } from '../lib/progress';
import { colors } from '../theme';
import { DailyState } from '../types';

interface Props {
  daily: DailyState;
}

/** The day's three goals, each with its own bar and its coin reward. */
export default function DailyChallenges({ daily }: Props) {
  const done = daily.challengeIds.filter((id) => daily.claimed.includes(id)).length;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Today's challenges</Text>
        <Text style={styles.headerCount}>
          {done}/{daily.challengeIds.length} done
        </Text>
      </View>

      {daily.challengeIds.map((id) => {
        const def = CHALLENGES[id];
        if (!def) return null;
        const value = Math.min(daily.progress[id] ?? 0, def.target);
        const complete = daily.claimed.includes(id);
        return (
          <View key={id} style={styles.challenge}>
            <View style={styles.labelRow}>
              <Text style={[styles.title, complete && styles.titleDone]} numberOfLines={1}>
                {def.icon} {def.title}
              </Text>
              <Text style={[styles.reward, complete && styles.rewardDone]}>
                {complete ? '✔' : `🪙 ${def.reward}`}
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  complete && styles.fillDone,
                  { width: `${(value / def.target) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.count}>
              {value} / {def.target}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 16,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  header: { fontSize: 16, fontWeight: '800', color: colors.text },
  headerCount: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  challenge: { marginTop: 14 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '600', color: colors.text, flexShrink: 1 },
  titleDone: { color: colors.correct },
  reward: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginLeft: 8 },
  rewardDone: { color: colors.correct, fontSize: 16 },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginTop: 6,
  },
  fill: { height: 10, borderRadius: 5, backgroundColor: colors.primary },
  fillDone: { backgroundColor: colors.correct },
  count: { fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'right' },
});
