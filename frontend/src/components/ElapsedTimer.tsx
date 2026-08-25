import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { formatElapsed } from '../lib/format';
import { colors } from '../theme';

/** Live clock counting up from `startedAt` (a Date.now() timestamp). */
export default function ElapsedTimer({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, []);

  return <Text style={styles.timer}>⏱ {formatElapsed(now - startedAt)}</Text>;
}

const styles = StyleSheet.create({
  timer: {
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    color: colors.textMuted,
    fontWeight: '600',
  },
});
