// GENERATED FILE — DO NOT EDIT.
// Copied from backend/src/factories by `npm run sync:shared`.
// Change the original and re-run that; edits here are overwritten.

/**
 * Data handling, coordinates and mass.
 *
 * The three plainest gaps the audit turned up. Data handling had no factory
 * at all — a whole strand of the curriculum with nothing in it. Coordinates
 * had none either, and are filed under `geometry` because that is what they
 * are. Mass joins length and capacity in `measurement`, which had covered two
 * thirds of the units a child is taught and left out the one they meet in a
 * kitchen.
 */

import * as coords from '../generators/coordinates';
import * as data from '../generators/dataHandling';
import * as mass from '../generators/mass';
import { factory } from './ramp';

/* ---------------------------------------------------------------- data -- */

export const chartTotal = factory({
  id: 'chartTotal',
  skill: 'data',
  gradeHint: [2, 4],
  ramp: [
    { d: 4, maxValue: 6 },
    { d: 6, maxValue: 12 },
    { d: 9, maxValue: 25 },
    { d: 14, maxValue: 60 },
  ],
  build: ({ maxValue }, rng) => data.chartTotal(maxValue, rng),
});

export const chartDifference = factory({
  id: 'chartDifference',
  skill: 'data',
  gradeHint: [2, 4],
  ramp: [
    { d: 5, maxValue: 8 },
    { d: 7, maxValue: 15 },
    { d: 11, maxValue: 40 },
    { d: 16, maxValue: 90 },
  ],
  build: ({ maxValue }, rng) => data.chartDifference(maxValue, rng),
});

export const chartReadOff = factory({
  id: 'chartReadOff',
  skill: 'data',
  gradeHint: [1, 3],
  ramp: [
    { d: 3, maxValue: 9 },
    { d: 6, maxValue: 20 },
    { d: 10, maxValue: 50 },
  ],
  build: ({ maxValue }, rng) => data.chartReadOff(maxValue, rng),
});

export const pictogram = factory({
  id: 'pictogram',
  skill: 'data',
  gradeHint: [2, 4],
  ramp: [
    { d: 6, maxSymbols: 4 },
    { d: 9, maxSymbols: 7 },
    { d: 13, maxSymbols: 12 },
  ],
  build: ({ maxSymbols }, rng) => data.pictogram(maxSymbols, rng),
});

export const averageOfSet = factory({
  id: 'averageOfSet',
  skill: 'data',
  gradeHint: [4, 5],
  ramp: [
    { d: 11, maxValue: 12 },
    { d: 14, maxValue: 30 },
    { d: 19, maxValue: 80 },
  ],
  build: ({ maxValue }, rng) => data.averageOfSet(maxValue, rng),
});

/* --------------------------------------------------------- coordinates -- */

export const namePoint = factory({
  id: 'namePoint',
  skill: 'geometry',
  gradeHint: [3, 5],
  ramp: [
    { d: 7, max: 6 },
    { d: 9, max: 10 },
    { d: 13, max: 20 },
  ],
  build: ({ max }, rng) => coords.namePoint(max, rng),
});

export const movePoint = factory({
  id: 'movePoint',
  skill: 'geometry',
  gradeHint: [4, 5],
  ramp: [
    { d: 9, max: 8 },
    { d: 12, max: 15 },
    { d: 17, max: 30 },
  ],
  build: ({ max }, rng) => coords.movePoint(max, rng),
});

export const reflectPoint = factory({
  id: 'reflectPoint',
  skill: 'geometry',
  gradeHint: [5, 5],
  ramp: [
    { d: 15, max: 8 },
    { d: 19, max: 15 },
    { d: 24, max: 25 },
  ],
  build: ({ max }, rng) => coords.reflectPoint(max, rng),
});

/* ---------------------------------------------------------------- mass -- */

export const kilogramsToGrams = factory({
  id: 'kilogramsToGrams',
  skill: 'measurement',
  gradeHint: [3, 5],
  ramp: [
    { d: 6, maxKilos: 5 },
    { d: 8, maxKilos: 12 },
    { d: 13, maxKilos: 40 },
  ],
  build: ({ maxKilos }, rng) => mass.kilogramsToGrams(maxKilos, rng),
});

export const totalMass = factory({
  id: 'totalMass',
  skill: 'measurement',
  gradeHint: [2, 4],
  ramp: [
    { d: 5, maxGrams: 90 },
    { d: 7, maxGrams: 400 },
    { d: 11, maxGrams: 900 },
  ],
  build: ({ maxGrams }, rng) => mass.totalMass(maxGrams, rng),
});

export const massDifference = factory({
  id: 'massDifference',
  skill: 'measurement',
  gradeHint: [3, 5],
  ramp: [
    { d: 7, maxGrams: 400 },
    { d: 10, maxGrams: 900 },
    { d: 15, maxGrams: 2500 },
  ],
  build: ({ maxGrams }, rng) => mass.massDifference(maxGrams, rng),
});

export const mixedMassTotal = factory({
  id: 'mixedMassTotal',
  skill: 'measurement',
  gradeHint: [4, 5],
  ramp: [
    { d: 10, maxGrams: 400 },
    { d: 13, maxGrams: 900 },
    { d: 18, maxGrams: 990 },
  ],
  build: ({ maxGrams }, rng) => mass.mixedMassTotal(maxGrams, rng),
});

export const howManyPacks = factory({
  id: 'howManyPacks',
  skill: 'measurement',
  gradeHint: [4, 5],
  ramp: [
    { d: 11, maxTotal: 3 },
    { d: 14, maxTotal: 6 },
    { d: 19, maxTotal: 12 },
  ],
  build: ({ maxTotal }, rng) => mass.howManyPacks(maxTotal, rng),
});

export const DATA_AND_SPACE = [
  chartReadOff,
  chartTotal,
  chartDifference,
  pictogram,
  averageOfSet,
  namePoint,
  movePoint,
  reflectPoint,
  kilogramsToGrams,
  totalMass,
  massDifference,
  mixedMassTotal,
  howManyPacks,
];
