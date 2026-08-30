// GENERATED FILE — DO NOT EDIT.
// Copied from backend/src/factories by `npm run sync:shared`.
// Change the original and re-run that; edits here are overwritten.

/**
 * The logic families, laid out along `d`.
 *
 * These ramp differently from the maths ones. A maths factory has a number to
 * turn — bigger sums, wider tables — so its ladder is as long as you care to
 * make it. A puzzle has three authored arrangements and no knob at all, so
 * what climbs here is *which* family a child meets, not how hard any one of
 * them gets.
 *
 * So each family starts at the `d` matching the grade that first met it in
 * `content/puzzles.ts` — drawn patterns from the beginning, because they need
 * no reading; word links once vocabulary is wide enough; deduction last — and
 * walks its three tiers from there. The top row holds the hardest tier a long
 * way up, which is honest: a rotation puzzle at d 20 is the same puzzle it was
 * at d 7, and the variety past that point comes from having thirteen families
 * in play rather than from any one of them getting harder.
 */

import { Tier } from '../contract';
import * as text from '../generators/logic/textPuzzles';
import * as visual from '../generators/logic/visualPuzzles';
import { Ramp, Skill, factory } from './ramp';

/** Three authored tiers, spread over the ladder from where the family starts. */
const tiers = (from: number, top: number): Ramp<{ tier: Tier }> => [
  { d: from, tier: 1 },
  { d: from + 3, tier: 2 },
  { d: from + 6, tier: 3 },
  { d: top, tier: 3 },
];

const puzzle = (
  id: string,
  skill: Skill,
  gradeHint: [1 | 2 | 3 | 4 | 5, 1 | 2 | 3 | 4 | 5],
  from: number,
  top: number,
  build: (tier: Tier, rng: Parameters<typeof text.numberSequence>[1]) => ReturnType<
    typeof text.numberSequence
  >,
) =>
  factory({
    id,
    subject: 'logic',
    skill,
    gradeHint,
    ramp: tiers(from, top),
    build: ({ tier }, rng) => build(tier, rng),
  });

// -------------------------------------------------- seen from the first grade

export const shapeSeries = puzzle('shapeSeries', 'series', [1, 5], 1, 20, visual.shapeSeries);
export const shapeOddOneOut = puzzle(
  'shapeOddOneOut',
  'oddShape',
  [1, 5],
  1,
  20,
  visual.shapeOddOneOut,
);
export const matrixPattern = puzzle('matrixPattern', 'matrix', [1, 5], 1, 20, visual.matrixPattern);
export const rotation = puzzle('rotation', 'rotation', [1, 5], 1, 20, visual.rotation);
export const numberSequence = puzzle(
  'numberSequence',
  'sequence',
  [1, 5],
  1,
  20,
  text.numberSequence,
);

/** No tier to turn: there is one way to ask which word is the odd one out. */
export const oddWordOut = factory({
  id: 'oddWordOut',
  subject: 'logic',
  skill: 'oddWord',
  gradeHint: [1, 5],
  ramp: [{ d: 1 }, { d: 20 }],
  build: (_args, rng) => text.oddWordOut(rng),
});

// ------------------------------------------------------- once reading is surer

export const letterSequence = puzzle(
  'letterSequence',
  'letters',
  [2, 5],
  4,
  22,
  text.letterSequence,
);
export const mirrorImage = puzzle('mirrorImage', 'mirror', [2, 5], 4, 22, visual.mirrorImage);

export const analogy = factory({
  id: 'analogy',
  subject: 'logic',
  skill: 'analogy',
  gradeHint: [2, 5],
  ramp: [{ d: 4 }, { d: 22 }],
  build: (_args, rng) => text.analogy(rng),
});

// ------------------------------------------------------------ weighing up

export const balanceScale = puzzle('balanceScale', 'balance', [3, 5], 7, 24, text.balanceScale);
export const oddNumberOut = puzzle('oddNumberOut', 'oddNumber', [3, 5], 7, 24, text.oddNumberOut);

// ------------------------------------------------- deduction, and then proof

export const logicGrid = puzzle('logicGrid', 'grid', [4, 5], 10, 26, text.logicGrid);
export const syllogism = puzzle('syllogism', 'syllogism', [5, 5], 13, 26, text.syllogism);

export const LOGIC = [
  shapeSeries,
  shapeOddOneOut,
  matrixPattern,
  rotation,
  numberSequence,
  oddWordOut,
  letterSequence,
  mirrorImage,
  analogy,
  balanceScale,
  oddNumberOut,
  logicGrid,
  syllogism,
];
