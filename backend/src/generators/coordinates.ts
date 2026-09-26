import { Question } from '../contract';
import { Rng, makeQuestion } from './generator';

/**
 * Coordinates: naming a point, moving one, and reflecting one.
 *
 * Written rather than drawn, which costs less than it sounds. The hard part
 * of coordinates at this age is not seeing the grid — it is remembering that
 * the first number goes across and the second goes up, and getting that wrong
 * is exactly what the distractors here are made of.
 *
 * First quadrant throughout, and that is a real constraint rather than a
 * simplification: reflecting into negative coordinates needs negative
 * numbers, which the catalog does not teach anywhere. So the mirror is a line
 * drawn on the grid rather than the axis itself, which asks exactly the same
 * thing — how far past the line does it land — without needing them.
 */

const point = (x: number, y: number) => `(${x}, ${y})`;

export function namePoint(max: number, rng: Rng): Question {
  const x = rng.randInt(0, max);
  const y = rng.randInt(0, max);
  // Only worth asking when the two differ: (3, 3) cannot be got backwards.
  const flipped = x === y ? point(x, y === max ? y - 1 : y + 1) : point(y, x);
  return makeQuestion(
    rng,
    `A point sits ${x} across and ${y} up from the corner of a grid.\n\nWhat are its coordinates?`,
    point(x, y),
    // Across and up swapped, and each one off by one.
    [flipped, point(x + 1, y), point(x, y + 1)],
    `Across first, then up: ${point(x, y)}`,
    null,
  );
}

export function movePoint(max: number, rng: Rng): Question {
  const x = rng.randInt(1, max);
  const y = rng.randInt(1, max);
  const right = rng.randInt(1, 4);
  const up = rng.randInt(1, 4);
  const moved = point(x + right, y + up);
  return makeQuestion(
    rng,
    `A counter is at ${point(x, y)}.\nIt moves ${right} right and ${up} up.\n\nWhere is it now?`,
    moved,
    // Moved the wrong way, moved only one of the two, and axes swapped.
    [point(x - right, y - up), point(x + right, y), point(y + up, x + right)],
    `${x} + ${right} = ${x + right} across, and ${y} + ${up} = ${y + up} up: ${moved}`,
    null,
  );
}

export function reflectPoint(max: number, rng: Rng): Question {
  const x = rng.randInt(1, max);
  const y = rng.randInt(1, max);
  const vertical = rng.next() < 0.5;

  // The mirror sits a little beyond the point, so the reflection stays on the
  // grid and every number in the question is one a child has met.
  const gap = rng.randInt(1, 5);
  const mirror = (vertical ? x : y) + gap;
  const landed = mirror + gap;

  const answer = vertical ? point(landed, y) : point(x, landed);
  const line = vertical
    ? `the up-and-down line ${mirror} across`
    : `the across line ${mirror} up`;

  return makeQuestion(
    rng,
    `A point is at ${point(x, y)}.\nIt is reflected in ${line}.\n\nWhere does it land?`,
    answer,
    // Landing on the mirror itself, moving the wrong coordinate, and moving
    // only as far as the line rather than the same distance past it.
    [
      vertical ? point(mirror, y) : point(x, mirror),
      vertical ? point(x, landed) : point(landed, y),
      vertical ? point(x - gap, y) : point(x, y - gap),
    ],
    `It is ${gap} before the line, so it lands ${gap} past it: ${answer}`,
    null,
  );
}
