import { useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Chord, chordThroughDrag, countPieces, sameCut } from '../lib/cakeCuts';
import { colors } from '../theme';
import { CakeCutTask } from '../types';

/**
 * How far apart two crossings must be to count as separate points, as a
 * fraction of the cake's radius. This is what makes "send every cut through
 * the middle" achievable with a finger rather than a ruler.
 */
const CROSSING_TOLERANCE = 0.08;

const CUT_THICKNESS = 4;

interface Props {
  task: CakeCutTask;
  cuts: Chord[];
  /** Width and height of the square the cake is drawn in. */
  size: number;
  state?: 'idle' | 'correct' | 'wrong';
  disabled?: boolean;
  submitLabel?: string;
  onChange: (cuts: Chord[]) => void;
  onSubmit: (pieces: number) => void;
}

function CutLine({ chord, colour, faded }: { chord: Chord; colour: string; faded?: boolean }) {
  const dx = chord.x2 - chord.x1;
  const dy = chord.y2 - chord.y1;
  const length = Math.hypot(dx, dy);
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        // Positioned by its midpoint, because rotation pivots about the centre.
        left: (chord.x1 + chord.x2) / 2 - length / 2,
        top: (chord.y1 + chord.y2) / 2 - CUT_THICKNESS / 2,
        width: length,
        height: CUT_THICKNESS,
        borderRadius: CUT_THICKNESS / 2,
        backgroundColor: colour,
        opacity: faded ? 0.35 : 1,
        transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
      }}
    />
  );
}

export default function CutBoard({
  task,
  cuts,
  size,
  state = 'idle',
  disabled,
  submitLabel = 'Check answer',
  onChange,
  onSubmit,
}: Props) {
  const [preview, setPreview] = useState<Chord | null>(null);

  const radius = size / 2 - 8;
  const center = { x: size / 2, y: size / 2 };
  const tolerance = radius * CROSSING_TOLERANCE;
  const pieces = countPieces(cuts, tolerance);

  // The pan handlers are created once, so they read live values through a ref
  // rather than capturing the first render's props.
  const live = useRef({ cuts, disabled, task, onChange, radius, center, tolerance });
  live.current = { cuts, disabled, task, onChange, radius, center, tolerance };

  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        const { disabled: off, cuts: placed, task: current } = live.current;
        if (off || placed.length >= current.cuts) return;
        const { locationX, locationY } = event.nativeEvent;
        dragStart.current = { x: locationX, y: locationY };
      },
      onPanResponderMove: (event) => {
        if (!dragStart.current) return;
        const { locationX, locationY } = event.nativeEvent;
        const { radius: r, center: c } = live.current;
        setPreview(chordThroughDrag(dragStart.current, { x: locationX, y: locationY }, c, r));
      },
      onPanResponderRelease: (event) => {
        const start = dragStart.current;
        dragStart.current = null;
        setPreview(null);
        if (!start) return;

        const {
          cuts: placed,
          task: current,
          onChange: emit,
          radius: r,
          center: c,
          tolerance: tol,
        } = live.current;
        const { locationX, locationY } = event.nativeEvent;
        const cut = chordThroughDrag(start, { x: locationX, y: locationY }, c, r);
        if (!cut) return;
        if (placed.length >= current.cuts) return;
        // Re-cutting the same slice would look like progress but change nothing.
        if (placed.some((existing) => sameCut(existing, cut, tol))) return;
        emit([...placed, cut]);
      },
      onPanResponderTerminate: () => {
        dragStart.current = null;
        setPreview(null);
      },
    }),
  ).current;

  const cutsLeft = task.cuts - cuts.length;
  const onTarget = pieces === task.pieces;
  const ready = cuts.length > 0 && !disabled;

  return (
    <View style={styles.wrapper}>
      <View style={styles.status}>
        <Text style={styles.statusItem}>
          {cutsLeft > 0 ? `${cutsLeft} cut${cutsLeft > 1 ? 's' : ''} left` : 'No cuts left'}
        </Text>
        <Text
          style={[
            styles.statusPieces,
            onTarget && state === 'idle' && styles.statusPiecesOnTarget,
          ]}
        >
          {pieces} piece{pieces > 1 ? 's' : ''} of {task.pieces}
        </Text>
      </View>

      <View
        {...responder.panHandlers}
        style={[styles.canvas, { width: size, height: size }]}
        collapsable={false}
      >
        <View
          pointerEvents="none"
          style={[
            styles.cake,
            {
              left: center.x - radius,
              top: center.y - radius,
              width: radius * 2,
              height: radius * 2,
              borderRadius: radius,
            },
            state === 'correct' && styles.cakeCorrect,
            state === 'wrong' && styles.cakeWrong,
          ]}
        />
        {/* A faint centre mark to aim cuts at. */}
        <View pointerEvents="none" style={[styles.centerDot, { left: center.x - 3, top: center.y - 3 }]} />
        {cuts.map((cut, i) => (
          <CutLine key={i} chord={cut} colour={colors.primaryDark} />
        ))}
        {preview && <CutLine chord={preview} colour={colors.primary} faded />}
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={() => onChange(cuts.slice(0, -1))}
          disabled={disabled || cuts.length === 0}
          style={({ pressed }) => [
            styles.controlButton,
            (disabled || cuts.length === 0) && styles.controlDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.controlLabel}>Undo</Text>
        </Pressable>
        <Pressable
          onPress={() => onChange([])}
          disabled={disabled || cuts.length === 0}
          style={({ pressed }) => [
            styles.controlButton,
            (disabled || cuts.length === 0) && styles.controlDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.controlLabel}>Start over</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => onSubmit(pieces)}
        disabled={!ready}
        style={({ pressed }) => [
          styles.submit,
          !ready && styles.submitDisabled,
          pressed && ready && styles.pressed,
        ]}
      >
        <Text style={styles.submitLabel}>{submitLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%', maxWidth: 380, alignSelf: 'center', gap: 10 },
  status: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusItem: { fontSize: 15, fontWeight: '700', color: colors.textMuted },
  statusPieces: { fontSize: 17, fontWeight: '800', color: colors.text },
  statusPiecesOnTarget: { color: colors.correct },
  canvas: {
    alignSelf: 'center',
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cake: {
    position: 'absolute',
    backgroundColor: '#fbe3c2',
    borderWidth: 3,
    borderColor: '#e0a86a',
  },
  cakeCorrect: { borderColor: colors.correct },
  cakeWrong: { borderColor: colors.wrong },
  centerDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#c98a52',
  },
  controls: { flexDirection: 'row', gap: 10 },
  controlButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  controlDisabled: { opacity: 0.45 },
  controlLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  pressed: { opacity: 0.6 },
  submit: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitDisabled: { backgroundColor: '#aeb5cc' },
  submitLabel: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
