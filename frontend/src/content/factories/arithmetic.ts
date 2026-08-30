// GENERATED FILE — DO NOT EDIT.
// Copied from backend/src/factories by `npm run sync:shared`.
// Change the original and re-run that; edits here are overwritten.

/**
 * Arithmetic, laid out along `d`.
 *
 * The rows below start from what the old (grade, tier) grid asked for, with
 * its two backwards steps straightened out — it wanted sums to 500 at grade 4
 * tier 1 having already asked for 1000 at grade 3 tier 2 — and then carry on
 * past d 15, where the authored curriculum stops and nothing had an opinion
 * before now.
 */

import * as q from '../generators/questions';
import { Ramp, TABLES, factory } from './ramp';

export const addition = factory({
  id: 'addition',
  skill: 'addSub',
  gradeHint: [1, 5],
  ramp: [
    { d: 1, maxSum: 10 }, // single digits, nothing to carry
    { d: 2, maxSum: 20 }, // crossing ten for the first time
    { d: 4, maxSum: 50 },
    { d: 5, maxSum: 100 },
    { d: 6, maxSum: 200 },
    { d: 7, maxSum: 300 }, // three digits
    { d: 8, maxSum: 1000 },
    { d: 10, maxSum: 2000 },
    { d: 12, maxSum: 9999 }, // four digits — the top of the old curriculum
    { d: 16, maxSum: 99_999 },
    { d: 19, maxSum: 999_999 },
    { d: 23, maxSum: 9_999_999 },
  ],
  build: ({ maxSum }, rng) => q.addition(maxSum, rng),
});

export const subtraction = factory({
  id: 'subtraction',
  skill: 'addSub',
  gradeHint: [1, 5],
  ramp: [
    { d: 1, max: 10 },
    { d: 2, max: 20 },
    { d: 4, max: 50 },
    { d: 5, max: 100 },
    { d: 6, max: 200 },
    { d: 7, max: 300 },
    { d: 8, max: 1000 },
    { d: 10, max: 2000 },
    { d: 12, max: 9999 },
    { d: 16, max: 99_999 },
    { d: 19, max: 999_999 },
    { d: 23, max: 9_999_999 },
  ],
  build: ({ max }, rng) => q.subtraction(max, rng),
});

/** "? + 3 = 10" — harder than the plain sum, because it runs backwards. */
export const missingAddend = factory({
  id: 'missingAddend',
  skill: 'addSub',
  gradeHint: [1, 4],
  ramp: [
    { d: 1, maxSum: 10 },
    { d: 2, maxSum: 20 },
    { d: 4, maxSum: 50 },
    { d: 5, maxSum: 100 },
    { d: 6, maxSum: 200 },
    { d: 8, maxSum: 1000 },
    { d: 10, maxSum: 2000 },
    { d: 12, maxSum: 9999 },
    { d: 16, maxSum: 99_999 },
    { d: 21, maxSum: 999_999 },
  ],
  build: ({ maxSum }, rng) => q.missingAddend(maxSum, rng),
});

export const missingSubtractionPart = factory({
  id: 'missingSubtractionPart',
  skill: 'addSub',
  gradeHint: [1, 5],
  ramp: [
    { d: 1, max: 10 },
    { d: 2, max: 20 },
    { d: 4, max: 50 },
    { d: 5, max: 100 },
    { d: 6, max: 200 },
    { d: 8, max: 1000 },
    { d: 10, max: 2000 },
    { d: 12, max: 9999 },
    { d: 16, max: 99_999 },
    { d: 21, max: 999_999 },
  ],
  build: ({ max }, rng) => q.missingSubtractionPart(max, rng),
});

/** Three at once: the first question that needs a running total. */
export const tripleAddition = factory({
  id: 'tripleAddition',
  skill: 'addSub',
  gradeHint: [1, 3],
  ramp: [
    { d: 3, maxEach: 9 },
    { d: 5, maxEach: 20 },
    { d: 7, maxEach: 50 },
    { d: 9, maxEach: 99 },
    { d: 13, maxEach: 999 },
    { d: 18, maxEach: 9999 },
  ],
  build: ({ maxEach }, rng) => q.tripleAddition(maxEach, rng),
});

// ------------------------------------------------------------- times and share

export const tableMultiplication = factory({
  id: 'tableMultiplication',
  skill: 'mulDiv',
  gradeHint: [2, 4],
  ramp: [
    { d: 4, tables: TABLES.easy, maxOther: 10 }, // the three you can chant
    { d: 5, tables: TABLES.core, maxOther: 10 }, // 3s and 4s join
    { d: 6, tables: TABLES.wide, maxOther: 10 }, // 6s join
    { d: 7, tables: TABLES.most, maxOther: 10 }, // 7, 8, 9 — the hard middle
    { d: 9, tables: TABLES.all, maxOther: 12 }, // the whole 12x12 square
  ],
  build: ({ tables, maxOther }, rng) => q.tableMultiplication([...tables], maxOther, rng),
});

export const tableDivision = factory({
  id: 'tableDivision',
  skill: 'mulDiv',
  gradeHint: [2, 4],
  ramp: [
    { d: 4, tables: TABLES.easy, maxQuotient: 5 },
    { d: 5, tables: TABLES.core, maxQuotient: 10 },
    { d: 6, tables: TABLES.wide, maxQuotient: 10 },
    { d: 7, tables: TABLES.most, maxQuotient: 10 },
    { d: 9, tables: TABLES.all, maxQuotient: 12 },
  ],
  build: ({ tables, maxQuotient }, rng) => q.tableDivision([...tables], maxQuotient, rng),
});

/** Doubling and halving — the first x2 and /2 done in the head. */
export const doubleOrHalf = factory({
  id: 'doubleOrHalf',
  skill: 'mulDiv',
  gradeHint: [2, 3],
  ramp: [
    { d: 4, max: 20 },
    { d: 5, max: 50 },
    { d: 7, max: 100 },
    { d: 9, max: 500 },
    { d: 13, max: 2000 },
  ],
  build: ({ max }, rng) => q.doubleOrHalf(max, rng),
});

/**
 * Multiplication drawn as a rectangle of dots. It stops early on purpose:
 * once a child multiplies without counting, a bigger picture teaches nothing
 * and just takes longer to count.
 */
export const dotArray = factory({
  id: 'dotArray',
  skill: 'mulDiv',
  gradeHint: [2, 2],
  ramp: [
    { d: 4, maxRows: 4, maxColumns: 5 },
    { d: 5, maxRows: 5, maxColumns: 6 },
    { d: 6, maxRows: 6, maxColumns: 8 },
  ],
  build: ({ maxRows, maxColumns }, rng) => q.dotArray(maxRows, maxColumns, rng),
});

/** The question that says out loud what x means. Same reason it stops early. */
export const repeatedAddition = factory({
  id: 'repeatedAddition',
  skill: 'mulDiv',
  gradeHint: [2, 2],
  ramp: [
    { d: 4, tables: TABLES.easy, maxTimes: 3 },
    { d: 5, tables: TABLES.core, maxTimes: 5 },
    { d: 6, tables: TABLES.wide, maxTimes: 5 },
    { d: 7, tables: TABLES.most, maxTimes: 6 },
  ],
  build: ({ tables, maxTimes }, rng) => q.repeatedAddition([...tables], maxTimes, rng),
});

export const multiplication = factory({
  id: 'multiplication',
  skill: 'mulDiv',
  gradeHint: [3, 5],
  ramp: [
    { d: 7, a: [2, 5], b: [2, 5] },
    { d: 8, a: [2, 10], b: [2, 10] },
    { d: 9, a: [2, 12], b: [2, 12] },
    { d: 10, a: [11, 49], b: [2, 9] }, // two digits by one
    { d: 11, a: [11, 99], b: [2, 9] },
    { d: 13, a: [11, 99], b: [2, 12] },
    { d: 14, a: [101, 999], b: [2, 9] }, // three digits by one
    { d: 16, a: [101, 999], b: [2, 12] },
    { d: 18, a: [111, 9999], b: [2, 12] },
    { d: 22, a: [111, 9999], b: [11, 99] },
    { d: 26, a: [1111, 99_999], b: [11, 99] },
  ] as Ramp<{ a: [number, number]; b: [number, number] }>,
  build: ({ a, b }, rng) => q.multiplication(a, b, rng),
});

export const division = factory({
  id: 'division',
  skill: 'mulDiv',
  gradeHint: [3, 5],
  ramp: [
    { d: 7, divisorMax: 5, quotientMax: 5 },
    { d: 8, divisorMax: 10, quotientMax: 10 },
    { d: 9, divisorMax: 12, quotientMax: 12 },
    { d: 10, divisorMax: 9, quotientMax: 20 },
    { d: 11, divisorMax: 9, quotientMax: 99 },
    { d: 13, divisorMax: 12, quotientMax: 99 },
    { d: 16, divisorMax: 20, quotientMax: 199 },
    { d: 20, divisorMax: 50, quotientMax: 999 },
    { d: 24, divisorMax: 99, quotientMax: 9999 },
  ],
  build: ({ divisorMax, quotientMax }, rng) => q.division(divisorMax, quotientMax, rng),
});

/** "6 x ? = 42" — the product and one factor are known. */
export const missingFactor = factory({
  id: 'missingFactor',
  skill: 'mulDiv',
  gradeHint: [2, 5],
  ramp: [
    { d: 5, maxFactor: 5 },
    { d: 8, maxFactor: 10 },
    { d: 9, maxFactor: 12 },
    { d: 12, maxFactor: 20 },
    { d: 15, maxFactor: 50 },
    { d: 20, maxFactor: 99 },
    { d: 24, maxFactor: 999 },
  ],
  build: ({ maxFactor }, rng) => q.missingFactor(maxFactor, rng),
});

/** "? / 3 = 5" and "24 / ? = 6". */
export const missingDivisionPart = factory({
  id: 'missingDivisionPart',
  skill: 'mulDiv',
  gradeHint: [3, 5],
  ramp: [
    { d: 7, divisorMax: 5, quotientMax: 5 },
    { d: 8, divisorMax: 10, quotientMax: 10 },
    { d: 9, divisorMax: 12, quotientMax: 12 },
    { d: 10, divisorMax: 9, quotientMax: 20 },
    { d: 11, divisorMax: 9, quotientMax: 50 },
    { d: 13, divisorMax: 12, quotientMax: 50 },
    { d: 16, divisorMax: 20, quotientMax: 99 },
    { d: 20, divisorMax: 50, quotientMax: 499 },
    { d: 24, divisorMax: 99, quotientMax: 999 },
  ],
  build: ({ divisorMax, quotientMax }, rng) => q.missingDivisionPart(divisorMax, quotientMax, rng),
});

// ------------------------------------------------------------------- fractions

/**
 * Denominators are chosen inside the generator, so there is no knob to turn.
 * The two rows say where it is worth asking, not how it changes.
 */
export const fractionAddSub = factory({
  id: 'fractionAddSub',
  skill: 'fractions',
  gradeHint: [4, 5],
  ramp: [{ d: 10 }, { d: 26 }],
  build: (_args, rng) => q.fractionAddSub(rng),
});

export const largestFraction = factory({
  id: 'largestFraction',
  skill: 'fractions',
  gradeHint: [5, 5],
  ramp: [{ d: 12 }, { d: 24 }],
  build: (_args, rng) => q.largestFraction(rng),
});

// -------------------------------------------------------------------- decimals

export const decimalAddSub = factory({
  id: 'decimalAddSub',
  skill: 'decimals',
  gradeHint: [5, 5],
  ramp: [
    { d: 13, decimals: 1 }, // tenths
    { d: 14, decimals: 2 }, // hundredths
    { d: 17, decimals: 3 },
    { d: 22, decimals: 4 },
  ],
  build: ({ decimals }, rng) => q.decimalAddSub(decimals, rng),
});

export const decimalMultiplication = factory({
  id: 'decimalMultiplication',
  skill: 'decimals',
  gradeHint: [5, 5],
  ramp: [{ d: 13 }, { d: 26 }],
  build: (_args, rng) => q.decimalMultiplication(rng),
});

// ----------------------------------------------------------------------- order

/**
 * Brackets are the difficulty here, so they are a ramp row rather than a
 * second factory: below d 14 the question is "multiply before you add", and
 * above it the brackets are there to overrule that.
 */
export const orderOfOperations = factory({
  id: 'orderOfOperations',
  skill: 'order',
  gradeHint: [5, 5],
  ramp: [
    { d: 13, withParens: false },
    { d: 14, withParens: true },
    { d: 26, withParens: true },
  ],
  build: ({ withParens }, rng) => q.orderOfOperations(withParens, rng),
});

export const ARITHMETIC = [
  addition,
  subtraction,
  missingAddend,
  missingSubtractionPart,
  tripleAddition,
  tableMultiplication,
  tableDivision,
  doubleOrHalf,
  dotArray,
  repeatedAddition,
  multiplication,
  division,
  missingFactor,
  missingDivisionPart,
  fractionAddSub,
  largestFraction,
  decimalAddSub,
  decimalMultiplication,
  orderOfOperations,
];
