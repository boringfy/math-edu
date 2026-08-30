/**
 * Geometry, measurement, money, place value, speed and time.
 *
 * These are where ceilings are honest. There is no harder way to ask how many
 * sides a hexagon has, and parity of a five-digit number is not harder than
 * parity of a two-digit one — the concept is binary either way. So several of
 * these ramps are short, and say so. `dRange` is a claim about what is still
 * worth teaching, and a composer that runs past it is told the skill is
 * capped rather than handed a bigger number to no purpose.
 */

import * as g from '../generators/geometry';
import * as m from '../generators/measurement';
import * as mo from '../generators/money';
import * as ns from '../generators/numberSense';
import * as ph from '../generators/physics';
import * as t from '../generators/time';
import { Ramp, factory } from './ramp';

// ------------------------------------------------------------------- geometry

/** Naming shapes runs out fast: there are only so many polygons worth asking. */
export const sidesOfShape = factory({
  id: 'sidesOfShape',
  skill: 'geometry',
  gradeHint: [1, 3],
  ramp: [{ d: 1 }, { d: 5 }],
  build: (_args, rng) => g.sidesOfShape(rng),
});

export const cornersOfShape = factory({
  id: 'cornersOfShape',
  skill: 'geometry',
  gradeHint: [1, 2],
  ramp: [{ d: 1 }, { d: 5 }],
  build: (_args, rng) => g.cornersOfShape(rng),
});

export const squarePerimeter = factory({
  id: 'squarePerimeter',
  skill: 'geometry',
  gradeHint: [2, 3],
  ramp: [
    { d: 4, maxSide: 5 },
    { d: 5, maxSide: 10 },
    { d: 7, maxSide: 20 },
    { d: 10, maxSide: 50 },
  ],
  build: ({ maxSide }, rng) => g.squarePerimeter(maxSide, rng),
});

export const squareArea = factory({
  id: 'squareArea',
  skill: 'geometry',
  gradeHint: [3, 4],
  ramp: [
    { d: 7, maxSide: 6 },
    { d: 8, maxSide: 12 },
    { d: 10, maxSide: 15 },
    { d: 13, maxSide: 30 },
  ],
  build: ({ maxSide }, rng) => g.squareArea(maxSide, rng),
});

export const triangleArea = factory({
  id: 'triangleArea',
  skill: 'geometry',
  gradeHint: [4, 5],
  ramp: [
    { d: 10, maxBase: 8, maxHeight: 6 },
    { d: 11, maxBase: 16, maxHeight: 12 },
    { d: 13, maxBase: 20, maxHeight: 15 },
    { d: 16, maxBase: 40, maxHeight: 30 },
  ],
  build: ({ maxBase, maxHeight }, rng) => g.triangleArea(maxBase, maxHeight, rng),
});

export const missingAngleStraightLine = factory({
  id: 'missingAngleStraightLine',
  skill: 'geometry',
  gradeHint: [4, 4],
  ramp: [{ d: 10 }, { d: 14 }],
  build: (_args, rng) => g.missingAngleStraightLine(rng),
});

export const missingAngleTriangle = factory({
  id: 'missingAngleTriangle',
  skill: 'geometry',
  gradeHint: [4, 5],
  ramp: [{ d: 11 }, { d: 16 }],
  build: (_args, rng) => g.missingAngleTriangle(rng),
});

export const missingAngleQuadrilateral = factory({
  id: 'missingAngleQuadrilateral',
  skill: 'geometry',
  gradeHint: [5, 5],
  ramp: [{ d: 14 }, { d: 18 }],
  build: (_args, rng) => g.missingAngleQuadrilateral(rng),
});

export const cuboidVolume = factory({
  id: 'cuboidVolume',
  skill: 'geometry',
  gradeHint: [4, 5],
  ramp: [
    { d: 10, maxEdge: 5 },
    { d: 11, maxEdge: 9 },
    { d: 13, maxEdge: 12 },
    { d: 16, maxEdge: 20 },
  ],
  build: ({ maxEdge }, rng) => g.cuboidVolume(maxEdge, rng),
});

export const circleDiameter = factory({
  id: 'circleDiameter',
  skill: 'geometry',
  gradeHint: [5, 5],
  ramp: [{ d: 13 }, { d: 18 }],
  build: (_args, rng) => g.circleDiameter(rng),
});

// ---------------------------------------------------------------- measurement

/** The units widen before the numbers do — km is a bigger idea than 20 is. */
export const lengthConversion = factory({
  id: 'lengthConversion',
  skill: 'measurement',
  gradeHint: [2, 5],
  ramp: [
    { d: 4, allowed: ['cm'], maxValue: 5 },
    { d: 5, allowed: ['cm'], maxValue: 9 },
    { d: 7, allowed: ['cm', 'm'], maxValue: 9 },
    { d: 10, allowed: ['cm', 'm', 'km'], maxValue: 9 },
    { d: 13, allowed: ['cm', 'm', 'km'], maxValue: 20 },
    { d: 16, allowed: ['cm', 'm', 'km'], maxValue: 99 },
  ] as Ramp<{ allowed: string[]; maxValue: number }>,
  build: ({ allowed, maxValue }, rng) => m.lengthConversion(allowed, maxValue, rng),
});

export const totalLength = factory({
  id: 'totalLength',
  skill: 'measurement',
  gradeHint: [2, 3],
  ramp: [
    { d: 4, maxPieces: 4 },
    { d: 5, maxPieces: 6 },
    { d: 9, maxPieces: 8 },
  ],
  build: ({ maxPieces }, rng) => m.totalLength(maxPieces, rng),
});

export const mixedLengthTotal = factory({
  id: 'mixedLengthTotal',
  skill: 'measurement',
  gradeHint: [3, 4],
  ramp: [{ d: 7 }, { d: 15 }],
  build: (_args, rng) => m.mixedLengthTotal(rng),
});

export const lengthDifference = factory({
  id: 'lengthDifference',
  skill: 'measurement',
  gradeHint: [4, 5],
  ramp: [{ d: 11 }, { d: 17 }],
  build: (_args, rng) => m.lengthDifference(rng),
});

export const litresToMillilitres = factory({
  id: 'litresToMillilitres',
  skill: 'measurement',
  gradeHint: [3, 3],
  ramp: [
    { d: 7, maxLitres: 4 },
    { d: 8, maxLitres: 9 },
    { d: 12, maxLitres: 20 },
  ],
  build: ({ maxLitres }, rng) => m.litresToMillilitres(maxLitres, rng),
});

export const containerTotal = factory({
  id: 'containerTotal',
  skill: 'measurement',
  gradeHint: [4, 5],
  ramp: [{ d: 10 }, { d: 16 }],
  build: (_args, rng) => m.containerTotal(rng),
});

export const liquidLeft = factory({
  id: 'liquidLeft',
  skill: 'measurement',
  gradeHint: [4, 5],
  ramp: [{ d: 10 }, { d: 16 }],
  build: (_args, rng) => m.liquidLeft(rng),
});

export const howManyGlasses = factory({
  id: 'howManyGlasses',
  skill: 'measurement',
  gradeHint: [5, 5],
  ramp: [{ d: 13 }, { d: 18 }],
  build: (_args, rng) => m.howManyGlasses(rng),
});

// ---------------------------------------------------------------------- money

export const coinTotal = factory({
  id: 'coinTotal',
  skill: 'money',
  gradeHint: [2, 5],
  ramp: [
    { d: 4, kinds: 2 },
    { d: 10, kinds: 3 },
    { d: 16, kinds: 4 },
  ],
  build: ({ kinds }, rng) => mo.coinTotal(kinds, rng),
});

export const changeInCents = factory({
  id: 'changeInCents',
  skill: 'money',
  gradeHint: [2, 4],
  ramp: [
    { d: 4, maxPrice: 30 },
    { d: 5, maxPrice: 45 },
    { d: 7, maxPrice: 90 },
    { d: 10, maxPrice: 99 },
  ],
  build: ({ maxPrice }, rng) => mo.changeInCents(maxPrice, rng),
});

export const howManyCanBuy = factory({
  id: 'howManyCanBuy',
  skill: 'money',
  gradeHint: [3, 4],
  ramp: [
    { d: 7, maxBudget: 60 },
    { d: 8, maxBudget: 99 },
    { d: 13, maxBudget: 199 },
  ],
  build: ({ maxBudget }, rng) => mo.howManyCanBuy(maxBudget, rng),
});

export const moneyLeftOver = factory({
  id: 'moneyLeftOver',
  skill: 'money',
  gradeHint: [4, 5],
  ramp: [
    { d: 10, maxBudget: 99 },
    { d: 14, maxBudget: 199 },
  ],
  build: ({ maxBudget }, rng) => mo.moneyLeftOver(maxBudget, rng),
});

export const fewestCoins = factory({
  id: 'fewestCoins',
  skill: 'money',
  gradeHint: [4, 5],
  ramp: [
    { d: 10, maxAmount: 40 },
    { d: 11, maxAmount: 99 },
    { d: 16, maxAmount: 199 },
  ],
  build: ({ maxAmount }, rng) => mo.fewestCoins(maxAmount, rng),
});

export const howManyCanBuyDollars = factory({
  id: 'howManyCanBuyDollars',
  skill: 'money',
  gradeHint: [5, 5],
  ramp: [{ d: 13 }, { d: 18 }],
  build: (_args, rng) => mo.howManyCanBuyDollars(rng),
});

// --------------------------------------------------------------- place value

export const digitPlace = factory({
  id: 'digitPlace',
  skill: 'place',
  gradeHint: [2, 3],
  ramp: [
    { d: 4, length: 2 },
    { d: 5, length: 3 },
    { d: 8, length: 4 },
    { d: 12, length: 5 },
  ],
  build: ({ length }, rng) => ns.digitPlace(length, rng),
});

export const placeParts = factory({
  id: 'placeParts',
  skill: 'place',
  gradeHint: [2, 3],
  ramp: [
    { d: 4, length: 2 },
    { d: 5, length: 3 },
    { d: 8, length: 4 },
    { d: 12, length: 5 },
  ],
  build: ({ length }, rng) => ns.placeParts(length, rng),
});

export const expandedForm = factory({
  id: 'expandedForm',
  skill: 'place',
  gradeHint: [2, 3],
  ramp: [{ d: 5 }, { d: 11 }],
  build: (_args, rng) => ns.expandedForm(rng),
});

export const stepBy = factory({
  id: 'stepBy',
  skill: 'place',
  gradeHint: [2, 3],
  ramp: [
    { d: 4, step: 10, max: 90 },
    { d: 5, step: 10, max: 490 },
    { d: 6, step: 100, max: 899 },
    { d: 9, step: 100, max: 4999 },
    { d: 12, step: 1000, max: 9999 },
  ],
  build: ({ step, max }, rng) => ns.stepBy(step, max, rng),
});

export const skipCount = factory({
  id: 'skipCount',
  skill: 'place',
  gradeHint: [2, 3],
  ramp: [
    { d: 4, steps: [2, 5, 10], max: 60 },
    { d: 5, steps: [2, 3, 5, 10], max: 200 },
    { d: 6, steps: [3, 4, 5, 10, 25], max: 200 },
    { d: 9, steps: [6, 7, 8, 9, 25, 50], max: 900 },
  ] as Ramp<{ steps: number[]; max: number }>,
  build: ({ steps, max }, rng) => ns.skipCount(steps, max, rng),
});

/**
 * Odd and even. A five-digit number is no harder than a two-digit one — it is
 * the last digit either way — so this stops early rather than pretending.
 */
export const evenOrOdd = factory({
  id: 'evenOrOdd',
  skill: 'place',
  gradeHint: [2, 2],
  ramp: [
    { d: 4, max: 40 },
    { d: 5, max: 99 },
    { d: 6, max: 999 },
  ],
  build: ({ max }, rng) => ns.evenOrOdd(max, rng),
});

export const greatestOrSmallest = factory({
  id: 'greatestOrSmallest',
  skill: 'place',
  gradeHint: [2, 3],
  ramp: [{ d: 5 }, { d: 10 }],
  build: (_args, rng) => ns.greatestOrSmallest(rng),
});

export const roundToTen = factory({
  id: 'roundToTen',
  skill: 'place',
  gradeHint: [2, 4],
  ramp: [
    { d: 5, max: 99 },
    { d: 6, max: 199 },
    { d: 9, max: 999 },
    { d: 12, max: 9999 },
  ],
  build: ({ max }, rng) => ns.roundToTen(max, rng),
});

// ---------------------------------------------------------------------- speed

export const distanceFromSpeedTime = factory({
  id: 'distanceFromSpeedTime',
  skill: 'speed',
  gradeHint: [4, 5],
  ramp: [
    { d: 10, maxSpeed: 90, maxHours: 6 },
    { d: 13, maxSpeed: 120, maxHours: 9 },
    { d: 17, maxSpeed: 200, maxHours: 12 },
  ],
  build: ({ maxSpeed, maxHours }, rng) => ph.distanceFromSpeedTime(maxSpeed, maxHours, rng),
});

export const timeFromDistanceSpeed = factory({
  id: 'timeFromDistanceSpeed',
  skill: 'speed',
  gradeHint: [4, 5],
  ramp: [
    { d: 10, maxSpeed: 50, maxHours: 6 },
    { d: 11, maxSpeed: 90, maxHours: 6 },
    { d: 13, maxSpeed: 120, maxHours: 9 },
    { d: 17, maxSpeed: 200, maxHours: 12 },
  ],
  build: ({ maxSpeed, maxHours }, rng) => ph.timeFromDistanceSpeed(maxSpeed, maxHours, rng),
});

export const speedFromDistanceTime = factory({
  id: 'speedFromDistanceTime',
  skill: 'speed',
  gradeHint: [4, 5],
  ramp: [
    { d: 11, maxSpeed: 60, maxHours: 6 },
    { d: 13, maxSpeed: 80, maxHours: 8 },
    { d: 17, maxSpeed: 160, maxHours: 12 },
  ],
  build: ({ maxSpeed, maxHours }, rng) => ph.speedFromDistanceTime(maxSpeed, maxHours, rng),
});

export const whoIsFaster = factory({
  id: 'whoIsFaster',
  skill: 'speed',
  gradeHint: [5, 5],
  ramp: [{ d: 14 }, { d: 18 }],
  build: (_args, rng) => ph.whoIsFaster(rng),
});

// ----------------------------------------------------------------------- time

/** Half hours, then quarters, then the five-minute marks. */
export const readClock = factory({
  id: 'readClock',
  skill: 'time',
  gradeHint: [2, 3],
  ramp: [
    { d: 4, step: 30 },
    { d: 5, step: 15 },
    { d: 6, step: 5 },
    { d: 9, step: 1 },
  ],
  build: ({ step }, rng) => t.readClock(step, rng),
});

export const whichClock = factory({
  id: 'whichClock',
  skill: 'time',
  gradeHint: [2, 3],
  ramp: [
    { d: 4, step: 30 },
    { d: 5, step: 15 },
    { d: 6, step: 5 },
    { d: 9, step: 1 },
  ],
  build: ({ step }, rng) => t.whichClock(step, rng),
});

export const timeLater = factory({
  id: 'timeLater',
  skill: 'time',
  gradeHint: [2, 3],
  ramp: [
    { d: 5, step: 15 },
    { d: 6, step: 5 },
    { d: 9, step: 1 },
  ],
  build: ({ step }, rng) => t.timeLater(step, rng),
});

export const elapsedMinutes = factory({
  id: 'elapsedMinutes',
  skill: 'time',
  gradeHint: [2, 4],
  ramp: [
    { d: 5, maxSpan: 30 },
    { d: 6, maxSpan: 55 },
    { d: 9, maxSpan: 115 },
    { d: 13, maxSpan: 235 },
  ],
  build: ({ maxSpan }, rng) => t.elapsedMinutes(maxSpan, rng),
});

export const hoursToMinutes = factory({
  id: 'hoursToMinutes',
  skill: 'time',
  gradeHint: [2, 3],
  ramp: [{ d: 4 }, { d: 11 }],
  build: (_args, rng) => t.hoursToMinutes(rng),
});

export const SHAPES_AND_UNITS = [
  sidesOfShape,
  cornersOfShape,
  squarePerimeter,
  squareArea,
  triangleArea,
  missingAngleStraightLine,
  missingAngleTriangle,
  missingAngleQuadrilateral,
  cuboidVolume,
  circleDiameter,
  lengthConversion,
  totalLength,
  mixedLengthTotal,
  lengthDifference,
  litresToMillilitres,
  containerTotal,
  liquidLeft,
  howManyGlasses,
  coinTotal,
  changeInCents,
  howManyCanBuy,
  moneyLeftOver,
  fewestCoins,
  howManyCanBuyDollars,
  digitPlace,
  placeParts,
  expandedForm,
  stepBy,
  skipCount,
  evenOrOdd,
  greatestOrSmallest,
  roundToTen,
  distanceFromSpeedTime,
  timeFromDistanceSpeed,
  speedFromDistanceTime,
  whoIsFaster,
  readClock,
  whichClock,
  timeLater,
  elapsedMinutes,
  hoursToMinutes,
];
