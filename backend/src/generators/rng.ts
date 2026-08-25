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

let label = 'unseeded';
let draw = mulberry32(hashSeed(label));
let counter = 0;

/**
 * Points the generators at a fresh stream. The label also namespaces the ids
 * this run produces, so two pools baked in the same process cannot collide.
 */
export function seed(next: string): void {
  label = next;
  draw = mulberry32(hashSeed(next));
  counter = 0;
}

export const random = (): number => draw();

/** A question id, stable for a given seed and position in the stream. */
export function nextId(): string {
  counter++;
  return `${label}#${counter}`;
}
