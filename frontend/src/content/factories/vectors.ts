// GENERATED FILE — DO NOT EDIT.
// Copied from backend/src/factories by `npm run sync:shared`.
// Change the original and re-run that; edits here are overwritten.

/**
 * Known-good questions, to prove two engines agree.
 *
 * The bake runs on Node and the endless levels run on Hermes, and both are
 * generating from the same seed — so if the two engines ever disagreed about
 * a draw, a child would be marked wrong for the right answer, and nothing in
 * either test suite would notice: vitest and jest-expo both run on V8.
 *
 * mulberry32 is integer-only and divides by 2^32, which is exact, so
 * agreement is near-certain. The rows below lean on the places where it is
 * merely near-certain rather than guaranteed — `toFixed`, which is
 * specified but fiddly — and on one row per shape of question otherwise.
 *
 * These are checked in the backend's test suite, in the app's, and once more
 * behind `__DEV__` when the app boots, which is the only one of the three
 * that actually runs on a phone.
 *
 * A failure means the catalog changed. If that was intended, regenerate; if
 * it was not, something just diverged per-engine and content is not safe to
 * generate on the device until it is understood.
 */

export interface Vector {
  factory: string;
  d: number;
  seed: string;
  prompt: string;
  answer: string;
}

export const VECTORS: Vector[] = [
  {
    factory: 'decimalAddSub',
    d: 13,
    seed: 'vector/decimalAddSub@13',
    prompt: '12.9 + 57.8 = ?',
    answer: '70.7',
  },
  {
    factory: 'decimalAddSub',
    d: 14,
    seed: 'vector/decimalAddSub@14',
    prompt: '68.76 + 38.98 = ?',
    answer: '107.74',
  },
  {
    factory: 'decimalAddSub',
    d: 17,
    seed: 'vector/decimalAddSub@17',
    prompt: '25.811 + 83.859 = ?',
    answer: '109.670',
  },
  {
    factory: 'decimalMultiplication',
    d: 13,
    seed: 'vector/decimalMultiplication@13',
    prompt: '8.1 × 6 = ?',
    answer: '48.6',
  },
  {
    factory: 'decimalMultiplication',
    d: 18,
    seed: 'vector/decimalMultiplication@18',
    prompt: '5.4 × 3 = ?',
    answer: '16.2',
  },
  {
    factory: 'moneyDecimalProblem',
    d: 13,
    seed: 'vector/moneyDecimalProblem@13',
    prompt: 'One juice box costs $2.91. Ava buys 6 of them. How many dollars does Ava pay?',
    answer: '17.46',
  },
  {
    factory: 'moneyDecimalProblem',
    d: 18,
    seed: 'vector/moneyDecimalProblem@18',
    prompt: 'One apple costs $5.40. Zoe buys 5 of them. How many dollars does Zoe pay?',
    answer: '27.00',
  },
  {
    factory: 'percentProblem',
    d: 13,
    seed: 'vector/percentProblem@13',
    prompt: 'A car park has 100 spaces. 50% of them are full. How many spaces is that?',
    answer: '50',
  },
  {
    factory: 'averageProblem',
    d: 15,
    seed: 'vector/averageProblem@15',
    prompt: 'Max collected 9, 11 and 10 shells in three trips to the beach. What was the average?',
    answer: '10',
  },
  {
    factory: 'fractionAddSub',
    d: 10,
    seed: 'vector/fractionAddSub@10',
    prompt: '4/11 + 3/11 = ?',
    answer: '7/11',
  },
  {
    factory: 'largestFraction',
    d: 14,
    seed: 'vector/largestFraction@14',
    prompt: 'Which fraction is the largest?',
    answer: '6/7',
  },
  {
    factory: 'addition',
    d: 1,
    seed: 'vector/addition@1',
    prompt: '3 + 6 = ?',
    answer: '9',
  },
  {
    factory: 'addition',
    d: 8,
    seed: 'vector/addition@8',
    prompt: '222 + 633 = ?',
    answer: '855',
  },
  {
    factory: 'addition',
    d: 19,
    seed: 'vector/addition@19',
    prompt: '864889 + 66510 = ?',
    answer: '931399',
  },
  {
    factory: 'subtraction',
    d: 2,
    seed: 'vector/subtraction@2',
    prompt: '7 - 3 = ?',
    answer: '4',
  },
  {
    factory: 'subtraction',
    d: 12,
    seed: 'vector/subtraction@12',
    prompt: '4741 - 2228 = ?',
    answer: '2513',
  },
  {
    factory: 'multiplication',
    d: 7,
    seed: 'vector/multiplication@7',
    prompt: '2 × 5 = ?',
    answer: '10',
  },
  {
    factory: 'multiplication',
    d: 18,
    seed: 'vector/multiplication@18',
    prompt: '1253 × 7 = ?',
    answer: '8771',
  },
  {
    factory: 'division',
    d: 9,
    seed: 'vector/division@9',
    prompt: '120 ÷ 12 = ?',
    answer: '10',
  },
  {
    factory: 'tableMultiplication',
    d: 5,
    seed: 'vector/tableMultiplication@5',
    prompt: '4 × 6 = ?',
    answer: '24',
  },
  {
    factory: 'missingFactor',
    d: 9,
    seed: 'vector/missingFactor@9',
    prompt: '? × 5 = 55',
    answer: '11',
  },
  {
    factory: 'triangleArea',
    d: 11,
    seed: 'vector/triangleArea@11',
    prompt: 'A triangle has a base of 2 cm and a height of 8 cm. What is its area in square cm?',
    answer: '8',
  },
  {
    factory: 'cuboidVolume',
    d: 13,
    seed: 'vector/cuboidVolume@13',
    prompt: 'A box is 10 cm long, 9 cm wide and 2 cm tall. What is its volume in cubic cm?',
    answer: '180',
  },
  {
    factory: 'lengthConversion',
    d: 10,
    seed: 'vector/lengthConversion@10',
    prompt: 'How many m are there in 2 km?',
    answer: '2000',
  },
  {
    factory: 'coinTotal',
    d: 4,
    seed: 'vector/coinTotal@4',
    prompt: 'Noah has 3 25-cent coins and 1 10-cent coin. How many cents is that altogether?',
    answer: '85',
  },
  {
    factory: 'skipCount',
    d: 6,
    seed: 'vector/skipCount@6',
    prompt: 'Fill the gap: 188, ?, 194, 197, 200',
    answer: '191',
  },
  {
    factory: 'readClock',
    d: 6,
    seed: 'vector/readClock@6',
    prompt: 'What time does the clock show?',
    answer: '12:55',
  },
  {
    factory: 'distanceFromSpeedTime',
    d: 13,
    seed: 'vector/distanceFromSpeedTime@13',
    prompt: 'A ferry travels at 20 km per hour for 5 hours. How far does it go in km?',
    answer: '100',
  },
  {
    factory: 'cakeCut',
    d: 7,
    seed: 'vector/cakeCut@7',
    prompt: 'Cut the cake into exactly 6 pieces using 3 straight cuts. Drag across the cake to make each cut.',
    answer: '6 pieces',
  },
  {
    factory: 'packsProblem',
    d: 5,
    seed: 'vector/packsProblem@5',
    prompt: 'Each tray holds 4 marbles. How many marbles are in 3 trays?',
    answer: '12',
  },
];
