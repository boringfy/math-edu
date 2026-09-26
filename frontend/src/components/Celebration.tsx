import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { pieceSlice } from '../lib/anim';
import { CelebrationKind } from '../lib/celebrate';
import { colors } from '../theme';

/**
 * The five ways the app says well done.
 *
 * All of them are the same machine: one `Animated.Value` runs 0 → 1, and every
 * piece on screen is an interpolation of it. One driver rather than one per
 * particle keeps forty moving things affordable on a cheap tablet, and lets
 * every transform go through the native driver, so a burst never competes with
 * JavaScript for the next question's render.
 *
 * It is an overlay with touches disabled, like `ComboBurst` beside it, so a
 * child who is already answering the next question is never blocked by a
 * celebration for the last one.
 *
 * The pieces are laid out from an angle and a distance rather than from a
 * physics simulation. Nobody can tell the difference at 900ms, and this way
 * the whole thing is a pure function of the nonce.
 */

interface Props {
  kind: CelebrationKind | null;
  /** Changes on every trigger, so the same kind twice still replays. */
  nonce: number;
}

interface Piece {
  /** Where it ends up, relative to the centre. */
  dx: number;
  dy: number;
  rotate: string;
  scale: number;
  delay: number;
  color: string;
  glyph?: string;
  size: number;
}

const PARTY = ['#4f6df5', '#f5b700', '#2e9e5b', '#d9455f', '#8b5cf6', '#00b8d4'];

/** Deterministic given the nonce, so a rerender never reshuffles mid-flight. */
function rand(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function piecesFor(kind: CelebrationKind, nonce: number): Piece[] {
  const r = rand(nonce * 2654435761);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];

  switch (kind) {
    /* A quiet ring of dots. The smallest thing that still reads as "yes". */
    case 'sparkle':
      return Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return {
          dx: Math.cos(angle) * 54,
          dy: Math.sin(angle) * 54,
          rotate: '0deg',
          scale: 0.6 + r() * 0.4,
          delay: 0,
          color: pick(PARTY),
          size: 10,
        };
      });

    /* Paper falling: wide spread across the top, tumbling down past the sides. */
    case 'confetti':
      return Array.from({ length: 26 }, () => ({
        dx: (r() - 0.5) * 320,
        dy: 180 + r() * 220,
        rotate: `${Math.round((r() - 0.5) * 900)}deg`,
        scale: 0.7 + r() * 0.6,
        delay: r() * 220,
        color: pick(PARTY),
        size: 12,
      }));

    /* Stars thrown outward and spinning, brighter than confetti. */
    case 'stars':
      return Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * Math.PI * 2 + r() * 0.4;
        const distance = 110 + r() * 90;
        return {
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance,
          rotate: `${Math.round((r() - 0.5) * 720)}deg`,
          scale: 0.8 + r() * 0.7,
          delay: r() * 120,
          color: '#f5b700',
          glyph: pick(['⭐', '✨', '🌟']),
          size: 26,
        };
      });

    /* Three staggered shells, each a radial spray — the biggest of the five. */
    case 'fireworks': {
      const shells = [
        { x: -90, y: -60, delay: 0 },
        { x: 95, y: -20, delay: 180 },
        { x: 0, y: 70, delay: 340 },
      ];
      return shells.flatMap((shell) => {
        const color = pick(PARTY);
        return Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const distance = 70 + r() * 40;
          return {
            dx: shell.x + Math.cos(angle) * distance,
            dy: shell.y + Math.sin(angle) * distance,
            rotate: '0deg',
            scale: 0.5 + r() * 0.5,
            delay: shell.delay,
            color,
            size: 9,
          };
        });
      });
    }

    /* One rocket up the middle, with a tail of sparks chasing it. */
    case 'rocket': {
      const sparks: Piece[] = Array.from({ length: 12 }, (_, i) => ({
        dx: (r() - 0.5) * 70,
        dy: 90 - i * 12 + r() * 20,
        rotate: '0deg',
        scale: 0.4 + r() * 0.5,
        delay: 60 + i * 22,
        color: pick(['#f5b700', '#d9455f', '#ff8a00']),
        size: 8,
      }));
      return [
        {
          dx: 0,
          dy: -220,
          rotate: '0deg',
          scale: 1.4,
          delay: 0,
          color: 'transparent',
          glyph: '🚀',
          size: 40,
        },
        ...sparks,
      ];
    }
  }
}

/** Every piece of a kind, for tests that need to inspect the whole burst. */
export const piecesOf = (kind: CelebrationKind, nonce: number): Piece[] =>
  piecesFor(kind, nonce);

/** A word to go with it, sized to the moment. */
const LABEL: Record<CelebrationKind, string> = {
  sparkle: 'Nice',
  confetti: 'Great!',
  stars: 'Brilliant!',
  fireworks: 'Lightning fast!',
  rocket: 'Blazing!',
};

const DURATION: Record<CelebrationKind, number> = {
  sparkle: 620,
  confetti: 1100,
  stars: 950,
  fireworks: 1250,
  rocket: 1100,
};

export default function Celebration({ kind, nonce }: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  const pieces = useMemo(() => (kind ? piecesFor(kind, nonce) : []), [kind, nonce]);

  useEffect(() => {
    if (!kind) return;
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: DURATION[kind],
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [kind, nonce, anim]);

  if (!kind) return null;

  const total = DURATION[kind];

  return (
    <View style={styles.overlay} pointerEvents="none">
      {pieces.map((piece, i) => {
        /*
          Each piece's own slice of the driver, so a delay costs nothing but a
          shifted input range.

          A piece with no delay takes the driver unchanged. Interpolating it
          would mean an input range of [0, 0, 1], which is not increasing —
          the native driver accepts that node without a word and then produces
          nothing at all, so the whole burst silently fails to appear. It is
          invisible in a unit test too, because the tree still renders.
        */
        const slice = pieceSlice(piece.delay, total);
        const progress =
          slice === null
            ? anim
            : anim.interpolate({
                inputRange: slice,
                outputRange: [0, 0, 1],
                extrapolate: 'clamp',
              });
        return (
          <Animated.View
            key={i}
            style={[
              styles.piece,
              {
                opacity: progress.interpolate({
                  inputRange: [0, 0.15, 0.75, 1],
                  outputRange: [0, 1, 1, 0],
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
                    rotate: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', piece.rotate],
                    }),
                  },
                  {
                    scale: progress.interpolate({
                      inputRange: [0, 0.25, 1],
                      outputRange: [0.2, piece.scale, piece.scale * 0.85],
                    }),
                  },
                ],
              },
            ]}
          >
            {piece.glyph ? (
              <Text style={{ fontSize: piece.size }}>{piece.glyph}</Text>
            ) : (
              <View
                style={{
                  width: piece.size,
                  height: kind === 'confetti' ? piece.size * 1.6 : piece.size,
                  borderRadius: kind === 'confetti' ? 2 : piece.size / 2,
                  backgroundColor: piece.color,
                }}
              />
            )}
          </Animated.View>
        );
      })}

      <Animated.Text
        style={[
          styles.label,
          kind === 'sparkle' && styles.labelQuiet,
          {
            opacity: anim.interpolate({
              inputRange: [0, 0.12, 0.6, 1],
              outputRange: [0, 1, 1, 0],
            }),
            transform: [
              { scale: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.6, 1, 1.1] }) },
              { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] }) },
            ],
          },
        ]}
      >
        {LABEL[kind]}
      </Animated.Text>
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
  label: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.correct,
    textShadowColor: 'rgba(255,255,255,0.9)',
    textShadowRadius: 8,
  },
  labelQuiet: { fontSize: 22, color: colors.textMuted },
});
