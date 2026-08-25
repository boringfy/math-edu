import { Grade, Question, Tier } from '../contract';
import { Gen, makeQuestion, numPool, pick, randInt } from './generator';

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

export function sidesOfShape(): Question {
  const shape = pick(POLYGONS);
  return makeQuestion(
    `How many sides does ${article(shape.name)} ${shape.name} have?`,
    String(shape.sides),
    // The other shapes' side counts are the natural wrong answers.
    POLYGONS.filter((p) => p.sides !== shape.sides).map((p) => String(p.sides)),
    `${article(shape.name)} ${shape.name} has ${shape.sides} sides`,
    'integer',
  );
}

export function cornersOfShape(): Question {
  const shape = pick(POLYGONS);
  return makeQuestion(
    `How many corners does ${article(shape.name)} ${shape.name} have?`,
    String(shape.sides),
    POLYGONS.filter((p) => p.sides !== shape.sides).map((p) => String(p.sides)),
    `${article(shape.name)} ${shape.name} has ${shape.sides} corners — the same as its number of sides`,
    'integer',
  );
}

export function squarePerimeter(maxSide: number): Question {
  const side = randInt(2, maxSide);
  const perimeter = side * 4;
  return makeQuestion(
    `A square has sides of ${side} cm. What is its perimeter in cm?`,
    String(perimeter),
    // Area instead of perimeter, and adding only two sides.
    numPool(perimeter, [side * side, side * 2, side + 4]),
    `All four sides are equal: ${side} × 4 = ${perimeter} cm`,
    'integer',
  );
}

export function squareArea(maxSide: number): Question {
  const side = randInt(2, maxSide);
  const area = side * side;
  return makeQuestion(
    `A square has sides of ${side} cm. What is its area in square cm?`,
    String(area),
    numPool(area, [side * 4, side * 2]),
    `Area = ${side} × ${side} = ${area} square cm`,
    'integer',
  );
}

export function triangleArea(maxBase: number, maxHeight: number): Question {
  // Keep base × height even so the halved area stays a whole number.
  const base = randInt(1, Math.floor(maxBase / 2)) * 2;
  const height = randInt(2, maxHeight);
  const area = (base * height) / 2;
  return makeQuestion(
    `A triangle has a base of ${base} cm and a height of ${height} cm. What is its area in square cm?`,
    String(area),
    // Forgetting to halve is the classic mistake.
    numPool(area, [base * height, base + height]),
    `Area = base × height ÷ 2 = ${base} × ${height} ÷ 2 = ${area} square cm`,
    'integer',
  );
}

export function missingAngleTriangle(): Question {
  const a = randInt(20, 100);
  const b = randInt(20, 170 - a);
  const missing = 180 - a - b;
  return makeQuestion(
    `Two angles in a triangle are ${a}° and ${b}°. What is the third angle in degrees?`,
    String(missing),
    // Using 360 instead of 180, and stopping after one subtraction.
    numPool(missing, [360 - a - b, 180 - a, a + b]),
    `Angles in a triangle add up to 180°: 180 - ${a} - ${b} = ${missing}°`,
    'integer',
  );
}

export function missingAngleStraightLine(): Question {
  const known = randInt(20, 160);
  const missing = 180 - known;
  return makeQuestion(
    `Two angles sit side by side on a straight line. One is ${known}°. What is the other in degrees?`,
    String(missing),
    numPool(missing, [360 - known, 90 - known, known]),
    `Angles on a straight line add up to 180°: 180 - ${known} = ${missing}°`,
    'integer',
  );
}

export function missingAngleQuadrilateral(): Question {
  const a = randInt(50, 120);
  const b = randInt(50, 120);
  const c = randInt(50, Math.max(51, 340 - a - b));
  const missing = 360 - a - b - c;
  return makeQuestion(
    `Three angles in a quadrilateral are ${a}°, ${b}° and ${c}°. What is the fourth angle in degrees?`,
    String(missing),
    // Using 180 instead of 360 is the usual slip.
    numPool(missing, [180 - a, a + b + c, 360 - a]),
    `Angles in a quadrilateral add up to 360°: 360 - ${a} - ${b} - ${c} = ${missing}°`,
    'integer',
  );
}

export function cuboidVolume(maxEdge: number): Question {
  const length = randInt(2, maxEdge);
  const width = randInt(2, maxEdge);
  const height = randInt(2, maxEdge);
  const volume = length * width * height;
  return makeQuestion(
    `A box is ${length} cm long, ${width} cm wide and ${height} cm tall. What is its volume in cubic cm?`,
    String(volume),
    // Adding the edges, and using only two of the three.
    numPool(volume, [length + width + height, length * width, width * height]),
    `Volume = ${length} × ${width} × ${height} = ${volume} cubic cm`,
    'integer',
  );
}

export function circleDiameter(): Question {
  const radius = randInt(2, 30);
  const diameter = radius * 2;
  return makeQuestion(
    `A circle has a radius of ${radius} cm. What is its diameter in cm?`,
    String(diameter),
    // Halving instead of doubling.
    numPool(diameter, [Math.round(radius / 2), radius]),
    `The diameter is twice the radius: ${radius} × 2 = ${diameter} cm`,
    'integer',
  );
}

/** Geometry generators for a grade at a difficulty tier. */
export function geometryFor(grade: Grade, tier: Tier): Gen[] {
  switch (grade) {
    case 1:
      return [() => sidesOfShape(), () => cornersOfShape()];
    case 2:
      return [
        () => sidesOfShape(),
        () => cornersOfShape(),
        () => squarePerimeter(tier === 1 ? 5 : 10),
      ];
    case 3:
      return [
        () => squarePerimeter(tier === 1 ? 9 : 20),
        () => squareArea(tier === 1 ? 6 : 12),
        () => sidesOfShape(),
      ];
    case 4: {
      const gens: Gen[] = [
        () => squareArea(tier === 1 ? 9 : 15),
        () => triangleArea(tier === 1 ? 8 : 16, tier === 1 ? 6 : 12),
        () => missingAngleStraightLine(),
        () => cuboidVolume(tier === 1 ? 5 : 9),
      ];
      if (tier >= 2) gens.push(() => missingAngleTriangle());
      return gens;
    }
    case 5: {
      const gens: Gen[] = [
        () => missingAngleTriangle(),
        () => triangleArea(20, 15),
        () => cuboidVolume(12),
        () => circleDiameter(),
      ];
      if (tier >= 2) gens.push(() => missingAngleQuadrilateral());
      return gens;
    }
  }
}
