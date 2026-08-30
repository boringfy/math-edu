// GENERATED FILE — DO NOT EDIT.
// Copied from backend/src/factories by `npm run sync:shared`.
// Change the original and re-run that; edits here are overwritten.

/**
 * Building a level out of the factory catalog.
 *
 * The authored maps stop at sixty lessons. Past that, levels are composed:
 * ten lessons at a time, each one a list of slots naming a factory and a
 * difficulty. A slot is not a question — it is instructions for making one,
 * and small enough to send over a wire or keep in a child's saved progress.
 *
 * Composition is deterministic, and deliberately split in two so that a level
 * looks the same whatever the child has been doing. Which skills a lesson is
 * about, what it is called, and how many problems it asks come from the level
 * number alone — never from `mastery` — so the map does not rewrite itself
 * under a child mid-level, and a lesson replayed is recognisably the lesson
 * they played. Only how hard each slot is set responds to them.
 *
 * A language model can do this job better — it can theme a level and name it
 * something a child wants to play — but it must never be required to. This
 * is the path that always works: no network, no key, no provider. What the
 * model returns is checked against the same catalog and can only ever replace
 * what is composed here.
 */

import { Grade, Tier } from '../contract';
import { makeRng } from '../generators/rng';
import { CATALOG, ceilingOf, skillsOf, skillsWithHeadroom, slotsFor } from './catalog';
import { Skill, Slot } from './ramp';

export const LESSONS_PER_LEVEL = 10;

/**
 * What the child has shown they can do, per skill, as a difficulty.
 *
 * Only skills the adaptive engine actually has evidence about belong here. A
 * skill that is missing takes the level's own difficulty, which is what makes
 * the work get harder as the levels go by; a skill that is present overrides
 * it in either direction, which is what lets one child be four levels ahead
 * on times tables and two behind on clocks in the same lesson.
 *
 * Pre-filling this with a guess would silently pin every skill to that guess
 * and stop the levels climbing at all.
 */
export type Mastery = Partial<Record<Skill, number>>;

export interface ComposedLesson {
  /** Stable and unique: `math.g2.L7.l3`. Never collides with `g2-l7`. */
  id: string;
  /** Continues the map's numbering, so lesson 61 follows lesson 60. */
  index: number;
  level: number;
  title: string;
  icon: string;
  /** For display only — the map shows Easy/Normal/Hard. */
  tier: Tier;
  skills: Skill[];
  slots: Slot[];
  /** Seeds the questions, so the same lesson deals the same problems. */
  seed: string;
}

/**
 * Difficulty shown as one of the three words the map already uses. `d` is a
 * ladder with no top, so this is a rough banding, not a reversible mapping.
 */
export const tierForD = (d: number): Tier => (d <= 6 ? 1 : d <= 11 ? 2 : 3);

/**
 * A lesson is titled after what it actually asks, not after a theme. Kept
 * short because two of them get joined, and a map node has one line.
 */
const SKILL_WORD: Partial<Record<Skill, string>> = {
  addSub: 'Adding',
  mulDiv: 'Times Tables',
  fractions: 'Fractions',
  decimals: 'Decimals',
  order: 'Order of Operations',
  word: 'Story Problems',
  geometry: 'Shapes',
  measurement: 'Measuring',
  money: 'Money',
  speed: 'Speed',
  time: 'Clocks',
  place: 'Place Value',
  draw: 'Cake Cutting',
  // The logic families, in the words the map already uses for them.
  series: 'Shape Patterns',
  oddShape: 'Odd Shape Out',
  matrix: 'Grids',
  rotation: 'Turning',
  mirror: 'Mirrors',
  sequence: 'Number Patterns',
  letters: 'Letter Patterns',
  oddWord: 'Odd Word Out',
  oddNumber: 'Odd Number Out',
  analogy: 'Word Links',
  balance: 'Balance Scales',
  grid: 'Deduction',
  syllogism: 'Reasoning',
};

const SKILL_ICON: Partial<Record<Skill, string>> = {
  addSub: '➕',
  mulDiv: '✖️',
  fractions: '🍕',
  decimals: '🔢',
  order: '🧮',
  word: '📖',
  geometry: '📐',
  measurement: '📏',
  money: '🪙',
  speed: '🚄',
  time: '🕐',
  place: '🔟',
  draw: '🎂',
  series: '🔷',
  oddShape: '⭐',
  matrix: '🔳',
  rotation: '🔄',
  mirror: '🪞',
  sequence: '🔢',
  letters: '🔤',
  oddWord: '🚫',
  oddNumber: '⑦',
  analogy: '🔗',
  balance: '⚖️',
  grid: '🕵️',
  syllogism: '🧠',
};

const titleFor = (skills: Skill[]): string =>
  skills.map((s) => SKILL_WORD[s] ?? s).join(' & ');

/**
 * The skills worth asking about at this difficulty.
 *
 * This is the whole curriculum-unlock rule, and it needs no curriculum: a
 * skill is live exactly when one of its factories covers `d`. Decimals start
 * at 13 and fractions at 10, so a child at 6 is not offered either — and both
 * arrive on their own as `d` climbs, without anything having to decide that
 * they should. A skill whose factories have all been outgrown drops out the
 * same way.
 */
export function liveSkills(d: number, subject: 'math' | 'logic' = 'math'): Skill[] {
  return skillsOf(subject).filter((skill) => !slotsFor(skill, d, 1).capped);
}

/**
 * How many problems a lesson asks — the same as the authored map, so nothing
 * changes underfoot at lesson 61. Ten, except on a cake-cutting lesson, which
 * trades five of them for two drawn puzzles.
 *
 * `lessons.ts` puts one of those every twelfth stop, and the same rhythm is
 * kept here rather than reinvented: a child who has played sixty lessons has
 * learned to expect it.
 */
const PROBLEMS_PER_LESSON = 10;
const CAKE_EVERY = 12;
const isCakeLesson = (index: number): boolean => index % CAKE_EVERY === 0;

/**
 * The skills one lesson is about.
 *
 * Two most of the time, which is enough to feel varied without a lesson being
 * about nothing in particular. Skills whose factories have run out are left
 * out entirely — there is no point asking a child to practise something the
 * catalog can no longer make harder.
 */
function skillsForLesson(pool: Skill[], slot: number, rng: ReturnType<typeof makeRng>): Skill[] {
  if (pool.length === 0) return [];
  if (pool.length === 1) return [pool[0]];
  // Walk the pool rather than sampling it, so ten lessons cover the ground
  // instead of landing on the same favourite three times.
  const first = pool[slot % pool.length];
  const rest = pool.filter((s) => s !== first);
  const second = rest[rng.randInt(0, rest.length - 1)];
  return [first, second];
}

/**
 * Ten lessons for one level.
 *
 * `d` climbs by one every three levels — about the pace the authored grades
 * moved at — and each skill is capped at what its factories can still teach.
 */
export function composeLevel(opts: {
  subject: 'math' | 'logic';
  grade: Grade;
  level: number;
  /** The first level that is composed rather than authored. */
  firstComposedLevel: number;
  mastery: Mastery;
}): ComposedLesson[] {
  const { subject, grade, level, firstComposedLevel, mastery } = opts;

  const rng = makeRng(`${subject}.g${grade}.L${level}`);

  // Where this level sits on the ladder: the top of the child's grade, plus
  // a step every third level. Slow on purpose — the authored grades moved at
  // about this pace, and lesson 61 has to feel like lesson 60 did.
  const levelD = levelDifficulty(grade, level, firstComposedLevel);

  /**
   * Past the top of every ramp there is nothing "live" left, and a child who
   * gets that far must still be given a lesson. So the deepest few skills
   * carry on at their ceiling: the questions stop getting harder, but they
   * never stop coming, and `slotsFor` still builds real ones. Widening a ramp
   * is what actually fixes this; this only guarantees it can never break.
   */
  const live = liveSkills(levelD, subject);
  const pool = live.length > 0 ? live : skillsWithHeadroom(0, subject).slice(0, 4);

  return Array.from({ length: LESSONS_PER_LEVEL }, (_, i) => {
    const index = (level - 1) * LESSONS_PER_LEVEL + i + 1;
    const cake = subject === 'math' && isCakeLesson(index) && pool.includes('draw');
    const count = cake ? 5 : PROBLEMS_PER_LESSON;

    const skills = skillsForLesson(
      pool.filter((s) => s !== 'draw'),
      i,
      rng,
    );

    const slots: Slot[] = [];
    const share = Math.ceil(count / Math.max(1, skills.length));
    for (const skill of skills) {
      const want = Math.min(share, count - slots.length);
      if (want <= 0) break;
      // A skill the child is behind or ahead on moves on its own, but never
      // outside what that skill's factories can actually build.
      const d = Math.min(mastery[skill] ?? levelD, ceilingOf(skill));
      slots.push(...slotsFor(skill, d, want).slots);
    }

    if (cake) {
      const d = Math.min(mastery.draw ?? levelD, ceilingOf('draw'));
      slots.push(...slotsFor('draw', d, 2).slots);
    }

    const hardest = slots.reduce((top, s) => Math.max(top, s.d), 1);
    return {
      id: `${subject}.g${grade}.L${level}.l${i + 1}`,
      index,
      level,
      title: cake ? 'Cake Cutting' : titleFor(skills),
      icon: cake ? '🎂' : (SKILL_ICON[skills[0]] ?? '⭐'),
      tier: tierForD(hardest),
      skills: cake ? [...skills, 'draw'] : skills,
      slots,
      seed: `${subject}.g${grade}.L${level}.l${i + 1}`,
    };
  });
}

/**
 * The problems a composed lesson asks. Same seed in, same problems out.
 *
 * The ids are rewritten to name the lesson and the skill — `math.g2.L7.l1:
 * addSub#3`. A baked question carries its topic in its id and the app reads it
 * back to work out what a child is good at; a composed one has to do the same
 * or every answer would be filed under nothing.
 */
export function questionsFor(lesson: ComposedLesson) {
  const rng = makeRng(lesson.seed);
  return lesson.slots.map((slot, i) => {
    const built = CATALOG[slot.factory].generate(slot.d, rng);
    return { ...built, id: `${lesson.id}:${CATALOG[slot.factory].skill}#${i + 1}` };
  });
}

/**
 * How hard a level is before any one skill is adjusted for.
 *
 * Exported because the app needs it to turn what the adaptive engine knows —
 * which is relative, "this child is a step behind on clocks" — into the
 * absolute `d` that `mastery` is written in.
 */
export const levelDifficulty = (grade: Grade, level: number, firstComposedLevel: number): number =>
  // Never below where the grade itself ended: a level under the first
  // composed one is a caller's mistake, and clamping keeps it from asking
  // for easier work than the authored map already gave.
  grade * 3 + Math.max(0, Math.floor((level - firstComposedLevel) / 3));
