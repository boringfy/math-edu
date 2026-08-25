/**
 * Tunable progression numbers, shipped as content so reward balance can be
 * changed without an app release.
 *
 * The client compiles in a copy of these as its fallback (see
 * `frontend/src/lib/progress.ts`) and prefers the packed values when a
 * `rules` pack has been loaded. Nothing here decides *whether* an answer is
 * right — only what it is worth.
 */

import type { Tier } from './content';

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
}
