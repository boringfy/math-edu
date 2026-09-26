/**
 * Speed Match: a whole lesson of mental arithmetic against a clock.
 *
 * Every other lesson asks whether a child can work something out. This one
 * asks whether they can do it without working it out at all — `12 + 5`,
 * `15 - 5`, `6 × 9`, `15 - ? = 10`. The arithmetic is deliberately far below
 * what the child is otherwise being set, because the thing being practised is
 * recall speed. Scratch paper is still available: the timer is the pressure,
 * and taking away a child's preferred way to think adds frustration, not skill.
 *
 * The clock is the whole design:
 *
 *   - every lesson has the same fixed number of problems
 *   - harder arithmetic gets slightly more time, from five to ten seconds
 *
 * A timeout is a wrong answer, so the ordinary adaptive record sees both
 * accuracy and pace. Repeated misses pull add/sub and mul/div mastery down;
 * clean timed rounds push them up. The next composed level reads that mastery.
 */

import { Grade } from '../contract';
import { makeRng } from '../generators/rng';
import { CATALOG } from './catalog';
import { Slot } from './ramp';

/**
 * The first level that carries one. Specified as "only add after level 40",
 * so level 41 is the first that has one.
 */
export const SPEED_FROM_LEVEL = 7;

/** Every Speed Match asks this fixed number of questions. */
export const SPEED_QUESTION_COUNT = 10;

/**
 * Preferred lesson positions. `speedPositions` moves one when cake owns it.
 */
export const SPEED_POSITIONS = [4, 9] as const;

/** Generated math levels in every grade carry Speed Matches. */
export const hasSpeedLesson = (
  subject: 'math' | 'logic',
  _grade: Grade,
  level: number,
): boolean => subject === 'math' && level >= SPEED_FROM_LEVEL;

/** Two stable slots, moved one place earlier only when a cake owns that index. */
export function speedPositions(level: number): number[] {
  const candidates = [...SPEED_POSITIONS, 3, 8, 2, 7, 5, 10, 1, 6];
  return candidates
    .filter((position) => ((level - 1) * 10 + position) % 12 !== 0)
    .slice(0, 2)
    .sort((a, b) => a - b);
}

/**
 * Seconds per problem, from the gentlest band to the sharpest.
 *
 * Harder facts get a little more thinking time while remaining quick.
 */
const PACE_SECONDS = [5, 6, 7, 8, 9, 10];

export const SPEED_BANDS = PACE_SECONDS.length;

/**
 * The factories a speed lesson draws on, in the order it cycles them, chosen
 * to match the four shapes asked for: a sum, a difference, a table fact, and
 * a missing number.
 */
const factoriesForBand = (band: number) => [
  'addition',
  'subtraction',
  'missingSubtractionPart',
  'missingAddend',
  ...(band >= 2 ? ['tableMultiplication'] : []),
  ...(band >= 4 ? ['tableDivision', 'tableMultiplication'] : []),
] as const;

/**
 * Sums and differences stay small enough to hold in your head: `12 + 5`,
 * `15 - 5`, `16 + 19`. Capped hard at d 4 — one step up gives `19 + 53`,
 * which is a written sum wearing a drill's clothes.
 */
const arithmeticD = (band: number): number => Math.min(2 + Math.ceil(band / 3), 4);

/** Tables run their full useful range: 10×2 at the bottom, 12×12 at the top. */
const tableD = (band: number): number => Math.min(3 + band, 9);

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

/**
 * How fast to push this child.
 *
 * Two parts, and both are needed.
 *
 * The **base** climbs with the level, starting at 1. The first Speed Match a
 * child ever meets is a new kind of lesson, and it should be met at ten
 * problems in a minute, not twenty — whatever grade they are in. It reaches
 * the top band about thirty levels later.
 *
 * The **shift** is where their own arithmetic sits relative to the level they
 * are on, which is the part that answers "adjusted to their current
 * performance": two children on the same level get a different lesson, and a
 * child who is behind gets more time per problem rather than fewer problems
 * they cannot reach.
 *
 * Deliberately not keyed on `levelD` alone. Doing that put every on-level
 * child straight into the top band by about level fifty and left the four
 * gentler bands reachable only by struggling — the adjustment existed but had
 * almost nowhere to move.
 */
export function speedBand(
  level: number,
  levelD: number,
  mastery: Partial<Record<string, number>>,
): number {
  const base = clamp(1 + Math.floor((level - SPEED_FROM_LEVEL) / 6), 1, SPEED_BANDS);
  const known = ['addSub', 'mulDiv'].map((s) => mastery[s] ?? levelD);
  const average = known.reduce((sum, d) => sum + d, 0) / known.length;
  // Three is how many levels a `d` step takes, so this is "roughly how many
  // levels ahead or behind their arithmetic is".
  //
  // Bounded asymmetrically, and on purpose. Pushing a child faster than their
  // level warrants is how a drill becomes discouraging, so acceleration is
  // held to two bands. Slowing down is the entire point of adapting, so a
  // child who is genuinely far behind can be brought all the way back to the
  // gentlest pace however deep into the map they are — with a symmetric
  // bound, a struggling child on level 60 could not reach it.
  const shift = clamp(Math.round((average - levelD) / 3), -(SPEED_BANDS - 1), 2);
  return clamp(base + shift, 1, SPEED_BANDS);
}

export interface SpeedPlan {
  band: number;
  /** Seconds allowed for each problem. */
  perProblem: number;
  /** Fixed across every Speed Match. */
  count: number;
  slots: Slot[];
}

/**
 * The plan for one speed lesson: how fast, how many, and of what.
 *
 * Deterministic given the same inputs, like every other part of composition,
 * so a lesson replayed is the lesson they played.
 */
export function speedPlan(
  level: number,
  levelD: number,
  mastery: Partial<Record<string, number>>,
  rng: ReturnType<typeof makeRng>,
): SpeedPlan {
  const band = speedBand(level, levelD, mastery);
  const perProblem = PACE_SECONDS[band - 1];
  const count = SPEED_QUESTION_COUNT;

  // Cycled rather than sampled, so a lesson covers all four shapes instead of
  // dealing eight additions. The offset keeps consecutive levels from opening
  // with the same question type every time.
  const factories = factoriesForBand(band);
  const offset = rng.randInt(0, factories.length - 1);
  const slots: Slot[] = Array.from({ length: count }, (_, i) => {
    const factory = factories[(offset + i) % factories.length];
    const table = CATALOG[factory].skill === 'mulDiv';
    const wanted = table ? tableD(band) : arithmeticD(band);
    const [lo, hi] = CATALOG[factory].dRange;
    return { factory, d: clamp(wanted, lo, hi) };
  });

  return { band, perProblem, count, slots };
}
