// GENERATED FILE — DO NOT EDIT.
// Copied from backend/src/generators by `npm run sync:shared`.
// Change the original and re-run that; edits here are overwritten.

import { CakeCutTask, Question, Tier } from '../contract';
import { Rng } from './generator';

/**
 * Cut-the-cake puzzles, answered by drawing the cuts rather than picking or
 * typing a number.
 *
 * With n straight cuts a round cake can be divided into anywhere from n + 1
 * pieces (no cut crosses another) up to 1 + n + n(n-1)/2 pieces (every pair
 * crosses at its own point). The puzzle is choosing an arrangement that
 * lands on exactly the target.
 */
const CAKE_PUZZLES: Record<Tier, CakeCutTask[]> = {
  1: [
    { cuts: 2, pieces: 3, hint: 'Keep the two cuts parallel so they never cross.' },
    { cuts: 2, pieces: 4, hint: 'Let the two cuts cross each other inside the cake.' },
    { cuts: 3, pieces: 4, hint: 'Keep all three cuts parallel so none of them cross.' },
  ],
  2: [
    {
      cuts: 3,
      pieces: 6,
      hint: 'Send all three cuts through the middle, so they all meet at the same point.',
    },
    {
      cuts: 3,
      pieces: 7,
      hint: 'Make every cut cross both of the others, each at a different point.',
    },
    {
      cuts: 3,
      pieces: 5,
      hint: 'Let two cuts cross, then place the third so it misses both of them.',
    },
  ],
  3: [
    { cuts: 4, pieces: 8, hint: 'Send all four cuts through the middle of the cake.' },
    {
      cuts: 4,
      pieces: 11,
      hint: 'Make every cut cross all three others, each crossing at its own point.',
    },
    {
      cuts: 4,
      pieces: 9,
      hint: 'Three cuts through the middle give 6 pieces; add a fourth that crosses only two of them.',
    },
  ],
};

/** A drawing puzzle sized to the difficulty tier. */
export function cakeCutQuestion(tier: Tier, rng: Rng): Question {
  const task = rng.pick(CAKE_PUZZLES[tier]);
  return {
    id: rng.nextId(),
    prompt: `Cut the cake into exactly ${task.pieces} pieces using ${task.cuts} straight cuts. Drag across the cake to make each cut.`,
    correctAnswer: `${task.pieces} pieces`,
    // Drawing puzzles are solved on the cake, so there is nothing to pick.
    choices: [],
    explanation: task.hint,
    answerFormat: null,
    mode: 'draw',
    cakeTask: task,
  };
}
