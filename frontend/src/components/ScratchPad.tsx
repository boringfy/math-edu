import { useEffect, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PointerEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  appendPoint,
  eraseAround,
  eraserButtonHeld,
  Point,
  Stroke,
  strokePath,
} from '../lib/scratch';
import { colors } from '../theme';

const INK_WIDTH = 3;

/** Paper shorter than this is too cramped to write a sum on. */
const MIN_HEIGHT = 120;

/** How long "use the pen" stays up after a hand is turned away. */
const HINT_MS = 1600;

interface Props {
  /**
   * Ignore everything but a stylus. A child writing with a pen rests their
   * hand on the paper as they go, and Android reports that palm as an
   * ordinary touch — without this it scrawls across their working.
   */
  penOnly: boolean;
}

/**
 * A sheet of scrap paper above the question, for working an answer out by
 * hand. It never checks or reports what was drawn on it: the point is the
 * thinking, not the marks. It keeps them to itself too — the quiz gives it a
 * fresh sheet per question by remounting it.
 *
 * It stretches into whatever the question leaves empty rather than asking for
 * a size, so a short sum on a tall tablet gets most of the screen to work on.
 */
export default function ScratchPad({ penOnly }: Props) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [erasing, setErasing] = useState(false);
  /**
   * The pen's side button, held down right now. Kept apart from the eraser
   * toggle so that letting go of the button returns to whatever the child had
   * chosen, rather than to writing regardless.
   */
  const [buttonHeld, setButtonHeld] = useState(false);
  /** The stroke under the pointer right now, still being drawn. */
  const [live, setLive] = useState<Stroke>([]);
  /** Up briefly after a finger or a palm was turned away. */
  const [turnedAway, setTurnedAway] = useState(false);

  // Which pointer is drawing, so that a palm landing mid-stroke is ignored
  // rather than treated as the pen moving.
  const active = useRef<number | null>(null);
  const drawing = useRef<Stroke>([]);
  /** Whether the marks being made right now are rubbing out or writing. */
  const rubbingOut = useRef(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    },
    [],
  );

  /**
   * Claims the touch, so that drawing inside the pad never turns into a
   * scroll of the question behind it. The marks themselves come from the
   * pointer events, which are the only ones that say what is doing the
   * touching.
   */
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
    }),
  ).current;

  const at = (event: PointerEvent): Point => ({
    x: event.nativeEvent.offsetX,
    y: event.nativeEvent.offsetY,
  });

  /** Android calls a stylus 'pen'; a finger 'touch' and a palm neither. */
  const welcome = (event: PointerEvent) =>
    !penOnly || event.nativeEvent.pointerType === 'pen';

  /**
   * Rub out or write, for this event.
   *
   * The button wins while it is held, and the toggle decides the rest of the
   * time — so holding the button always rubs out, and letting go always
   * returns to what the child picked.
   */
  const shouldRubOut = (event: PointerEvent): boolean =>
    erasing || eraserButtonHeld(event.nativeEvent.buttons);

  /** Files the stroke in progress away with the rest of the marks. */
  const commit = () => {
    const stroke = drawing.current;
    drawing.current = [];
    setLive([]);
    if (stroke.length > 0) setStrokes((current) => [...current, stroke]);
  };

  const turnAway = () => {
    setTurnedAway(true);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setTurnedAway(false), HINT_MS);
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!welcome(event)) {
      turnAway();
      return;
    }
    active.current = event.nativeEvent.pointerId;
    const point = at(event);
    const held = eraserButtonHeld(event.nativeEvent.buttons);
    setButtonHeld(held);

    rubbingOut.current = shouldRubOut(event);
    if (rubbingOut.current) {
      setStrokes((current) => eraseAround(current, point));
      return;
    }
    drawing.current = [point];
    setLive(drawing.current);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (active.current !== event.nativeEvent.pointerId) return;
    const point = at(event);

    const held = eraserButtonHeld(event.nativeEvent.buttons);
    if (held !== buttonHeld) setButtonHeld(held);

    // The button can go down or come up without the pen leaving the paper.
    // Whatever was being drawn up to that moment is kept, and the rest of the
    // movement does the other thing.
    const rubOut = shouldRubOut(event);
    if (rubOut !== rubbingOut.current) {
      commit();
      rubbingOut.current = rubOut;
      if (!rubOut) {
        drawing.current = [point];
        setLive(drawing.current);
        return;
      }
    }

    if (rubOut) {
      setStrokes((current) => eraseAround(current, point));
      return;
    }
    const next = appendPoint(drawing.current, point);
    if (next === drawing.current) return;
    drawing.current = next;
    setLive(next);
  };

  const onPointerUp = (event: PointerEvent) => {
    if (active.current !== event.nativeEvent.pointerId) return;
    active.current = null;
    rubbingOut.current = false;
    setButtonHeld(false);
    commit();
  };

  const marks = live.length > 0 ? [...strokes, live] : strokes;
  // What the pad is doing right now, which the button can override.
  const rubbingOutNow = erasing || buttonHeld;

  return (
    <View style={styles.wrapper}>
      <View
        {...responder.panHandlers}
        style={styles.paper}
        collapsable={false}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%">
            {marks.map((stroke, i) => (
              <Path
                key={i}
                d={strokePath(stroke)}
                stroke={colors.text}
                strokeWidth={INK_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
          </Svg>
        </View>
        {marks.length === 0 && (
          <Text style={styles.hint} pointerEvents="none">
            Scratch paper — {penOnly ? 'work it out with the pen' : 'work it out here'}
          </Text>
        )}
        {buttonHeld && (
          <Text style={styles.rubbingOut} pointerEvents="none">
            🧽 Rubbing out
          </Text>
        )}
        {turnedAway && (
          <Text style={styles.turnedAway} pointerEvents="none">
            ✏️ Use the pen to draw
          </Text>
        )}
      </View>

      <View style={styles.tools}>
        <Pressable
          style={[styles.tool, rubbingOutNow && styles.toolOn]}
          accessibilityRole="button"
          accessibilityState={{ selected: rubbingOutNow }}
          accessibilityLabel={rubbingOutNow ? 'Draw' : 'Eraser'}
          onPress={() => setErasing((on) => !on)}
        >
          <Text style={styles.toolIcon}>{rubbingOutNow ? '✏️' : '🧽'}</Text>
        </Pressable>
        <Pressable
          style={styles.tool}
          accessibilityRole="button"
          accessibilityLabel="Clear scratch paper"
          onPress={() => {
            active.current = null;
            drawing.current = [];
            setLive([]);
            setStrokes([]);
          }}
        >
          <Text style={styles.toolIcon}>🔄</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // flex, not a height: the blank space above the question is the paper.
  wrapper: { flex: 1, minHeight: MIN_HEIGHT, width: '100%', marginTop: 14, marginBottom: 4 },
  paper: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    overflow: 'hidden',
  },
  hint: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '45%',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  rubbingOut: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 12,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  turnedAway: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: colors.warning,
  },
  // Small and in the corner, so the paper itself is what the child sees.
  tools: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 8 },
  tool: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolOn: { backgroundColor: '#fff5d6', borderColor: '#f5b700' },
  toolIcon: { fontSize: 16 },
});
