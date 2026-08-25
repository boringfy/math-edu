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
