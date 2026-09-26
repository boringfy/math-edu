import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

/**
 * The clock on a Speed Match question.
 *
 * A bar rather than a number, because the thing a child needs to read at a
 * glance mid-sum is "how much is left", not "3.4". The number is there too,
 * small, for the ones who want it.
 *
 * It runs off wall-clock time rather than counting ticks, so a dropped frame
 * or a slow render cannot quietly hand out extra seconds — which on a
 * one-minute drill would be the difference between a fair round and a
 * flattering one.
 *
 * Remount to restart it. The quiz keys it on the question index, so every
 * question gets a fresh clock and no timer can outlive the question it
 * belonged to.
 */
interface Props {
  seconds: number;
  /** Called once, when the time is up. Never called after unmount. */
  onExpire: () => void;
}

/** Below this fraction the bar goes red — about the last second at any pace. */
const URGENT = 0.25;

export default function CountdownBar({ seconds, onExpire }: Props) {
  const [left, setLeft] = useState(seconds);
  // Held in a ref so a new inline callback each render cannot restart the
  // clock, which would make the question unanswerable-in-time by accident.
  const expire = useRef(onExpire);
  expire.current = onExpire;

  useEffect(() => {
    const startedAt = Date.now();
    let fired = false;
    const id = setInterval(() => {
      const remaining = seconds - (Date.now() - startedAt) / 1000;
      setLeft(Math.max(0, remaining));
      if (remaining <= 0 && !fired) {
        fired = true;
        clearInterval(id);
        expire.current();
      }
    }, 100);
    return () => clearInterval(id);
  }, [seconds]);

  const fraction = Math.max(0, Math.min(1, left / seconds));
  const urgent = fraction <= URGENT;

  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityLabel={`${Math.ceil(left)} seconds left`}
    >
      <View style={styles.track}>
        <View
          style={[styles.fill, urgent && styles.fillUrgent, { width: `${fraction * 100}%` }]}
        />
      </View>
      <Text style={[styles.count, urgent && styles.countUrgent]}>{Math.ceil(left)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  track: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 5, backgroundColor: colors.primary },
  fillUrgent: { backgroundColor: colors.wrong },
  count: {
    minWidth: 26,
    textAlign: 'right',
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    color: colors.textMuted,
  },
  countUrgent: { color: colors.wrong },
});
