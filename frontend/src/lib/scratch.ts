/**
 * The maths behind the scratch pad: a drawing is a list of strokes, and a
 * stroke is the list of points a finger or stylus passed through. Keeping it
 * as points rather than as a finished path is what lets the eraser take a
 * bite out of the middle of a line instead of only ever removing whole ones.
 */

export interface Point {
  x: number;
  y: number;
}

export type Stroke = Point[];

/**
 * How far a pointer has to travel before another point is kept. A stylus
 * reports far more often than a line needs, and every extra point is one more
 * segment to redraw on the next move.
 */
export const MIN_SAMPLE_DISTANCE = 1.5;

/** How close to the eraser a point has to be to be rubbed out. */
export const ERASER_RADIUS = 14;

/**
 * The pen's side button, as it arrives from Android.
 *
 * React Native hands a stylus the raw `MotionEvent.getButtonState()` rather
 * than translating it to the W3C bitmask — `PointerEventHelper.getButtons`
 * only rewrites the value for touch — so these are Android's constants, not
 * the web's.
 *
 * All four bits, because Android reports a pen's side button twice over: it
 * raises BUTTON_STYLUS_PRIMARY and, for backwards compatibility, also
 * BUTTON_SECONDARY — and likewise BUTTON_STYLUS_SECONDARY alongside
 * BUTTON_TERTIARY for the second button on a two-button pen. Which of them a
 * given tablet actually sends is not worth finding out one device at a time;
 * a child pressing the button expects it to rub out either way.
 *
 * BUTTON_PRIMARY is deliberately absent: that is the tip touching the paper,
 * which is writing, not rubbing out.
 */
const BUTTON_SECONDARY = 0x2;
const BUTTON_TERTIARY = 0x4;
const BUTTON_STYLUS_PRIMARY = 0x20;
const BUTTON_STYLUS_SECONDARY = 0x40;

export const ERASER_BUTTONS =
  BUTTON_SECONDARY | BUTTON_TERTIARY | BUTTON_STYLUS_PRIMARY | BUTTON_STYLUS_SECONDARY;

/**
 * Whether the pen's side button is being held.
 *
 * Deliberately reads the button out of each event rather than remembering it:
 * the button can go down and come up in the middle of a stroke, and a child
 * holding it expects the very next mark to rub out, not the one after.
 */
export const eraserButtonHeld = (buttons: number | null | undefined): boolean =>
  ((buttons ?? 0) & ERASER_BUTTONS) !== 0;

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** One decimal is finer than a pixel, and keeps the path strings short. */
const round = (value: number) => Math.round(value * 10) / 10;

/**
 * An SVG path for one stroke. A stroke of a single point is drawn as a line
 * back to itself, so that a dot tapped on the pad still shows up under a
 * round line cap.
 */
export function strokePath(stroke: Stroke): string {
  if (stroke.length === 0) return '';
  const [head, ...rest] = stroke;
  const start = `M ${round(head.x)} ${round(head.y)}`;
  if (rest.length === 0) return `${start} L ${round(head.x)} ${round(head.y)}`;
  return start + rest.map((p) => ` L ${round(p.x)} ${round(p.y)}`).join('');
}

/** The stroke with the point added, unless it lands on top of the last one. */
export function appendPoint(stroke: Stroke, point: Point): Stroke {
  const last = stroke[stroke.length - 1];
  if (last && distance(last, point) < MIN_SAMPLE_DISTANCE) return stroke;
  return [...stroke, point];
}

/**
 * Rubs out every point within `radius` of `at`. A stroke caught in the middle
 * comes back as the two pieces either side, which is what makes this an
 * eraser rather than a delete button. Leftover single points are dropped —
 * a speck the child can't see is a speck they can't clear — except where the
 * whole stroke was one deliberate dot.
 *
 * Returns the strokes unchanged when the eraser touched nothing, so that
 * dragging it across blank paper costs no redraw.
 */
export function eraseAround(strokes: Stroke[], at: Point, radius = ERASER_RADIUS): Stroke[] {
  const kept: Stroke[] = [];

  for (const stroke of strokes) {
    let run: Stroke = [];
    for (const point of stroke) {
      if (distance(point, at) <= radius) {
        if (run.length >= 2) kept.push(run);
        run = [];
      } else {
        run.push(point);
      }
    }
    if (run.length >= 2 || (run.length === 1 && stroke.length === 1)) kept.push(run);
  }

  const count = (list: Stroke[]) => list.reduce((total, stroke) => total + stroke.length, 0);
  return count(kept) === count(strokes) ? strokes : kept;
}
