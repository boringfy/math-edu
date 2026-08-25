import { AnswerFormat, Question } from '../contract';
import { nextId as nextSeededId, random } from './rng';

/** Re-exported so every generator draws from the one seeded stream. */
export { random };

export const randInt = (min: number, max: number): number =>
  Math.floor(random() * (max - min + 1)) + min;

export const pick = <T>(arr: T[]): T => arr[Math.floor(random() * arr.length)];

export const shuffle = <T>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** A fresh question id. Exported for question kinds built outside makeQuestion. */
export const nextId = nextSeededId;

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
  prompt: string,
  correct: string,
  distractorPool: string[],
  explanation: string,
  answerFormat: AnswerFormat | null,
): Question {
  const choices = new Set<string>([correct]);
  for (const d of shuffle(distractorPool)) {
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
    id: nextId(),
    prompt,
    correctAnswer: correct,
    choices: shuffle([...choices]),
    explanation,
    answerFormat,
    // generateQuiz promotes a share of these to 'entry'.
    mode: 'choice',
  };
}

export const numPool = (correct: number, extras: number[] = []): string[] =>
  [correct + 1, correct - 1, correct + 2, correct - 2, correct + 10, ...extras]
    .filter((n) => n !== correct && n >= 0)
    .map(String);

export type Gen = () => Question;
