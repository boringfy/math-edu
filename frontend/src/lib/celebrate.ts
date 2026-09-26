/**
 * Deciding what a correct answer earns.
 *
 * Five celebrations, three tiers of speed, and two of the tiers pick at
 * random between a pair — so a child who is doing well sees variety rather
 * than the same badge over and over, and a rare one still feels rare.
 *
 * Only *fast* correct answers are celebrated, and that is deliberate rather
 * than stingy. The quiz screen has never marked answers right or wrong while
 * a round is running, on the grounds that telling a child mid-round that they
 * got one wrong is discouraging exactly when it is least useful. Celebrating
 * every correct answer would give that away by omission — nothing happening
 * would mean "wrong". Gating on speed keeps the silence ambiguous: no
 * celebration means "not quick", which might be either.
 *
 * "Fast" cannot be one number. Twelve seconds is a long time for `7 × 8` and
 * no time at all for a cake to cut or a story to comprehend, so the yardstick
 * is per question and the tiers are fractions of it.
 */

import { Question } from '../types';

export type CelebrationKind = 'sparkle' | 'confetti' | 'stars' | 'fireworks' | 'rocket';

/** The pair each tier draws from. One entry means no choice to make. */
const TIERS: { ceiling: number; kinds: CelebrationKind[] }[] = [
  // Answered almost instantly: they knew it outright.
  { ceiling: 0.25, kinds: ['fireworks', 'rocket'] },
  // Comfortably quick.
  { ceiling: 0.5, kinds: ['confetti', 'stars'] },
  // Quicker than expected, but they had to think. Worth a nod, not a parade.
  { ceiling: 0.85, kinds: ['sparkle'] },
];

/**
 * How long this question is reckoned to take.
 *
 * A Speed Match question already carries its own limit, which is the honest
 * yardstick there. Everything else gets a figure by shape: a drawn cake needs
 * a cut made by hand, a comprehension question needs the passage read again,
 * a typed answer needs the keypad, and a tap on one of four choices is the
 * quickest thing the app ever asks for.
 */
export function expectedMs(question: Question, hasPassage: boolean): number {
  if (question.limitSeconds !== undefined) return question.limitSeconds * 1000;
  if (question.mode === 'draw') return 30_000;
  if (hasPassage) return 25_000;
  if (question.mode === 'entry') return 15_000;
  return 12_000;
}

/**
 * The celebration a correct answer has earned, or null for none.
 *
 * `pick` returns a number in [0, 1) — injected so a test can choose which of
 * a pair comes back instead of hoping.
 */
export function celebrationFor(
  elapsedMs: number,
  question: Question,
  hasPassage: boolean,
  pick: () => number = Math.random,
): CelebrationKind | null {
  // A clock that has gone backwards, or a question restored from somewhere
  // with no start time, should not hand out the top prize by accident.
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return null;

  const ratio = elapsedMs / expectedMs(question, hasPassage);
  const tier = TIERS.find((t) => ratio <= t.ceiling);
  if (!tier) return null;

  const index = Math.min(tier.kinds.length - 1, Math.floor(pick() * tier.kinds.length));
  return tier.kinds[index];
}

/* ------------------------------------------------------------- a miss -- */

/**
 * What a wrong answer gets.
 *
 * Four of them, picked at random, and all deliberately mild: a shrug, a puff
 * of dust, a ripple, a few pieces drifting down. None of them is a cross, a
 * red flash or a buzzer.
 *
 * This does change something the quiz screen was built around. It used not to
 * mark answers at all during a round, so a child was never told mid-round that
 * they had got one wrong — and marking correct answers only was kept
 * ambiguous on purpose, because a celebration that never came would otherwise
 * have said "wrong" by omission. Showing a miss gives that up knowingly. The
 * defence is the tone: the words are "Nearly" and "Close one", the sounds are
 * the quietest in the app, and nothing lingers for more than a second.
 */
export type MissKind = 'wobble' | 'puff' | 'ripple' | 'drift';

const MISSES: MissKind[] = ['wobble', 'puff', 'ripple', 'drift'];

/** Unlike a celebration this has no tiers — every wrong answer gets one. */
export function missFor(pick: () => number = Math.random): MissKind {
  return MISSES[Math.min(MISSES.length - 1, Math.floor(pick() * MISSES.length))];
}

/** The sound that goes with each. */
export const MISS_SOUND: Record<MissKind, string> = {
  wobble: 'miss-wobble',
  puff: 'miss-boop',
  ripple: 'miss-fall',
  drift: 'miss-settle',
};
