import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { pieceSlice } from '../lib/anim';
import { MissKind } from '../lib/celebrate';
import { colors } from '../theme';

/**
 * The four ways the app says "not that one".
 *
 * Built to the same machine as `Celebration` — one driver, native transforms,
 * an overlay that ignores touches — and deliberately its opposite in tone.
 * Everything here is small, grey-blue, brief, and centred on a shrug rather
 * than a cross. There is no red, no X, and nothing that stays on screen long
 * enough to dwell on.
 *
 * A child gets several of these in a round. That is the design constraint:
 * whatever this looks like, it has to be something you can see twenty times in
 * ten minutes without it wearing you down.
 */

interface Props {
  kind: MissKind | null;
  /** Changes on every trigger, so the same kind twice still replays. */
  nonce: number;
}

interface Piece {
  dx: number;
  dy: number;
  scale: number;
  delay: number;
  size: number;
  /** A ring grows and thins instead of travelling. */
  ring?: boolean;
}

/** Muted on purpose — this is the palette of a shrug, not an alarm. */
const DUST = '#aab1c8';

function rand(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function piecesFor(kind: MissKind, nonce: number): Piece[] {
  const r = rand(nonce * 40503);
  switch (kind) {
    /* Nothing flies: the glyph itself shakes. Handled in the render. */
    case 'wobble':
      return [];

    /* A small puff of dust, as if something landed softly and missed. */
    case 'puff':
      return Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2;
        return {
          dx: Math.cos(angle) * (36 + r() * 26),
          dy: Math.sin(angle) * (26 + r() * 20) - 10,
          scale: 0.5 + r() * 0.6,
          delay: r() * 90,
          size: 12,
        };
      });

    /* Three rings spreading out and fading, like a stone in water. */
    case 'ripple':
      return [0, 1, 2].map((i) => ({
        dx: 0,
        dy: 0,
        scale: 2.6 + i * 0.7,
        delay: i * 130,
        size: 44,
        ring: true,
      }));

    /* A few pieces drifting down and settling, unhurried. */
    case 'drift':
      return Array.from({ length: 7 }, () => ({
        dx: (r() - 0.5) * 120,
        dy: 70 + r() * 60,
        scale: 0.6 + r() * 0.5,
        delay: r() * 200,
        size: 10,
      }));
  }
}

/** Kind words, and never the same one twice in a row by luck alone. */
const LABEL: Record<MissKind, string> = {
  wobble: 'Not quite',
  puff: 'Nearly',
  ripple: 'Close one',
  drift: 'Try the next',
};

const GLYPH: Record<MissKind, string> = {
  wobble: '🤔',
  puff: '💨',
  ripple: '💧',
  drift: '🍂',
};

const DURATION: Record<MissKind, number> = {
  wobble: 700,
  puff: 750,
  ripple: 900,
  drift: 950,
};

export default function MissFeedback({ kind, nonce }: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  const pieces = useMemo(() => (kind ? piecesFor(kind, nonce) : []), [kind, nonce]);

  useEffect(() => {
    if (!kind) return;
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: DURATION[kind],
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [kind, nonce, anim]);

  if (!kind) return null;

  const total = DURATION[kind];
  // A shake rather than a flight: three passes, decaying, then still.
  const shake = anim.interpolate({
    inputRange: [0, 0.15, 0.35, 0.55, 0.75, 1],
    outputRange: [0, -12, 10, -6, 3, 0],
  });

  return (
    <View style={styles.overlay} pointerEvents="none">
      {pieces.map((piece, i) => {
        const slice = pieceSlice(piece.delay, total);
        const progress =
          slice === null
            ? anim
            : anim.interpolate({ inputRange: slice, outputRange: [0, 0, 1], extrapolate: 'clamp' });
        return (
          <Animated.View
            key={i}
            style={[
              styles.piece,
              {
                opacity: progress.interpolate({
                  inputRange: [0, 0.2, 0.6, 1],
                  outputRange: [0, piece.ring ? 0.5 : 0.75, piece.ring ? 0.25 : 0.5, 0],
                }),
                transform: [
                  {
                    translateX: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, piece.dx],
                    }),
                  },
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, piece.dy],
                    }),
                  },
                  {
                    scale: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [piece.ring ? 0.4 : 0.3, piece.scale],
                    }),
                  },
                ],
              },
            ]}
          >
            <View
              style={{
                width: piece.size,
                height: piece.size,
                borderRadius: piece.size / 2,
                backgroundColor: piece.ring ? 'transparent' : DUST,
                borderWidth: piece.ring ? 2 : 0,
                borderColor: DUST,
              }}
            />
          </Animated.View>
        );
      })}

      <Animated.View
        style={[
          styles.badge,
          {
            opacity: anim.interpolate({
              inputRange: [0, 0.12, 0.65, 1],
              outputRange: [0, 1, 1, 0],
            }),
            transform: [
              { translateX: kind === 'wobble' ? shake : 0 },
              { scale: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.75, 1, 1] }) },
            ],
          },
        ]}
      >
        <Text style={styles.glyph}>{GLYPH[kind]}</Text>
        <Text style={styles.label}>{LABEL[kind]}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  piece: { position: 'absolute' },
  badge: { alignItems: 'center' },
  glyph: { fontSize: 40 },
  label: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: '800',
    color: colors.textMuted,
    textShadowColor: 'rgba(255,255,255,0.9)',
    textShadowRadius: 8,
  },
});
