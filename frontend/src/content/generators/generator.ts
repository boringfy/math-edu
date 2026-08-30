// GENERATED FILE — DO NOT EDIT.
// Copied from backend/src/generators by `npm run sync:shared`.
// Change the original and re-run that; edits here are overwritten.

import { AnswerFormat, Question } from '../contract';
import { Rng } from './rng';

export { ambient, makeRng, seed } from './rng';
export type { Rng } from './rng';

/**
 * Builds a question with 4 unique choices. Distractors are taken from the
 * pool first; if the pool runs dry (duplicates, negatives), numeric
 * near-misses fill the rest.
 *
 * `answerFormat` says which keys the number pad needs if this question is
 * asked in typed-entry mode; null means the answer only makes sense when the
 * choices are visible (e.g. "which fraction is the largest?").
 */
export function makeQuestion(
  rng: Rng,
  prompt: string,
  correct: string,
  distractorPool: string[],
  explanation: string,
  answerFormat: AnswerFormat | null,
): Question {
  const choices = new Set<string>([correct]);
  for (const d of rng.shuffle(distractorPool)) {
    if (choices.size >= 4) break;
    if (d !== '' && !choices.has(d)) choices.add(d);
  }
  const decimals = correct.includes('.') ? correct.split('.')[1].length : 0;
  let offset = 1;
  while (choices.size < 4) {
    const n = Number(correct);
    const candidate = Number.isFinite(n)
      ? (n + offset).toFixed(decimals)
      : `${correct} `.trim() + offset;
    if (!choices.has(candidate)) choices.add(candidate);
    offset++;
  }
  return {
    id: rng.nextId(),
    prompt,
    correctAnswer: correct,
    choices: rng.shuffle([...choices]),
    explanation,
    answerFormat,
    // Baked as multiple choice; the app promotes a share of these to 'entry'
    // when it deals a lesson, using the tier's `entryShare` from the rules.
    mode: 'choice',
  };
}

/** Pure — the near-misses around a numeric answer. Draws nothing. */
export const numPool = (correct: number, extras: number[] = []): string[] =>
  [correct + 1, correct - 1, correct + 2, correct - 2, correct + 10, ...extras]
    .filter((n) => n !== correct && n >= 0)
    .map(String);

export type Gen = () => Question;
