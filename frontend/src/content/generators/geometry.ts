// GENERATED FILE — DO NOT EDIT.
// Copied from backend/src/generators by `npm run sync:shared`.
// Change the original and re-run that; edits here are overwritten.

import { Question } from '../contract';
import { Rng, makeQuestion, numPool } from './generator';

/** Shape, angle, area and volume questions. */

/** "a triangle" but "an octagon". */
const article = (word: string): string => (/^[aeiou]/i.test(word) ? 'an' : 'a');

const POLYGONS = [
  { name: 'triangle', sides: 3 },
  { name: 'square', sides: 4 },
  { name: 'rectangle', sides: 4 },
  { name: 'pentagon', sides: 5 },
  { name: 'hexagon', sides: 6 },
  { name: 'octagon', sides: 8 },
];

export function sidesOfShape(rng: Rng): Question {
  const shape = rng.pick(POLYGONS);
  return makeQuestion(
    rng,
    `How many sides does ${article(shape.name)} ${shape.name} have?`,
    String(shape.sides),
    // The other shapes' side counts are the natural wrong answers.
    POLYGONS.filter((p) => p.sides !== shape.sides).map((p) => String(p.sides)),
    `${article(shape.name)} ${shape.name} has ${shape.sides} sides`,
    'integer',
  );
}

export function cornersOfShape(rng: Rng): Question {
  const shape = rng.pick(POLYGONS);
  return makeQuestion(
    rng,
    `How many corners does ${article(shape.name)} ${shape.name} have?`,
    String(shape.sides),
    POLYGONS.filter((p) => p.sides !== shape.sides).map((p) => String(p.sides)),
    `${article(shape.name)} ${shape.name} has ${shape.sides} corners — the same as its number of sides`,
    'integer',
  );
}

export function squarePerimeter(maxSide: number, rng: Rng): Question {
  const side = rng.randInt(2, maxSide);
  const perimeter = side * 4;
  return makeQuestion(
    rng,
    `A square has sides of ${side} cm. What is its perimeter in cm?`,
    String(perimeter),
    // Area instead of perimeter, and adding only two sides.
    numPool(perimeter, [side * side, side * 2, side + 4]),
    `All four sides are equal: ${side} × 4 = ${perimeter} cm`,
    'integer',
  );
}

export function squareArea(maxSide: number, rng: Rng): Question {
  const side = rng.randInt(2, maxSide);
  const area = side * side;
  return makeQuestion(
    rng,
    `A square has sides of ${side} cm. What is its area in square cm?`,
    String(area),
    numPool(area, [side * 4, side * 2]),
    `Area = ${side} × ${side} = ${area} square cm`,
    'integer',
  );
}

export function triangleArea(maxBase: number, maxHeight: number, rng: Rng): Question {
  // Keep base × height even so the halved area stays a whole number.
  const base = rng.randInt(1, Math.floor(maxBase / 2)) * 2;
  const height = rng.randInt(2, maxHeight);
  const area = (base * height) / 2;
  return makeQuestion(
    rng,
    `A triangle has a base of ${base} cm and a height of ${height} cm. What is its area in square cm?`,
    String(area),
    // Forgetting to halve is the classic mistake.
    numPool(area, [base * height, base + height]),
    `Area = base × height ÷ 2 = ${base} × ${height} ÷ 2 = ${area} square cm`,
    'integer',
  );
}

export function missingAngleTriangle(rng: Rng): Question {
  const a = rng.randInt(20, 100);
  const b = rng.randInt(20, 170 - a);
  const missing = 180 - a - b;
  return makeQuestion(
    rng,
    `Two angles in a triangle are ${a}° and ${b}°. What is the third angle in degrees?`,
    String(missing),
    // Using 360 instead of 180, and stopping after one subtraction.
    numPool(missing, [360 - a - b, 180 - a, a + b]),
    `Angles in a triangle add up to 180°: 180 - ${a} - ${b} = ${missing}°`,
    'integer',
  );
}

export function missingAngleStraightLine(rng: Rng): Question {
  const known = rng.randInt(20, 160);
  const missing = 180 - known;
  return makeQuestion(
    rng,
    `Two angles sit side by side on a straight line. One is ${known}°. What is the other in degrees?`,
    String(missing),
    numPool(missing, [360 - known, 90 - known, known]),
    `Angles on a straight line add up to 180°: 180 - ${known} = ${missing}°`,
    'integer',
  );
}

export function missingAngleQuadrilateral(rng: Rng): Question {
  const a = rng.randInt(50, 120);
  const b = rng.randInt(50, 120);
  const c = rng.randInt(50, Math.max(51, 340 - a - b));
  const missing = 360 - a - b - c;
  return makeQuestion(
    rng,
    `Three angles in a quadrilateral are ${a}°, ${b}° and ${c}°. What is the fourth angle in degrees?`,
    String(missing),
    // Using 180 instead of 360 is the usual slip.
    numPool(missing, [180 - a, a + b + c, 360 - a]),
    `Angles in a quadrilateral add up to 360°: 360 - ${a} - ${b} - ${c} = ${missing}°`,
    'integer',
  );
}

export function cuboidVolume(maxEdge: number, rng: Rng): Question {
  const length = rng.randInt(2, maxEdge);
  const width = rng.randInt(2, maxEdge);
  const height = rng.randInt(2, maxEdge);
  const volume = length * width * height;
  return makeQuestion(
    rng,
    `A box is ${length} cm long, ${width} cm wide and ${height} cm tall. What is its volume in cubic cm?`,
    String(volume),
    // Adding the edges, and using only two of the three.
    numPool(volume, [length + width + height, length * width, width * height]),
    `Volume = ${length} × ${width} × ${height} = ${volume} cubic cm`,
    'integer',
  );
}

export function circleDiameter(rng: Rng): Question {
  const radius = rng.randInt(2, 30);
  const diameter = radius * 2;
  return makeQuestion(
    rng,
    `A circle has a radius of ${radius} cm. What is its diameter in cm?`,
    String(diameter),
    // Halving instead of doubling.
    numPool(diameter, [Math.round(radius / 2), radius]),
    `The diameter is twice the radius: ${radius} × 2 = ${diameter} cm`,
    'integer',
  );
}
