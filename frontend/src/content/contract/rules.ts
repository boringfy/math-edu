// GENERATED FILE — DO NOT EDIT.
// Copied from backend/src/contract by `npm run sync:shared`.
// Change the original and re-run that; edits here are overwritten.

/**
 * Tunable progression numbers, shipped as content so reward balance can be
 * changed without an app release.
 *
 * The client compiles in a copy of these as its fallback (see
 * `frontend/src/lib/progress.ts`) and prefers the packed values when a
 * `rules` pack has been loaded. Nothing here decides *whether* an answer is
 * right — only what it is worth.
 */

import type { PuzzleFamily, Subject, Tier, TopicKey } from './content';

export interface CoinRates {
  correct: number;
  /** A mistake put right in the correction round still counts, at half rate. */
  fixed: number;
  comboMilestone: number;
  perfect: number;
  /** Paid once, the first time a lesson is passed. */
  firstClear: number;
}

/** What one session can contribute to the day's challenges. */
export type DayMetric =
  | 'lessonsPlayed'
  | 'lessonsCleared'
  | 'perfectLessons'
  | 'correctAnswers'
  | 'mistakesFixed'
  /** Longest correct streak, so this merges by max rather than by sum. */
  | 'bestCombo'
  | 'coinsEarned';

export interface ChallengeDef {
  id: string;
  title: string;
  icon: string;
  target: number;
  /** Coins paid the moment the target is reached. */
  reward: number;
  metric: DayMetric;
  /** 'max' for streaks, where a longer run replaces rather than adds to it. */
  mode: 'sum' | 'max';
}

/** Percent thresholds for 3, 2 and 1 stars. One star is a pass. */
export interface StarThresholds {
  three: number;
  two: number;
  one: number;
}

/**
 * How free practice adapts between rounds. The client owns the algorithm —
 * these are only its numbers, so a threshold that turns out too eager can be
 * softened without a release.
 */
export interface AdaptiveRules {
  /** Round accuracy that counts as a strong round. */
  strongRound: number;
  /** Strong rounds in a row before a new question type is unlocked. */
  unlockAfter: number;
  /** A 100% round unlocks the next type immediately. */
  perfectUnlocks: boolean;
  /** Rolling answers remembered per topic. */
  topicWindow: number;
  /** A topic's tier steps up on this accuracy over at least this many answers. */
  topicUp: { minAttempts: number; accuracy: number };
  /**
   * A topic's tier steps down below this accuracy over at least this many
   * answers, or after this many wrong in a row.
   */
  topicDown: { minAttempts: number; accuracy: number; wrongStreak: number };
  /** Whole-round fallbacks, for clients with no per-topic history yet. */
  roundUp: number;
  roundDown: number;
  /** Draw-weight multiplier for a freshly unlocked topic. */
  newTopicWeight: number;
  /** Draw-weight multiplier for a topic the child is struggling with. */
  weakTopicWeight: number;
  /** How many types a brand-new student starts with, per subject. */
  starterCount: { math: number; logic: number };
  /**
   * The full unlock ladders. The client intersects these with the pools its
   * grade actually has, so one ladder serves every grade.
   */
  unlockOrder: { math: TopicKey[]; logic: PuzzleFamily[] };
}

export interface Rules {
  coinRates: CoinRates;
  /** Streaks pay at this many in a row, and every other answer after that. */
  firstCombo: number;
  /**
   * One challenge is drawn from each bucket per day, so a day is never three
   * hard goals at once.
   */
  challengeBuckets: ChallengeDef[][];
  /** Share of typeable questions asked as typed entry, per tier. */
  entryShare: Record<Tier, number>;
  starThresholds: StarThresholds;
  /**
   * Coins to open the next lesson. Flat: the same at lesson 7 as at lesson
   * 700, so a level always costs about the same and a child can tell what
   * they are saving for.
   *
   * It is set just under what two stars pays, which is the whole design.
   * Over a level of ten lessons, the worst run that still earns two stars
   * every time pays 191 against a cost of 180 — so a child holding that
   * standard is never stopped. The same worst run at one star pays 150, so
   * they fall behind and go back to replay something, which is the loop this
   * price exists to create.
   *
   * Those are not round numbers because they are not guesses: they come out
   * of `coinRates` and the star thresholds, and `unlocks.test.ts` recomputes
   * them rather than restating them. Move either and it fails.
   *
   * Optional: packs baked before this existed don't carry it, and clients
   * fall back to their compiled-in copy.
   */
  unlockCost?: number;
  /**
   * Which maps charge for the next lesson.
   *
   * Reading is left out by default and that is a judgement about reading, not
   * an oversight: a story is a thing you sit down with, and putting a price
   * on the next one turns a child who wants to read into a child who has to
   * earn it first. Sums and puzzles are practice, and practice is what the
   * coins are for.
   *
   * A deployment that disagrees can say so here without an app release, which
   * is the point of it being a rule rather than a constant.
   *
   * Optional: packs baked before lessons had a price don't carry it, and
   * clients fall back to their compiled-in copy.
   */
  paidSubjects?: Subject[];
  /**
   * Optional: packs baked before adaptive practice existed don't carry it,
   * and clients fall back to their compiled-in copy. Never reject a rules
   * pack over this field.
   */
  adaptive?: AdaptiveRules;
}
