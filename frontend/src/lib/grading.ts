/**
 * Marking an answer, and the two presentation choices made at play time.
 *
 * This is everything that used to live at the bottom of `questions.ts` and
 * is NOT content: it has to work with no network, it decides nothing about
 * what a child is asked, and it must never move to the server — a device
 * that cannot mark its own quiz is a device that cannot be used on a bus.
 */

import { Question, Tier } from '../types';

const rng = () => Math.random();

/** Fisher-Yates. Presentation only — pools arrive pre-shuffled from the bake. */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Same question with the choices re-shuffled, for correction-round retries. */
export const reshuffleChoices = (q: Question): Question => ({
  ...q,
  choices: shuffle(q.choices),
});

/**
 * Promotes a share of typeable questions to typed entry, in place.
 *
 * Deliberately done here rather than in the bake: typing is harder than
 * picking, and doing it at play time means the same pooled question is
 * sometimes tapped and sometimes typed, which is free variety.
 */
export function promoteToEntry(
  questions: Question[],
  tier: Tier,
  entryShare: Record<Tier, number>,
): void {
  const typeable = questions.filter((q) => q.answerFormat !== null && q.mode !== 'draw');
  const entryCount = Math.round(typeable.length * (entryShare[tier] ?? 0));
  for (const q of shuffle(typeable).slice(0, entryCount)) {
    q.mode = 'entry';
  }
}

/** "3/4" -> 0.75, "1.50" -> 1.5. Returns null for anything unparseable. */
function parseAnswer(text: string): number | null {
  if (text === '') return null;
  const slash = text.indexOf('/');
  if (slash >= 0) {
    const numerator = Number(text.slice(0, slash));
    const denominator = Number(text.slice(slash + 1));
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
      return null;
    }
    return numerator / denominator;
  }
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/**
 * Grades a typed answer. Compares by value rather than by text, so "5" is
 * accepted for "5.0" and an equivalent fraction like "1/2" is accepted for
 * "4/8".
 */
export function isAnswerCorrect(question: Question, input: string): boolean {
  const given = input.trim();
  if (given === question.correctAnswer) return true;
  const a = parseAnswer(given);
  const b = parseAnswer(question.correctAnswer);
  return a !== null && b !== null && Math.abs(a - b) < 1e-9;
}

/** Grades a drawing puzzle: did the cuts produce exactly the target pieces? */
export const isDrawingCorrect = (question: Question, pieces: number): boolean =>
  question.cakeTask !== undefined && pieces === question.cakeTask.pieces;

/**
 * Adaptive difficulty: too many mistakes (accuracy < 50%) steps the tier
 * down; near-perfect (>= 90%) steps it up.
 */
export function adjustTier(tier: Tier, accuracy: number): Tier {
  if (accuracy < 0.5) return Math.max(1, tier - 1) as Tier;
  if (accuracy >= 0.9) return Math.min(3, tier + 1) as Tier;
  return tier;
}
