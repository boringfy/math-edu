/**
 * The cache is where an update can go wrong quietly: a slot promoted with a
 * hole in it, a stale pack surviving a promotion, a truncated download
 * accepted because nobody checked. So these run against a real in-memory
 * filesystem and a real SHA-256 rather than mocks that always agree.
 */

import { createHash } from 'crypto';

import {
  activeSlot,
  carryOver,
  discardStaged,
  hasPack,
  promoteIfReady,
  readIndex,
  readPack,
  stagingSlot,
  stagePack,
  writeIndex,
} from '../cache';
import { CacheIndex, PackDescriptor } from '../contract';

const fs = require('expo-file-system');

const sha = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

const body = (id: string, version: number): string =>
  JSON.stringify({ kind: 'math', id, version });

const descriptor = (id: string, version: number): PackDescriptor => ({
  id: id as PackDescriptor['id'],
  version,
  sha256: sha(body(id, version)),
  url: `/packs/${id}.json`,
  bytes: body(id, version).length,
  schemaVersion: 1,
  minAppVersion: '1.0.0',
});

const index = (over: Partial<CacheIndex> = {}): CacheIndex => ({
  manifestVersion: 1,
  packs: {},
  checkedAt: '2026-08-24T00:00:00.000Z',
  ...over,
});

beforeEach(() => fs.__reset());

describe('slots', () => {
  it('starts on slot a, staging into b', () => {
    expect(activeSlot()).toBe('a');
    expect(stagingSlot()).toBe('b');
  });
});

describe('stagePack', () => {
  it('stores a pack whose hash matches', async () => {
    const d = descriptor('math.g1', 2);
    const result = await stagePack('b', d, body('math.g1', 2));
    expect(result).toEqual({ ok: true });
    expect(hasPack('b', 'math.g1')).toBe(true);
    expect(readPack('b', 'math.g1')).toEqual({ kind: 'math', id: 'math.g1', version: 2 });
  });

  it('refuses a pack whose hash does not match', async () => {
    const d = descriptor('math.g1', 2);
    const result = await stagePack('b', d, body('math.g1', 2) + ' truncated');
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain('sha256 mismatch');
    // Nothing is written, so a bad download cannot be promoted later.
    expect(hasPack('b', 'math.g1')).toBe(false);
  });

  it('refuses a body that is not JSON even when the hash agrees', async () => {
    const text = 'not json at all';
    const d = { ...descriptor('math.g1', 2), sha256: sha(text) };
    const result = await stagePack('b', d, text);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe('not valid JSON');
  });
});

describe('promoteIfReady', () => {
  it('does nothing when nothing is staged', () => {
    expect(promoteIfReady()).toEqual({ promoted: false, slot: 'a' });
  });

  it('promotes a complete, newer staged set', async () => {
    const d = descriptor('math.g1', 2);
    await stagePack('b', d, body('math.g1', 2));
    writeIndex('b', index({ manifestVersion: 5, packs: { 'math.g1': d } }));

    expect(promoteIfReady()).toEqual({ promoted: true, slot: 'b' });
    expect(activeSlot()).toBe('b');
    // And the app now reads the new content.
    expect(readPack(activeSlot(), 'math.g1')).toEqual({
      kind: 'math',
      id: 'math.g1',
      version: 2,
    });
  });

  it('refuses to promote a set with a pack missing', async () => {
    const present = descriptor('math.g1', 2);
    await stagePack('b', present, body('math.g1', 2));
    // The index claims two packs but only one was ever written.
    writeIndex(
      'b',
      index({ manifestVersion: 5, packs: { 'math.g1': present, 'math.g2': descriptor('math.g2', 2) } }),
    );

    expect(promoteIfReady()).toEqual({ promoted: false, slot: 'a' });
    expect(activeSlot()).toBe('a');
  });

  it('refuses to promote content older than what is already live', async () => {
    writeIndex('a', index({ manifestVersion: 9 }));
    const d = descriptor('math.g1', 1);
    await stagePack('b', d, body('math.g1', 1));
    writeIndex('b', index({ manifestVersion: 4, packs: { 'math.g1': d } }));

    expect(promoteIfReady().promoted).toBe(false);
    expect(activeSlot()).toBe('a');
  });

  it('is not fooled into promoting twice', async () => {
    const d = descriptor('math.g1', 2);
    await stagePack('b', d, body('math.g1', 2));
    writeIndex('b', index({ manifestVersion: 5, packs: { 'math.g1': d } }));

    expect(promoteIfReady().promoted).toBe(true);
    // Slot a is now staging and holds nothing, so a second launch sits still.
    expect(promoteIfReady()).toEqual({ promoted: false, slot: 'b' });
  });
});

describe('carryOver', () => {
  it('fills the staging slot with packs that did not change', async () => {
    const unchanged = descriptor('reading.g1', 1);
    await stagePack('a', unchanged, body('reading.g1', 1));

    const changed = descriptor('math.g1', 2);
    await stagePack('b', changed, body('math.g1', 2));

    carryOver('a', 'b', [changed, unchanged]);

    expect(hasPack('b', 'math.g1')).toBe(true);
    expect(hasPack('b', 'reading.g1')).toBe(true);
  });

  it('never overwrites a freshly downloaded pack with the old one', async () => {
    await stagePack('a', descriptor('math.g1', 1), body('math.g1', 1));
    await stagePack('b', descriptor('math.g1', 2), body('math.g1', 2));

    carryOver('a', 'b', [descriptor('math.g1', 2)]);

    expect(readPack('b', 'math.g1')).toEqual({ kind: 'math', id: 'math.g1', version: 2 });
  });
});

describe('discardStaged', () => {
  it('throws away a half-finished attempt', async () => {
    await stagePack('b', descriptor('math.g1', 2), body('math.g1', 2));
    expect(hasPack('b', 'math.g1')).toBe(true);

    discardStaged();
    expect(hasPack('b', 'math.g1')).toBe(false);
    // The live slot is untouched.
    expect(activeSlot()).toBe('a');
  });
});

describe('readIndex', () => {
  it('returns null rather than throwing when a slot is empty', () => {
    expect(readIndex('a')).toBeNull();
  });

  it('round-trips an index', () => {
    const written = index({ manifestVersion: 7, etag: '"abc"' });
    writeIndex('a', written);
    expect(readIndex('a')).toEqual(written);
  });
});
