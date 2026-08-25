import { CursorState, draw, prune } from '../cursor';

/** A deterministic stand-in for Math.random, so a walk can be asserted. */
const sequence = (values: number[]): (() => number) => {
  let i = 0;
  return () => values[i++ % values.length];
};

const pool = (n: number): string[] => Array.from({ length: n }, (_, i) => `q${i}`);

describe('draw', () => {
  it('hands out the whole pool before repeating anything', () => {
    const items = pool(10);
    let cursors: CursorState = {};
    const seen: string[] = [];

    // Ten draws of one, which is exactly the pool.
    for (let i = 0; i < 10; i++) {
      const result = draw(items, cursors.k, 1, Math.random);
      cursors = { k: result.cursor };
      seen.push(...result.picked);
    }

    expect(seen).toHaveLength(10);
    expect(new Set(seen).size).toBe(10);
  });

  it('reshuffles and carries on once the pool runs out', () => {
    const items = pool(4);
    let cursor = draw(items, undefined, 4, Math.random).cursor;
    expect(cursor.taken).toBe(4);

    const next = draw(items, cursor, 2, Math.random);
    expect(next.picked).toHaveLength(2);
    // A fresh walk, not a cursor stuck past the end.
    expect(next.cursor.taken).toBe(2);
  });

  it('still fills a request larger than the pool', () => {
    const items = pool(3);
    const result = draw(items, undefined, 7, Math.random);
    expect(result.picked).toHaveLength(7);
    // Everything drawn is genuinely from the pool.
    expect(result.picked.every((q) => items.includes(q))).toBe(true);
  });

  it('returns nothing for an empty pool rather than throwing', () => {
    expect(draw([], undefined, 5, Math.random)).toEqual({
      picked: [],
      cursor: { order: [], taken: 0, size: 0 },
    });
  });

  it('starts a fresh walk when the pool has been resized by an update', () => {
    const stale = { order: [0, 1, 2], taken: 2, size: 3 };
    const result = draw(pool(10), stale, 1, Math.random);
    expect(result.cursor.size).toBe(10);
    expect(result.cursor.order).toHaveLength(10);
    expect(result.cursor.taken).toBe(1);
  });

  it('is driven by the random source it is given', () => {
    // All zeroes makes Fisher-Yates fully deterministic.
    const a = draw(pool(5), undefined, 5, sequence([0]));
    const b = draw(pool(5), undefined, 5, sequence([0]));
    expect(a.picked).toEqual(b.picked);
  });

  it('does not mutate the cursor it was handed', () => {
    const before = { order: [0, 1, 2, 3], taken: 1, size: 4 };
    const snapshot = JSON.parse(JSON.stringify(before));
    draw(pool(4), before, 2, Math.random);
    expect(before).toEqual(snapshot);
  });
});

describe('prune', () => {
  it('drops cursors for pools that no longer exist', () => {
    const state: CursorState = {
      'math.g1/addSub:1': { order: [0], taken: 1, size: 1 },
      'math.g1/retired:1': { order: [0], taken: 1, size: 1 },
    };
    expect(Object.keys(prune(state, ['math.g1/addSub:1']))).toEqual(['math.g1/addSub:1']);
  });

  it('leaves an empty state empty', () => {
    expect(prune({}, ['anything'])).toEqual({});
  });
});
