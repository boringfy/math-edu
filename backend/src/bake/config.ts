/**
 * How deep the pools go.
 *
 * A pool is walked without replacement on the device, so `POOL_SIZE` is
 * really "how many questions before a child sees a repeat". A 7-question
 * lesson drawing on two topics gets through roughly 3–4 of each per play, so
 * 150 is somewhere around forty plays of the same lesson before anything
 * comes round again — well past the point a child has moved on.
 *
 * Raising these costs pack size and nothing else: 150 questions is roughly
 * 30KB, and a grade's maths pack holds one pool per topic per tier.
 */
export const POOL_SIZE = {
  math: 150,
  /**
   * Cake-cut puzzles are authored, not generated — there are exactly three
   * arrangements per tier in `generators/drawPuzzles.ts`. This is a ceiling
   * the pool never reaches, and raising it does nothing until more tasks are
   * written. Left above the real count so adding a fourth just works.
   */
  draw: 12,
  logic: 120,
} as const;

/**
 * The seed the bake runs from. Changing it rotates every pool — which is the
 * intended way to refresh content without editing a single generator.
 *
 * Override with `BAKE_SEED=2026-09-01 npm run bake`.
 */
export const BAKE_SEED = process.env.BAKE_SEED ?? 'boring-quest-v1';

/** Where baked packs and the manifest are written. */
export const DIST_DIR = 'dist';

/** The oldest app build able to render schemaVersion 1 packs. */
export const MIN_APP_VERSION = '1.0.0';
