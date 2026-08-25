/**
 * Drawing from a pool without repeating.
 *
 * The old app invented a question every time it was asked, so repetition was
 * never a question anyone had to answer. Pools are finite, and picking at
 * random from 150 questions means a child sees a repeat after about a dozen
 * draws — the birthday problem, and it reads as the app being lazy.
 *
 * So each pool is *walked* instead: a shuffled order, consumed a few at a
 * time, reshuffled only once it runs out. A child gets the whole pool before
 * they get anything twice.
 *
 * The cursor lives on the device and survives restarts, because otherwise
 * every launch would start the same walk again and the first lesson of the
 * day would always be the same lesson.
 */

export interface PoolCursor {
  /** Indices into the pool, in the order they will be handed out. */
  order: number[];
  /** How far through `order` we have got. */
  taken: number;
  /** Pool length when the order was built; a resized pool reshuffles. */
  size: number;
}

export type CursorState = Record<string, PoolCursor>;

/** Fisher-Yates over 0..size-1. */
function shuffledIndices(size: number, random: () => number): number[] {
  const order = Array.from({ length: size }, (_, i) => i);
  for (let i = size - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * Takes `count` questions from a pool, returning the picks and the cursor to
 * save. Wraps round to a fresh shuffle when the pool runs out, so a request
 * larger than the pool still returns `count` items rather than short-changing
 * the lesson.
 */
export function draw<T>(
  pool: T[],
  cursor: PoolCursor | undefined,
  count: number,
  random: () => number,
): { picked: T[]; cursor: PoolCursor } {
  if (pool.length === 0) return { picked: [], cursor: { order: [], taken: 0, size: 0 } };

  let state: PoolCursor =
    cursor && cursor.size === pool.length && cursor.order.length === pool.length
      ? { ...cursor, order: [...cursor.order] }
      : { order: shuffledIndices(pool.length, random), taken: 0, size: pool.length };

  const picked: T[] = [];
  while (picked.length < count) {
    if (state.taken >= state.order.length) {
      // Walked the whole pool — reshuffle and carry on. A lesson asking for
      // more questions than the pool holds legitimately lands here.
      state = { order: shuffledIndices(pool.length, random), taken: 0, size: pool.length };
    }
    picked.push(pool[state.order[state.taken]]);
    state.taken++;
  }

  return { picked, cursor: state };
}

/**
 * Drops cursors for pools that no longer exist.
 *
 * Content updates retire pools, and without this the saved state grows for
 * ever with keys nothing will ever read again.
 */
export function prune(state: CursorState, liveKeys: string[]): CursorState {
  const live = new Set(liveKeys);
  const next: CursorState = {};
  for (const [key, cursor] of Object.entries(state)) {
    if (live.has(key)) next[key] = cursor;
  }
  return next;
}
