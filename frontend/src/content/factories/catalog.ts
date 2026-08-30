// GENERATED FILE — DO NOT EDIT.
// Copied from backend/src/factories by `npm run sync:shared`.
// Change the original and re-run that; edits here are overwritten.

/**
 * Every kind of question the app can build, and how hard each one goes.
 *
 * This is the whole vocabulary a level recipe is written in. A recipe names
 * factory ids and difficulties; the device looks them up here and builds the
 * questions itself. Which means two things have to hold, and both are tested:
 * an id is forever, because it is written into recipes and into a child's
 * per-skill progress; and the same id at the same `d` with the same seed
 * builds the same question on every device.
 *
 * Nothing here knows about grades or tiers. That is the point — the old grid
 * is frozen in `content/lessonPools.ts` and feeds the authored 60 lessons,
 * while everything past them is composed from this.
 */

import { Tier } from '../contract';
import * as draw from '../generators/drawPuzzles';
import { ARITHMETIC } from './arithmetic';
import { LOGIC } from './logic';
import { Factory, Skill, Slot, factory } from './ramp';
import { SHAPES_AND_UNITS } from './shapesAndUnits';
import { WORD } from './word';

/**
 * Cake cutting. The generator takes one of three authored arrangements
 * rather than a number, so the ramp maps `d` onto those three and stops.
 */
export const cakeCut = factory({
  id: 'cakeCut',
  skill: 'draw',
  gradeHint: [1, 5],
  ramp: [
    { d: 1, tier: 1 as Tier },
    { d: 7, tier: 2 as Tier },
    { d: 12, tier: 3 as Tier },
  ],
  build: ({ tier }, rng) => draw.cakeCutQuestion(tier, rng),
});

const ALL: Factory[] = [...ARITHMETIC, ...WORD, ...SHAPES_AND_UNITS, cakeCut, ...LOGIC];

export const CATALOG: Record<string, Factory> = Object.fromEntries(
  ALL.map((f) => [f.id, f]),
);

export const FACTORIES: readonly Factory[] = ALL;

/** Every skill on one subject's map, in a stable order. */
export const skillsOf = (subject: 'math' | 'logic'): Skill[] =>
  [...new Set(ALL.filter((f) => f.subject === subject).map((f) => f.skill))].sort();

/** The factories that teach a skill, hardest ceiling last. */
export const BY_SKILL: Record<string, Factory[]> = ALL.reduce<Record<string, Factory[]>>(
  (acc, f) => {
    (acc[f.skill] ??= []).push(f);
    return acc;
  },
  {},
);

for (const list of Object.values(BY_SKILL)) {
  list.sort((a, b) => a.dRange[1] - b.dRange[1] || a.id.localeCompare(b.id));
}

/** How far up a skill can still teach something. */
export const ceilingOf = (skill: Skill): number =>
  (BY_SKILL[skill] ?? []).reduce((top, f) => Math.max(top, f.dRange[1]), 0);

export interface SkillPick {
  slots: Slot[];
  /**
   * True when `d` is past everything this skill has. The slots are still
   * good — they are simply pinned at the skill's ceiling — but a caller that
   * sees this should stop treating the skill as somewhere to advance, and
   * spend the child's time on one that still has room.
   */
  capped: boolean;
}

/**
 * `count` slots that teach `skill` at difficulty `d`.
 *
 * Never returns fewer than asked for and never returns none: a lesson that
 * says it is about shapes has to be about shapes, so when `d` runs past every
 * shape factory the slots are clamped to the ceiling rather than dropped.
 * `capped` is how the caller finds out that happened.
 */
export function slotsFor(skill: Skill, d: number, count: number): SkillPick {
  const all = BY_SKILL[skill] ?? [];
  if (all.length === 0 || count <= 0) return { slots: [], capped: true };

  const inRange = all.filter((f) => d >= f.dRange[0] && d <= f.dRange[1]);
  const capped = inRange.length === 0;

  // Past the ceiling, fall back to whichever factories reach highest; below
  // the floor, to whichever start lowest.
  let usable = inRange;
  if (capped) {
    const top = ceilingOf(skill);
    usable = d > top ? all.filter((f) => f.dRange[1] === top) : [all[0]];
  }

  // Rotate so a lesson covers a spread rather than ten of one thing.
  const slots = Array.from({ length: count }, (_, i) => {
    const f = usable[i % usable.length];
    return { factory: f.id, d: Math.min(Math.max(d, f.dRange[0]), f.dRange[1]) };
  });
  return { slots, capped };
}

/** The skills on a map that still have room above `d`, deepest first. */
export const skillsWithHeadroom = (d: number, subject: 'math' | 'logic' = 'math'): Skill[] =>
  skillsOf(subject)
    .filter((skill) => ceilingOf(skill) > d)
    .sort((a, b) => ceilingOf(b) - ceilingOf(a));
