/**
 * Turns the generators into concrete pools of questions.
 *
 * On the device a question used to be invented the moment it was asked.
 * Here it is invented once, at bake time, and the device draws from what
 * came out. That is the whole trick that lets a new question type ship
 * without an app release: the app never knew how to build a question, only
 * how to draw one.
 *
 * Each pool is seeded from its own label, so pools are independent — adding
 * a topic does not shift the questions in any other pool, and therefore does
 * not change any other pack's hash.
 */

import {
  Grade,
  PoolKey,
  PuzzleFamily,
  Question,
  Tier,
  TIERS,
  TopicKey,
  drawPoolKey,
  logicPoolKey,
  mathPoolKey,
} from '../contract';
import { AVAILABLE, GENERATORS } from '../content/puzzles';
import { cakeCutQuestion } from '../generators/drawPuzzles';
import { lessonPools } from '../content/lessonPools';
import { ambient, seed } from '../generators/rng';
import { BAKE_SEED, POOL_SIZE } from './config';

/**
 * What makes two questions the same question.
 *
 * Not the prompt — every drawn puzzle in the app asks "Which comes next?",
 * so deduping on prompt alone would collapse a whole visual pool to a single
 * entry. Not the id either, which is seeded and differs by position. What
 * identifies a question is everything a child actually sees: the prompt, the
 * answer, the choices, and whatever is drawn alongside them.
 */
const signature = (q: Question): string =>
  JSON.stringify([
    q.prompt,
    q.correctAnswer,
    [...q.choices].sort(),
    q.cakeTask ?? null,
    q.puzzle ?? null,
  ]);

/**
 * Fills a pool by cycling the generators for that topic, so a pool of 150
 * across 5 generators is 30 of each rather than 150 of whichever the RNG
 * happened to favour.
 *
 * Duplicates are dropped: several generators legitimately produce the same
 * easy sum, and a pool with "2 + 3" in it six times reads as broken even
 * though nothing is wrong. `attempts` bounds the retry so a generator with a
 * genuinely small output space — there are only so many distinct grade-1
 * shape questions — finishes instead of spinning.
 */
function fill(label: string, gens: (() => Question)[], target: number): Question[] {
  if (gens.length === 0) return [];
  // The bake seed is folded in here rather than at each call site, so
  // changing it rotates every pool at once.
  seed(`${BAKE_SEED}/${label}`);

  const seen = new Map<string, Question>();
  const attempts = target * 8;
  for (let i = 0; i < attempts && seen.size < target; i++) {
    const q = gens[i % gens.length]();
    const sig = signature(q);
    if (!seen.has(sig)) seen.set(sig, q);
  }
  return [...seen.values()];
}

/** Every maths pool for a grade, keyed `${topic}:${tier}` plus `draw:${tier}`. */
export function mathPools(grade: Grade): Record<PoolKey, Question[]> {
  const pools: Record<PoolKey, Question[]> = {};

  for (const tier of TIERS) {
    const byTopic = lessonPools(grade, tier);
    for (const topic of Object.keys(byTopic) as TopicKey[]) {
      const gens = byTopic[topic];
      if (gens.length === 0) continue;
      const key = mathPoolKey(topic, tier);
      const filled = fill(`math.g${grade}:${key}`, gens, POOL_SIZE.math);
      if (filled.length > 0) pools[key] = filled;
    }

    const drawKey = drawPoolKey(tier);
    pools[drawKey] = fill(
      `math.g${grade}:${drawKey}`,
      [() => cakeCutQuestion(tier, ambient)],
      POOL_SIZE.draw,
    );
  }

  return pools;
}

/** Every logic pool for a grade, keyed `${family}:${tier}`. */
export function logicPools(grade: Grade): Record<PoolKey, Question[]> {
  const pools: Record<PoolKey, Question[]> = {};

  for (const tier of TIERS) {
    for (const family of AVAILABLE[grade] as PuzzleFamily[]) {
      const key = logicPoolKey(family, tier);
      const filled = fill(
        `logic.g${grade}:${key}`,
        [() => GENERATORS[family](tier, ambient)],
        POOL_SIZE.logic,
      );
      if (filled.length > 0) pools[key] = filled;
    }
  }

  return pools;
}
