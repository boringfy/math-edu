// GENERATED FILE — DO NOT EDIT.
// Copied from backend/src/contract by `npm run sync:shared`.
// Change the original and re-run that; edits here are overwritten.

/**
 * The four pack shapes.
 *
 * Granularity is one pack per subject per grade, so a child downloads only
 * the grade they are playing. Maths and logic ship a catalog of map stops
 * plus pools of pre-baked questions; reading ships its stories, which are
 * authored and therefore already concrete.
 */

import type {
  Grade,
  Lesson,
  PuzzleFamily,
  PuzzleSet,
  Question,
  Story,
  Tier,
  TopicKey,
} from './content';
import type { Rules } from './rules';

/**
 * A pool key, e.g. "addSub:2" or "draw:3". Questions are pooled by the thing
 * a lesson asks for — a topic or a puzzle family — crossed with the tier.
 */
export type PoolKey = string;

export const mathPoolKey = (topic: TopicKey, tier: Tier): PoolKey => `${topic}:${tier}`;

/** Cut-the-cake drawing puzzles, which belong to no topic. */
export const drawPoolKey = (tier: Tier): PoolKey => `draw:${tier}`;

export const logicPoolKey = (family: PuzzleFamily, tier: Tier): PoolKey => `${family}:${tier}`;

/**
 * A pack body carries no version of its own.
 *
 * The manifest is the authority on versions, and keeping the number out of
 * the body means the bytes hash to the same value whatever version they are
 * published under — which is what lets the bake tell "this content changed"
 * apart from "this content was published again".
 */
interface PackBase {
  schemaVersion: number;
}

export interface MathPack extends PackBase {
  kind: 'math';
  grade: Grade;
  /** The grade's 60 map stops, in map order. */
  catalog: Lesson[];
  /** Keyed by `mathPoolKey` and `drawPoolKey`. */
  pools: Record<PoolKey, Question[]>;
}

export interface ReadingPack extends PackBase {
  kind: 'reading';
  grade: Grade;
  /** Stories carry their own text and questions, so this is the content. */
  catalog: Story[];
}

export interface LogicPack extends PackBase {
  kind: 'logic';
  grade: Grade;
  catalog: PuzzleSet[];
  /** Keyed by `logicPoolKey`. */
  pools: Record<PoolKey, Question[]>;
}

export interface RulesPack extends PackBase {
  kind: 'rules';
  rules: Rules;
}

export type Pack = MathPack | ReadingPack | LogicPack | RulesPack;
