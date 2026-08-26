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
  updateWaiting,
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

  /**
   * Rolling back is publishing an earlier manifest, so a client that only
   * ever moved forwards could never follow one. What decides a promotion is
   * whether the bytes differ, not what the manifest is numbered.
   */
  it('follows a rollback to earlier content', async () => {
    const live = descriptor('math.g1', 9);
    await stagePack('a', live, body('math.g1', 9));
    writeIndex('a', index({ manifestVersion: 9, packs: { 'math.g1': live } }));

    const rolledBack = descriptor('math.g1', 1);
    await stagePack('b', rolledBack, body('math.g1', 1));
    writeIndex('b', index({ manifestVersion: 4, packs: { 'math.g1': rolledBack } }));

    expect(promoteIfReady().promoted).toBe(true);
    expect(readPack(activeSlot(), 'math.g1')).toEqual({
      kind: 'math',
      id: 'math.g1',
      version: 1,
    });
  });

  /**
   * A content server rebuilt from a clean checkout has no memory of the
   * versions it published before, so it starts again at 1. That must not
   * make genuinely new content look like content already seen.
   */
  it('promotes changed content even when the manifest version has not moved', async () => {
    const before = descriptor('math.g1', 1);
    await stagePack('a', before, body('math.g1', 1));
    writeIndex('a', index({ manifestVersion: 1, packs: { 'math.g1': before } }));

    const after = descriptor('math.g1', 1);
    // Same id, same version number — different bytes.
    const changed = JSON.stringify({ kind: 'math', id: 'math.g1', version: 1, extra: true });
    const descriptorForChanged = { ...after, sha256: sha(changed) };
    await stagePack('b', descriptorForChanged, changed);
    writeIndex('b', index({ manifestVersion: 1, packs: { 'math.g1': descriptorForChanged } }));

    expect(promoteIfReady().promoted).toBe(true);
  });

  it('does not promote a staged set identical to the live one', async () => {
    const same = descriptor('math.g1', 2);
    await stagePack('a', same, body('math.g1', 2));
    writeIndex('a', index({ manifestVersion: 5, packs: { 'math.g1': same } }));
    await stagePack('b', same, body('math.g1', 2));
    writeIndex('b', index({ manifestVersion: 6, packs: { 'math.g1': same } }));

    expect(promoteIfReady().promoted).toBe(false);
  });

  it('does not let an empty staged slot wipe the live content', async () => {
    const live = descriptor('math.g1', 2);
    await stagePack('a', live, body('math.g1', 2));
    writeIndex('a', index({ manifestVersion: 5, packs: { 'math.g1': live } }));
    writeIndex('b', index({ manifestVersion: 6, packs: {} }));

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

describe('after a promotion', () => {
  it('drops the superseded slot instead of leaving it looking like an update', async () => {
    const before = descriptor('math.g1', 1);
    await stagePack('a', before, body('math.g1', 1));
    writeIndex('a', index({ manifestVersion: 1, packs: { 'math.g1': before } }));

    const changed = { ...descriptor('math.g1', 2), sha256: sha(body('math.g1', 2)) };
    await stagePack('b', changed, body('math.g1', 2));
    writeIndex('b', index({ manifestVersion: 2, packs: { 'math.g1': changed } }));

    expect(promoteIfReady().promoted).toBe(true);
    expect(activeSlot()).toBe('b');

    // The old slot is gone, so it cannot masquerade as a pending update...
    expect(hasPack('a', 'math.g1')).toBe(false);
    expect(readIndex('a')).toBeNull();
    expect(updateWaiting()).toBe(false);

    // ...and a second launch has nothing left to do.
    expect(promoteIfReady()).toEqual({ promoted: false, slot: 'b' });
  });

  it('does not report an update waiting when there is none', async () => {
    const only = descriptor('math.g1', 1);
    await stagePack('a', only, body('math.g1', 1));
    writeIndex('a', index({ packs: { 'math.g1': only } }));
    expect(updateWaiting()).toBe(false);
  });
});
