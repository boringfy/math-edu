/**
 * Geometry for the "cut the cake" puzzles: turning a finger drag into a
 * straight cut across a round cake, and counting how many pieces a set of
 * cuts produces.
 */

export interface Point {
  x: number;
  y: number;
}

/** A straight cut, stored as the chord it traces across the cake. */
export interface Chord {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Extends a drag into the full chord it would cut across the cake, so a
 * rough swipe still slices cleanly from edge to edge. Returns null when the
 * drag is too short to read as a cut, or when its line misses the cake.
 */
export function chordThroughDrag(
  from: Point,
  to: Point,
  center: Point,
  radius: number,
  minDrag = 12,
): Chord | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < minDrag) return null;

  const ux = dx / length;
  const uy = dy / length;
  // Solve |from + t·u - center|² = radius² for the two boundary crossings.
  const fx = from.x - center.x;
  const fy = from.y - center.y;
  const b = fx * ux + fy * uy;
  const c = fx * fx + fy * fy - radius * radius;
  const discriminant = b * b - c;
  // A tangent line (discriminant 0) grazes the edge without cutting anything.
  if (discriminant <= 0) return null;

  const root = Math.sqrt(discriminant);
  const near = -b - root;
  const far = -b + root;
  return {
    x1: from.x + near * ux,
    y1: from.y + near * uy,
    x2: from.x + far * ux,
    y2: from.y + far * uy,
  };
}

/**
 * Where two cuts cross *inside* the cake, or null. Cuts that only meet at
 * the rim don't divide anything further, so they don't count.
 */
function crossing(a: Chord, b: Chord): Point | null {
  const ax = a.x2 - a.x1;
  const ay = a.y2 - a.y1;
  const bx = b.x2 - b.x1;
  const by = b.y2 - b.y1;
  const denominator = ax * by - ay * bx;
  if (Math.abs(denominator) < 1e-9) return null; // parallel

  const qx = b.x1 - a.x1;
  const qy = b.y1 - a.y1;
  const t = (qx * by - qy * bx) / denominator;
  const u = (qx * ay - qy * ax) / denominator;
  const edge = 1e-6;
  if (t <= edge || t >= 1 - edge || u <= edge || u >= 1 - edge) return null;

  return { x: a.x1 + t * ax, y: a.y1 + t * ay };
}

/** Whether two cuts trace the same line across the cake. */
export function sameCut(a: Chord, b: Chord, tolerance: number): boolean {
  const ends = (c: Chord): [Point, Point] => [
    { x: c.x1, y: c.y1 },
    { x: c.x2, y: c.y2 },
  ];
  const [a1, a2] = ends(a);
  const [b1, b2] = ends(b);
  return (
    (distance(a1, b1) <= tolerance && distance(a2, b2) <= tolerance) ||
    (distance(a1, b2) <= tolerance && distance(a2, b1) <= tolerance)
  );
}

/**
 * How many pieces the cuts divide the cake into.
 *
 * Each new cut adds one piece, plus one more for every *distinct* point
 * where it crosses an earlier cut. That handles the interesting case for
 * free: three cuts through the middle all meet at one point, so the third
 * cut adds 2 pieces rather than 3, giving 6 slices instead of 7.
 *
 * `tolerance` is what makes the puzzle playable by finger — crossings that
 * land within it are treated as the same point, so cuts drawn roughly
 * through the middle count as meeting there.
 */
export function countPieces(cuts: Chord[], tolerance = 1e-6): number {
  let pieces = 1;
  const placed: Chord[] = [];

  for (const cut of cuts) {
    // Re-cutting along an existing slice doesn't create anything new.
    if (placed.some((other) => sameCut(other, cut, tolerance))) continue;

    const points: Point[] = [];
    for (const other of placed) {
      const point = crossing(cut, other);
      if (point && !points.some((seen) => distance(point, seen) <= tolerance)) {
        points.push(point);
      }
    }
    pieces += points.length + 1;
    placed.push(cut);
  }

  return pieces;
}
