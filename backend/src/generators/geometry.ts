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

/* ------------------------------------------------ more shape and space -- */

/**
 * Naming a shape from its side count — `sidesOfShape` the other way round.
 *
 * Recognising "five sides" as a pentagon is a different act from recalling
 * how many sides a pentagon has, and a child who can do the second does not
 * always manage the first.
 */
export function shapeFromSides(rng: Rng): Question {
  const named = [
    { name: 'triangle', sides: 3 },
    { name: 'square', sides: 4 },
    { name: 'pentagon', sides: 5 },
    { name: 'hexagon', sides: 6 },
    { name: 'octagon', sides: 8 },
  ];
  const shape = rng.pick(named);
  return makeQuestion(
    rng,
    `A flat shape has ${shape.sides} straight sides. What is it called?`,
    shape.name,
    named.filter((s) => s.name !== shape.name).map((s) => s.name),
    `${shape.sides} sides makes ${article(shape.name)} ${shape.name}`,
    null,
  );
}

const RIGHT_ANGLES = [
  { name: 'square', corners: 4 },
  { name: 'rectangle', corners: 4 },
  { name: 'right-angled triangle', corners: 1 },
  { name: 'regular pentagon', corners: 0 },
  { name: 'circle', corners: 0 },
];

export function rightAnglesInShape(rng: Rng): Question {
  const shape = rng.pick(RIGHT_ANGLES);
  return makeQuestion(
    rng,
    `How many right angles does ${article(shape.name)} ${shape.name} have?`,
    String(shape.corners),
    numPool(shape.corners, [shape.corners + 1, shape.corners + 2, Math.max(0, shape.corners - 1)]),
    shape.corners === 0
      ? `${article(shape.name)} ${shape.name} has no square corners at all`
      : `${article(shape.name)} ${shape.name} has ${shape.corners} square corner${shape.corners === 1 ? '' : 's'}`,
    'integer',
  );
}

const SYMMETRY = [
  { name: 'square', lines: 4 },
  { name: 'rectangle', lines: 2 },
  { name: 'equilateral triangle', lines: 3 },
  { name: 'regular pentagon', lines: 5 },
  { name: 'regular hexagon', lines: 6 },
  { name: 'parallelogram', lines: 0 },
];

export function linesOfSymmetry(rng: Rng): Question {
  const shape = rng.pick(SYMMETRY);
  return makeQuestion(
    rng,
    `How many lines of symmetry does ${article(shape.name)} ${shape.name} have?`,
    String(shape.lines),
    numPool(shape.lines, [shape.lines + 1, shape.lines + 2, Math.max(0, shape.lines - 2)]),
    shape.lines === 0
      ? `A parallelogram cannot be folded onto itself at all — it has none`
      : `It can be folded onto itself ${shape.lines} different way${shape.lines === 1 ? '' : 's'}`,
    'integer',
  );
}

const SOLIDS = [
  { name: 'cube', faces: 6, edges: 12, vertices: 8 },
  { name: 'cuboid', faces: 6, edges: 12, vertices: 8 },
  { name: 'square-based pyramid', faces: 5, edges: 8, vertices: 5 },
  { name: 'triangular prism', faces: 5, edges: 9, vertices: 6 },
  { name: 'cylinder', faces: 3, edges: 2, vertices: 0 },
];

/** Faces, edges or corners of a solid — the part of shape work that is 3D. */
export function facesEdgesVertices(rng: Rng): Question {
  const solid = rng.pick(SOLIDS);
  const part = rng.pick(['faces', 'edges', 'vertices'] as const);
  const count = solid[part];
  const word = part === 'vertices' ? 'vertices (corners)' : part;
  return makeQuestion(
    rng,
    `How many ${word} does ${article(solid.name)} ${solid.name} have?`,
    String(count),
    // The other two counts of the same solid are the honest confusions.
    numPool(count, [solid.faces, solid.edges, solid.vertices, count + 2].filter((n) => n !== count)),
    `${article(solid.name)} ${solid.name} has ${count} ${word}`,
    'integer',
  );
}

export function rectanglePerimeter(maxSide: number, rng: Rng): Question {
  // Never square: that is `squarePerimeter`'s question, and a child who
  // spots two equal sides stops reading. Ordered so the longer side is the
  // one called "long", because "5 cm long and 35 cm wide" reads as a mistake.
  const a = rng.randInt(2, maxSide);
  let b = rng.randInt(2, maxSide);
  if (a === b) b = b === maxSide ? b - 1 : b + 1;
  const length = Math.max(a, b);
  const width = Math.min(a, b);
  const perimeter = 2 * (length + width);
  return makeQuestion(
    rng,
    `A rectangle is ${length} cm long and ${width} cm wide. What is its perimeter in cm?`,
    String(perimeter),
    // Adding only two sides, the area, and doubling just one side.
    numPool(perimeter, [length + width, length * width, length * 2 + width]),
    `Two lengths and two widths: 2 × (${length} + ${width}) = ${perimeter} cm`,
    'integer',
  );
}

export function rectangleArea(maxSide: number, rng: Rng): Question {
  const a = rng.randInt(2, maxSide);
  let b = rng.randInt(2, maxSide);
  if (a === b) b = b === maxSide ? b - 1 : b + 1;
  const length = Math.max(a, b);
  const width = Math.min(a, b);
  const area = length * width;
  return makeQuestion(
    rng,
    `A rectangle is ${length} cm long and ${width} cm wide. What is its area in square cm?`,
    String(area),
    // The perimeter, and the two ways of adding rather than multiplying.
    numPool(area, [2 * (length + width), length + width, area + length]),
    `Length times width: ${length} × ${width} = ${area} square cm`,
    'integer',
  );
}

/**
 * A perimeter and one side, working backwards to the other.
 *
 * Reversing a formula is a step up from applying it, and it is where a child
 * who has memorised "times four" rather than understood it comes unstuck.
 */
export function missingSideFromPerimeter(maxSide: number, rng: Rng): Question {
  const a = rng.randInt(2, maxSide);
  let b = rng.randInt(2, maxSide);
  if (a === b) b = b === maxSide ? b - 1 : b + 1;
  const length = Math.max(a, b);
  const width = Math.min(a, b);
  const perimeter = 2 * (length + width);
  return makeQuestion(
    rng,
    `A rectangle has a perimeter of ${perimeter} cm. It is ${length} cm long. How wide is it in cm?`,
    String(width),
    // Halving once too few or too many times, and subtracting straight off.
    numPool(width, [perimeter - length, perimeter / 2 - length + 1, length]),
    `Half the perimeter is ${perimeter / 2}, and ${perimeter / 2} − ${length} = ${width} cm`,
    'integer',
  );
}

export function angleAroundPoint(rng: Rng): Question {
  // The two given angles are drawn large enough that the third stays an
  // ordinary angle. A reflex answer like 247° is arithmetically right and
  // pedagogically useless at the age this is set.
  const missing = rng.randInt(30, 160);
  const rest = 360 - missing;
  const a = rng.randInt(Math.max(20, rest - 170), Math.min(170, rest - 20));
  const b = rest - a;
  return makeQuestion(
    rng,
    `Three angles meet at a point. Two of them are ${a}° and ${b}°. What is the third?`,
    String(missing),
    // Using 180 instead of 360, and forgetting one of the two given angles.
    numPool(missing, [180 - a, 360 - a, missing + 10]),
    `Angles round a point make 360°: 360 − ${a} − ${b} = ${missing}°`,
    'integer',
  );
}

export function circleCircumference(rng: Rng): Question {
  // Radii chosen so the answer stays a whole number of centimetres with π
  // taken as 3, which is how this is taught before calculators appear.
  const radius = rng.randInt(2, 20);
  const circumference = 2 * 3 * radius;
  return makeQuestion(
    rng,
    `A circle has a radius of ${radius} cm. Taking π as 3, what is its circumference in cm?`,
    String(circumference),
    // Using the radius instead of the diameter, and the area formula.
    numPool(circumference, [3 * radius, 3 * radius * radius, 2 * radius]),
    `Circumference is π × diameter: 3 × ${2 * radius} = ${circumference} cm`,
    'integer',
  );
}

export function circleArea(rng: Rng): Question {
  const radius = rng.randInt(2, 12);
  const area = 3 * radius * radius;
  return makeQuestion(
    rng,
    `A circle has a radius of ${radius} cm. Taking π as 3, what is its area in square cm?`,
    String(area),
    // Squaring the diameter instead, and the circumference.
    numPool(area, [3 * 2 * radius, 3 * (2 * radius) * (2 * radius), radius * radius]),
    `Area is π × radius × radius: 3 × ${radius} × ${radius} = ${area} square cm`,
    'integer',
  );
}

/**
 * An L-shape, given as two rectangles.
 *
 * The first area question where the shape is not the formula: a child has to
 * split it before any formula is any use.
 */
export function compoundArea(maxSide: number, rng: Rng): Question {
  const a = rng.randInt(2, maxSide);
  const b = rng.randInt(2, maxSide);
  const c = rng.randInt(2, maxSide);
  const d = rng.randInt(2, maxSide);
  const area = a * b + c * d;
  return makeQuestion(
    rng,
    `An L-shape is made of two rectangles joined together. One is ${a} cm by ${b} cm, the other is ${c} cm by ${d} cm. What is the total area in square cm?`,
    String(area),
    // Only one of the two pieces, and adding the sides instead.
    numPool(area, [a * b, c * d, a + b + c + d]),
    `Work out each piece and add: (${a} × ${b}) + (${c} × ${d}) = ${a * b} + ${c * d} = ${area} square cm`,
    'integer',
  );
}

export function cubeSurfaceArea(maxEdge: number, rng: Rng): Question {
  const edge = rng.randInt(2, maxEdge);
  const surface = 6 * edge * edge;
  return makeQuestion(
    rng,
    `A cube has edges of ${edge} cm. What is its total surface area in square cm?`,
    String(surface),
    // The volume, one face only, and counting four faces instead of six.
    numPool(surface, [edge * edge * edge, edge * edge, 4 * edge * edge]),
    `Six identical faces: 6 × ${edge} × ${edge} = ${surface} square cm`,
    'integer',
  );
}
