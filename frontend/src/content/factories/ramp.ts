// GENERATED FILE — DO NOT EDIT.
// Copied from backend/src/factories by `npm run sync:shared`.
// Change the original and re-run that; edits here are overwritten.

/**
 * Difficulty, on one scale that does not stop.
 *
 * The original curriculum is a 5x3 grid: five grades, three tiers each, and a
 * lesson's tier decided by where it sits on the map. That grid is frozen in
 * `content/lessonPools.ts` and still feeds the 60 authored lessons per grade.
 * It has two problems as a ladder. It ends — a child who finishes grade 5 has
 * nowhere left to go — and it is not even monotone: grade 4 tier 1 asks for
 * sums to 500 where grade 3 tier 2 already asked for 1000.
 *
 * So difficulty here is a single integer `d`. Roughly, `d = (grade - 1) * 3 +
 * tier`, which puts the old grid at d 1..15 and makes each step about a third
 * of a school year — but d keeps counting past 15, and the mapping is a
 * rough guide rather than a rule the ramps are held to.
 *
 * `d` means the same thing in every skill. That is the whole point. It is
 * what makes "this child is at d 9 in addSub and d 4 in geometry" a sentence,
 * what lets a strong grade-2 child be handed d 10 work without anything
 * having to know that d 10 is nominally grade 4, and what lets the composer
 * ask "has this skill run out of headroom?" and get an answer.
 */

import { Grade, PuzzleFamily, Question, TopicKey } from '../contract';
import { Rng } from '../generators/generator';

export type { Rng };

/**
 * How a factory's settings change as d climbs.
 *
 * Rows are SPARSE and hold: you author only the d where something actually
 * changes, and every d above a row inherits it until the next one. Below the
 * first row you get the first row, above the last you get the last.
 *
 * There is deliberately no interpolation between rows. "What does d 7 mean
 * for this factory" has to be a line someone wrote and can grep for, not two
 * lines and an arithmetic argument — because the answer is a claim about what
 * a seven-year-old can do, and that is not the kind of thing to derive.
 *
 * A factory whose difficulty genuinely does not vary — there is no harder way
 * to ask whether a number is odd — still declares two rows, a first and a
 * last, to say where it is worth asking at all.
 */
export type Ramp<A> = ({ d: number } & A)[];

/** The row that applies at `d`, clamped into the ramp at both ends. */
export function atD<A>(ramp: Ramp<A>, d: number): { d: number } & A {
  let row = ramp[0];
  for (const next of ramp) {
    if (next.d > d) break;
    row = next;
  }
  return row;
}

/**
 * What a factory teaches: the twelve maths topics, the cake-cutting puzzles
 * that belong to no topic, and the thirteen logic families.
 *
 * One namespace for both subjects, which is safe because no maths topic and
 * no puzzle family share a name — and useful, because a child's progress in
 * 'mulDiv' and in 'matrix' is then the same kind of fact, recorded the same
 * way. `subject` on the factory is what keeps a maths lesson from being
 * handed a rotation puzzle.
 */
export type Skill = TopicKey | 'draw' | PuzzleFamily;

/**
 * One kind of question, and how hard it can be asked.
 *
 * `dRange` is a claim about teaching, not about crashing: outside it
 * `generate` still returns a perfectly good question, because `atD` clamps.
 * What the range says is "below this the question is noise, above it the
 * question stops teaching anything new" — so a composer that reaches past it
 * has a bug, and the catalog can be asked which skills have run out.
 */
export interface Factory {
  /** Stable. It ends up in level recipes and in per-skill progress. */
  id: string;
  /** Which map this belongs on. Maths unless it says otherwise. */
  subject: 'math' | 'logic';
  skill: Skill;
  dRange: [number, number];
  /** Where this normally falls in the old curriculum. A label, never a cap. */
  gradeHint: [Grade, Grade];
  /** Exposed so the ramps can be pinned in a snapshot and read back. */
  ramp: Ramp<Record<string, unknown>>;
  generate(d: number, rng: Rng): Question;
}

/** A factory pinned at a difficulty — what a level recipe is made of. */
export interface Slot {
  factory: string;
  d: number;
}

/**
 * Builds a factory from its ramp, deriving `dRange` from the table so the two
 * can never drift apart.
 */
export function factory<A>(spec: {
  id: string;
  /** Omitted means maths, which is most of the catalog. */
  subject?: 'math' | 'logic';
  skill: Skill;
  gradeHint: [Grade, Grade];
  ramp: Ramp<A>;
  build(args: A, rng: Rng): Question;
}): Factory {
  const { ramp } = spec;
  if (ramp.length === 0) {
    throw new Error(`factory ${spec.id} has no ramp rows`);
  }
  // A row that does not sit above the one before it can never be reached, so
  // it is a typo rather than a difficulty — and a silent one, since `atD`
  // would simply skip it.
  for (let i = 1; i < ramp.length; i++) {
    if (ramp[i].d <= ramp[i - 1].d) {
      throw new Error(
        `factory ${spec.id} has a ramp row at d ${ramp[i].d} that does not rise above ${ramp[i - 1].d}`,
      );
    }
  }
  return {
    id: spec.id,
    subject: spec.subject ?? 'math',
    skill: spec.skill,
    gradeHint: spec.gradeHint,
    dRange: [ramp[0].d, ramp[ramp.length - 1].d],
    ramp: ramp as Ramp<Record<string, unknown>>,
    generate: (d, rng) => spec.build(atD(ramp, d), rng),
  };
}

/** The multiplication tables a child has met, widening as d climbs. */
export const TABLES = {
  easy: [2, 5, 10],
  core: [2, 3, 4, 5, 10],
  wide: [2, 3, 4, 5, 6, 10],
  most: [2, 3, 4, 5, 6, 7, 8, 9, 10],
  all: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
} as const;
