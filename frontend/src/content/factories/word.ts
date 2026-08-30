// GENERATED FILE — DO NOT EDIT.
// Copied from backend/src/factories by `npm run sync:shared`.
// Change the original and re-run that; edits here are overwritten.

/**
 * Word problems, laid out along `d`.
 *
 * Two axes move here, and they are not the same axis. One is how big the
 * numbers get; the other is how many steps stand between the sentence and the
 * sum — and the second is what actually makes a word problem hard. So the
 * early rows widen the numbers, and the factories that need two steps simply
 * start later.
 */

import * as w from '../generators/wordProblems';
import { TABLES, factory } from './ramp';

export const joinStory = factory({
  id: 'joinStory',
  skill: 'word',
  gradeHint: [1, 2],
  ramp: [
    { d: 1, maxTotal: 10 },
    { d: 2, maxTotal: 20 },
    { d: 4, maxTotal: 50 },
    { d: 5, maxTotal: 100 },
    { d: 6, maxTotal: 200 },
    { d: 8, maxTotal: 999 },
  ],
  build: ({ maxTotal }, rng) => w.joinStory(maxTotal, rng),
});

export const takeAwayStory = factory({
  id: 'takeAwayStory',
  skill: 'word',
  gradeHint: [1, 2],
  ramp: [
    { d: 1, maxStart: 10 },
    { d: 2, maxStart: 20 },
    { d: 4, maxStart: 50 },
    { d: 5, maxStart: 100 },
    { d: 6, maxStart: 200 },
    { d: 8, maxStart: 999 },
  ],
  build: ({ maxStart }, rng) => w.takeAwayStory(maxStart, rng),
});

export const gaveSomeAwayStory = factory({
  id: 'gaveSomeAwayStory',
  skill: 'word',
  gradeHint: [1, 2],
  ramp: [
    { d: 1, maxStart: 10 },
    { d: 2, maxStart: 20 },
    { d: 4, maxStart: 50 },
    { d: 5, maxStart: 100 },
    { d: 6, maxStart: 200 },
    { d: 8, maxStart: 999 },
  ],
  build: ({ maxStart }, rng) => w.gaveSomeAwayStory(maxStart, rng),
});

export const receivedSomeStory = factory({
  id: 'receivedSomeStory',
  skill: 'word',
  gradeHint: [1, 2],
  ramp: [
    { d: 1, maxTotal: 10 },
    { d: 2, maxTotal: 20 },
    { d: 5, maxTotal: 100 },
    { d: 8, maxTotal: 999 },
  ],
  build: ({ maxTotal }, rng) => w.receivedSomeStory(maxTotal, rng),
});

/** "How many more does she need?" — a subtraction hiding behind a comparison. */
export const howManyMoreNeeded = factory({
  id: 'howManyMoreNeeded',
  skill: 'word',
  gradeHint: [2, 3],
  ramp: [
    { d: 4, maxTarget: 50 },
    { d: 5, maxTarget: 100 },
    { d: 6, maxTarget: 200 },
    { d: 8, maxTarget: 500 },
    { d: 11, maxTarget: 2000 },
  ],
  build: ({ maxTarget }, rng) => w.howManyMoreNeeded(maxTarget, rng),
});

/** Counting legs is multiplication a child can check by drawing. */
export const legsProblem = factory({
  id: 'legsProblem',
  skill: 'word',
  gradeHint: [1, 3],
  ramp: [
    { d: 1, maxAnswer: 10 },
    { d: 2, maxAnswer: 20 },
    { d: 4, maxAnswer: 24 },
    { d: 5, maxAnswer: 48 },
    { d: 7, maxAnswer: 96 },
    { d: 10, maxAnswer: 200 },
  ],
  build: ({ maxAnswer }, rng) => w.legsProblem(maxAnswer, rng),
});

export const wheelsProblem = factory({
  id: 'wheelsProblem',
  skill: 'word',
  gradeHint: [1, 3],
  ramp: [
    { d: 2, maxAnswer: 20 },
    { d: 4, maxAnswer: 24 },
    { d: 5, maxAnswer: 48 },
    { d: 7, maxAnswer: 96 },
    { d: 10, maxAnswer: 200 },
  ],
  build: ({ maxAnswer }, rng) => w.wheelsProblem(maxAnswer, rng),
});

export const packsProblem = factory({
  id: 'packsProblem',
  skill: 'word',
  gradeHint: [2, 3],
  ramp: [
    // Which group size you multiply by is the harder axis; how many groups
    // there are only makes the number bigger. So the tables widen first.
    { d: 4, maxGroups: 5, perGroup: TABLES.easy },
    { d: 5, maxGroups: 10, perGroup: TABLES.core },
    { d: 6, maxGroups: 10, perGroup: TABLES.wide },
    { d: 8, maxGroups: 12, perGroup: TABLES.wide },
    { d: 9, maxGroups: 12, perGroup: TABLES.all },
  ],
  build: ({ maxGroups, perGroup }, rng) => w.packsProblem(maxGroups, [...perGroup], rng),
});

export const shareEquallyProblem = factory({
  id: 'shareEquallyProblem',
  skill: 'word',
  gradeHint: [3, 4],
  ramp: [
    { d: 7, maxGroups: 5, maxEach: 5 },
    { d: 8, maxGroups: 10, maxEach: 10 },
    { d: 9, maxGroups: 12, maxEach: 12 },
    { d: 12, maxGroups: 12, maxEach: 20 },
  ],
  build: ({ maxGroups, maxEach }, rng) => w.shareEquallyProblem(maxGroups, maxEach, rng),
});

export const weekDaysProblem = factory({
  id: 'weekDaysProblem',
  skill: 'word',
  gradeHint: [3, 3],
  ramp: [
    { d: 7, maxWeeks: 5 },
    { d: 8, maxWeeks: 12 },
    { d: 11, maxWeeks: 52 },
  ],
  build: ({ maxWeeks }, rng) => w.weekDaysProblem(maxWeeks, rng),
});

export const coinsProblem = factory({
  id: 'coinsProblem',
  skill: 'word',
  gradeHint: [3, 3],
  ramp: [
    { d: 7, maxPrice: 9, maxCount: 5 },
    { d: 8, maxPrice: 25, maxCount: 10 },
    { d: 9, maxPrice: 25, maxCount: 12 },
    { d: 12, maxPrice: 50, maxCount: 12 },
  ],
  build: ({ maxPrice, maxCount }, rng) => w.coinsProblem(maxPrice, maxCount, rng),
});

/** Buy several, pay with a note, work out the change: two steps, not one. */
export const changeProblem = factory({
  id: 'changeProblem',
  skill: 'word',
  gradeHint: [4, 5],
  ramp: [
    { d: 10, maxPrice: 5, maxCount: 4 },
    { d: 11, maxPrice: 12, maxCount: 8 },
    { d: 14, maxPrice: 20, maxCount: 9 },
    { d: 22, maxPrice: 99, maxCount: 20 },
  ],
  build: ({ maxPrice, maxCount }, rng) => w.changeProblem(maxPrice, maxCount, rng),
});

/** Division that has to be rounded up, because you cannot run half a bus. */
export const busesProblem = factory({
  id: 'busesProblem',
  skill: 'word',
  gradeHint: [4, 4],
  ramp: [{ d: 10 }, { d: 16 }],
  build: (_args, rng) => w.busesProblem(rng),
});

export const rectangleArea = factory({
  id: 'rectangleArea',
  skill: 'word',
  gradeHint: [4, 5],
  ramp: [
    { d: 10, maxSide: 9 },
    { d: 11, maxSide: 20 },
    { d: 15, maxSide: 40 },
  ],
  build: ({ maxSide }, rng) => w.rectangleProblem('area', maxSide, rng),
});

export const rectanglePerimeter = factory({
  id: 'rectanglePerimeter',
  skill: 'word',
  gradeHint: [4, 5],
  ramp: [
    { d: 10, maxSide: 9 },
    { d: 11, maxSide: 20 },
    { d: 15, maxSide: 40 },
  ],
  build: ({ maxSide }, rng) => w.rectangleProblem('perimeter', maxSide, rng),
});

export const fractionOfSetProblem = factory({
  id: 'fractionOfSetProblem',
  skill: 'word',
  gradeHint: [4, 5],
  ramp: [{ d: 11 }, { d: 17 }],
  build: (_args, rng) => w.fractionOfSetProblem(rng),
});

export const moneyDecimalProblem = factory({
  id: 'moneyDecimalProblem',
  skill: 'word',
  gradeHint: [5, 5],
  ramp: [{ d: 13 }, { d: 22 }],
  build: (_args, rng) => w.moneyDecimalProblem(rng),
});

export const percentProblem = factory({
  id: 'percentProblem',
  skill: 'word',
  gradeHint: [5, 5],
  ramp: [{ d: 13 }, { d: 24 }],
  build: (_args, rng) => w.percentProblem(rng),
});

export const averageProblem = factory({
  id: 'averageProblem',
  skill: 'word',
  gradeHint: [5, 5],
  ramp: [{ d: 13 }, { d: 24 }],
  build: (_args, rng) => w.averageProblem(rng),
});

export const WORD = [
  joinStory,
  takeAwayStory,
  gaveSomeAwayStory,
  receivedSomeStory,
  howManyMoreNeeded,
  legsProblem,
  wheelsProblem,
  packsProblem,
  shareEquallyProblem,
  weekDaysProblem,
  coinsProblem,
  changeProblem,
  busesProblem,
  rectangleArea,
  rectanglePerimeter,
  fractionOfSetProblem,
  moneyDecimalProblem,
  percentProblem,
  averageProblem,
];
