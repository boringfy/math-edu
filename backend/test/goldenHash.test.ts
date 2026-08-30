/**
 * What the bake actually produces, pinned pool by pool.
 *
 * `determinism.test.ts` bakes twice in one process, so it proves the bake is
 * repeatable — not that it still produces what it produced yesterday. Nothing
 * else checks that either: `versionFor` in the bake compares against the
 * previous manifest, and the Docker build starts from an empty `dist/`, so
 * every published pack is version 1 and the version integer never moves.
 *
 * What moves is the sha256, and that is what costs: the client re-downloads a
 * pack whose hash differs (`updater.ts`, `packsToFetch`), so changing a
 * generator quietly makes every installed device pull the pack again — and
 * puts a megabyte-scale diff through `frontend/assets/seed/`.
 *
 * So this pins a digest per pool rather than per pack. Per pool, because when
 * one moves you want the failure to name `math.g4 mulDiv:2` rather than tell
 * you that grade 4 changed somehow.
 *
 * A failure here means the content changed. If that is intended, regenerate
 * with `npm run test -w backend -- -u` and re-run `npm run seed -w backend` in
 * the same commit, so the reviewer sees which pools moved and can weigh the
 * re-download against the change.
 */

import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { logicPools, mathPools } from '../src/bake/pools';
import { GRADES, PoolKey, Question } from '../src/contract';

/**
 * The question id is part of the digest on purpose. It is seeded from the
 * pool's label and the question's position in the stream, so reordering the
 * generators inside a pool renumbers everything after it — a real change to
 * what ships, and one the prompt-and-answer alone would hide.
 */
const digest = (questions: Question[]): string =>
  createHash('sha256').update(JSON.stringify(questions)).digest('hex').slice(0, 12);

const digests = (pools: Record<PoolKey, Question[]>): Record<PoolKey, string> =>
  Object.fromEntries(
    Object.entries(pools)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, questions]) => [key, `${digest(questions)} (${questions.length})`]),
  );

describe('baked content is stable', () => {
  for (const grade of GRADES) {
    it(`grade ${grade} maths pools`, () => {
      expect(digests(mathPools(grade))).toMatchSnapshot();
    });

    it(`grade ${grade} logic pools`, () => {
      expect(digests(logicPools(grade))).toMatchSnapshot();
    });
  }
});
