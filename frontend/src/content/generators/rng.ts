// GENERATED FILE — DO NOT EDIT.
// Copied from backend/src/generators by `npm run sync:shared`.
// Change the original and re-run that; edits here are overwritten.

/**
 * The one source of randomness the generators are allowed to use.
 *
 * On the device this used to be `Math.random()`, which was fine when
 * questions were made up as they were played. Baking is different: the same
 * content has to produce the same bytes, or every bake would look like a
 * change and every client would re-download 16 packs for nothing.
 *
 * So the bake seeds this deliberately. Same seed in, same pack hash out —
 * which is what makes "has the content actually changed?" a hash comparison,
 * and what makes CI reproducible.
 *
 * A generator takes its stream as an argument rather than reaching for a
 * module-level one. That is what lets the device hold more than one stream at
 * a time: a lesson generated from a recipe seeds its own, and cannot disturb
 * anything else mid-draw. The bake still wants one shared stream per pool —
 * `fill` seeds once and then cycles the generators — so `ambient` stays for
 * that one caller's convenience, rather than being everyone's dependency.
 */

/** mulberry32 — small, fast, and good enough for shuffling quiz questions. */
function mulberry32(seedValue: number): () => number {
  let a = seedValue >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a, so a seed can be a readable string like "math.g3:addSub:2". */
export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h = (Math.imul(h, 16777619) ^ text.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}

/**
 * A stream of draws, plus the four ways the generators consume it.
 *
 * Every method is one or more calls to `next()` in a fixed order, so two
 * engines that agree on `next()` agree on the questions. mulberry32 is
 * integer-only (`>>>`, `^`, `Math.imul`) and divides by 2^32, which is exact
 * in IEEE-754 — so a phone regenerates precisely what the bake produced.
 */
export interface Rng {
  next(): number;
  randInt(min: number, max: number): number;
  pick<T>(arr: T[]): T;
  shuffle<T>(arr: T[]): T[];
  /** A question id, stable for a given seed and position in the stream. */
  nextId(): string;
}

/**
 * A fresh, independent stream. The label seeds the draws and namespaces the
 * ids, so two streams running at once cannot collide on either.
 */
export function makeRng(label: string): Rng {
  const draw = mulberry32(hashSeed(label));
  let counter = 0;

  const rng: Rng = {
    next: draw,
    randInt: (min, max) => Math.floor(draw() * (max - min + 1)) + min,
    pick: (arr) => arr[Math.floor(draw() * arr.length)],
    shuffle: (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(draw() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    nextId: () => {
      counter++;
      return `${label}#${counter}`;
    },
  };
  return rng;
}

/**
 * The bake's shared stream.
 *
 * `fill` seeds it once per pool and then cycles that pool's generators
 * against it, so the pool is one continuous stream rather than a hundred
 * short ones. It is a stable object that forwards to whichever stream `seed`
 * last installed, so a caller may capture it once and still see the reseed.
 */
let current = makeRng('unseeded');

export const ambient: Rng = {
  next: () => current.next(),
  randInt: (min, max) => current.randInt(min, max),
  pick: (arr) => current.pick(arr),
  shuffle: (arr) => current.shuffle(arr),
  nextId: () => current.nextId(),
};

/** Points the ambient stream at a fresh sequence. */
export function seed(next: string): void {
  current = makeRng(next);
}

export const random = (): number => current.next();

/** A question id from the ambient stream. */
export const nextId = (): string => current.nextId();
