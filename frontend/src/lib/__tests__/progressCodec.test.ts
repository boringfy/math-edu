/**
 * Squeezing a child's progress onto the wire.
 *
 * The thing to be careful about is that this is lossy on purpose, so the test
 * that matters is which losses. Stars must survive exactly — they are the
 * whole record of what a child did — and a purchase must never be dropped
 * while it can still be consulted. Everything else is allowed to go.
 */

import { packProgress, pruneUnlocks, unpackProgress } from '../progressCodec';
import { ProgressMap, Stars, Subject } from '../../types';
import { emptyUnlocks } from '../unlocks';

const at = (stars: Stars, clearedAt = '2026-08-01T00:00:00.000Z') => ({
  stars,
  bestPercent: stars * 33,
  clearedAt,
});

/** A map with the authored sixty done and `levels` composed levels after. */
const played = (levels: number, from = 7): ProgressMap => {
  const map: ProgressMap = {};
  for (let i = 1; i <= 60; i++) map[`g2-l${i}`] = at(2);
  for (let level = from; level < from + levels; level++) {
    for (let i = 1; i <= 10; i++) map[`math.g2.L${level}.l${i}`] = at(((i % 3) + 1) as Stars);
  }
  return map;
};

describe('what is packed and what is left alone', () => {
  it('leaves the authored lessons exactly as they were', () => {
    const { progress } = packProgress(played(0));
    expect(Object.keys(progress)).toHaveLength(60);
    expect(progress['g2-l58']).toEqual(at(2));
  });

  it('turns a composed level into ten digits', () => {
    const { packed } = packProgress(played(1));
    expect(packed['math.g2']['7']).toBe('2312312312');
  });

  it('keeps the maps and grades apart', () => {
    const map: ProgressMap = {
      'math.g2.L7.l1': at(3),
      'logic.g2.L7.l1': at(1),
      'math.g4.L7.l1': at(2),
    };
    const { packed } = packProgress(map);
    expect(packed['math.g2']['7'][0]).toBe('3');
    expect(packed['logic.g2']['7'][0]).toBe('1');
    expect(packed['math.g4']['7'][0]).toBe('2');
  });

  it('says nothing about a level nobody has scored on', () => {
    const { packed } = packProgress({ 'math.g2.L7.l1': at(0) });
    expect(packed['math.g2']).toBeUndefined();
  });

  it('leaves a composed lesson out of the plain progress', () => {
    const { progress } = packProgress(played(3));
    expect(Object.keys(progress).some((id) => id.includes('.L'))).toBe(false);
  });
});

describe('the stars survive the round trip', () => {
  const roundTrip = (map: ProgressMap): ProgressMap => {
    const { progress, packed } = packProgress(map);
    return unpackProgress(progress, packed, 'math');
  };

  it('gives every star back, exactly', () => {
    const before = played(12);
    const after = roundTrip(before);
    const lost = Object.entries(before)
      .filter(([id, stop]) => (after[id]?.stars ?? 0) !== stop.stars)
      .map(([id, stop]) => `${id}: ${stop.stars} -> ${after[id]?.stars ?? 'gone'}`);
    expect(lost).toEqual([]);
  });

  it('gives back every lesson that had a star', () => {
    const before = played(12);
    const scored = Object.entries(before).filter(([, s]) => s.stars > 0);
    const after = roundTrip(before);
    expect(scored.every(([id]) => id in after)).toBe(true);
  });

  it('holds up across a long run of levels', () => {
    const before = played(200);
    const after = roundTrip(before);
    expect(after['math.g2.L206.l10'].stars).toBe(before['math.g2.L206.l10'].stars);
  });

  /** Deliberately lost: nothing reads either, and they are most of the bytes. */
  it('does not pretend to have kept the score or the date', () => {
    const after = roundTrip({ 'math.g2.L7.l3': at(3, '2026-01-01T00:00:00.000Z') });
    expect(after['math.g2.L7.l3'].clearedAt).toBe('');
    // What it does give back is consistent with the stars it kept.
    expect(after['math.g2.L7.l3'].bestPercent).toBe(100);
  });

  it('leaves what the device already knew alone', () => {
    const mine: ProgressMap = { 'math.g2.L7.l1': at(3, '2026-01-01T00:00:00.000Z') };
    const after = unpackProgress(mine, { 'math.g2': { '7': '1000000000' } }, 'math');
    // The local record is richer, so it wins over the rebuilt one.
    expect(after['math.g2.L7.l1'].clearedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('only unpacks the map it was asked for', () => {
    const after = unpackProgress({}, { 'logic.g2': { '7': '3333333333' } }, 'math');
    expect(after).toEqual({});
  });

  it('survives a blob with no packed half at all', () => {
    expect(unpackProgress({ 'g2-l1': at(2) }, undefined, 'math')).toEqual({ 'g2-l1': at(2) });
  });

  it('ignores digits that are not stars', () => {
    const after = unpackProgress({}, { 'math.g2': { '7': 'x9-1......' } }, 'math');
    // Only the readable 1 survives, in its own place.
    expect(Object.keys(after)).toEqual(['math.g2.L7.l4']);
  });
});

describe('purchases worth remembering', () => {
  const progress = (over: Partial<Record<Subject, ProgressMap>> = {}) => ({
    math: {},
    reading: {},
    logic: {},
    ...over,
  });

  /**
   * `stopState` returns 'cleared' before it looks at the purchase list, so a
   * purchase for a lesson with a star on it can never be read again.
   */
  it('drops a purchase for a lesson already passed', () => {
    const unlocks = { math: ['g1-l2', 'g1-l3'], reading: [], logic: [] };
    const pruned = pruneUnlocks(unlocks, progress({ math: { 'g1-l2': at(2) } }));
    expect(pruned.math).toEqual(['g1-l3']);
  });

  /** The frontier is the whole point: bought, paid for, not yet played. */
  it('keeps a purchase the child has not played yet', () => {
    const unlocks = { math: ['math.g2.L9.l4'], reading: [], logic: [] };
    expect(pruneUnlocks(unlocks, progress()).math).toEqual(['math.g2.L9.l4']);
  });

  it('keeps one bought but failed, which is still bought', () => {
    const unlocks = { math: ['g1-l2'], reading: [], logic: [] };
    const pruned = pruneUnlocks(unlocks, progress({ math: { 'g1-l2': at(0) } }));
    expect(pruned.math).toEqual(['g1-l2']);
  });

  it('keeps the maps apart', () => {
    const unlocks = { math: ['x'], reading: [], logic: ['x'] };
    const pruned = pruneUnlocks(unlocks, progress({ math: { x: at(3) } }));
    expect(pruned.math).toEqual([]);
    expect(pruned.logic).toEqual(['x']);
  });

  it('is fine with nothing bought at all', () => {
    expect(pruneUnlocks(emptyUnlocks(), progress())).toEqual(emptyUnlocks());
  });
});

describe('the size it was all for', () => {
  /**
   * The server refuses a profile over 256 KiB and says nothing a child could
   * act on, so this is the test that says the format still earns its keep.
   * Two children at level 100 came to 428 KiB before.
   */
  it('keeps a long-played family well inside the cap', () => {
    const { progress, packed } = packProgress(played(100));
    const oneChild = JSON.stringify({ progress, packed }).length;
    // Four children, and still a fraction of the 256 KiB the server allows.
    expect(oneChild * 4).toBeLessThan(120 * 1024);
  });

  it('grows by about sixty bytes a level, not eight hundred', () => {
    const small = JSON.stringify(packProgress(played(10))).length;
    const large = JSON.stringify(packProgress(played(110))).length;
    expect((large - small) / 100).toBeLessThan(80);
  });
});
