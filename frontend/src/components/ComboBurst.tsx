import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

const CHEERS = ['Nice!', 'Great!', 'On fire!', 'Unstoppable!', 'Wow!'];

interface Props {
  /** The streak that triggered the burst. */
  combo: number;
  /** Changes on every trigger, so the same streak length can replay. */
  nonce: number;
}

/**
 * The reward for a run of correct answers: a burst that springs in, holds,
 * then floats away. It sits above the question and ignores touches, so it
 * never gets in the way of answering the next one.
 */
export default function ComboBurst({ combo, nonce }: Props) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (combo <= 0) return;
    anim.setValue(0);
    Animated.sequence([
      Animated.spring(anim, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      Animated.delay(550),
      Animated.timing(anim, {
        toValue: 2,
        duration: 400,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
    // Replays whenever a new milestone fires, even at the same streak length.
  }, [nonce, combo, anim]);

  if (combo <= 0) return null;

  const cheer = CHEERS[Math.min(Math.floor((combo - 3) / 2), CHEERS.length - 1)];

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View
        style={[
          styles.badge,
          {
            opacity: anim.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] }),
            transform: [
              { scale: anim.interpolate({ inputRange: [0, 1, 2], outputRange: [0.3, 1, 1.25] }) },
              {
                translateY: anim.interpolate({
                  inputRange: [0, 1, 2],
                  outputRange: [24, 0, -56],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.flame}>🔥</Text>
        <Text style={styles.count}>{combo} in a row!</Text>
        <Text style={styles.cheer}>{cheer}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Pinned over the question rather than inline, so nothing shifts when it
  // appears and disappears.
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: '#fff5d6',
    borderWidth: 3,
    borderColor: '#f5b700',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#f5b700',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  flame: { fontSize: 40 },
  count: { fontSize: 26, fontWeight: '800', color: '#a86b00', marginTop: 4 },
  cheer: { fontSize: 16, fontWeight: '700', color: colors.textMuted, marginTop: 2 },
});
