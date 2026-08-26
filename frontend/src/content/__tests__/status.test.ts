/**
 * What the settings page reads.
 *
 * An app that updates itself quietly needs somewhere a grown-up can see
 * whether it is actually working, because a content server that has been
 * unreachable for a month looks exactly like one with nothing new to say.
 * These are the facts that tell those two apart.
 */

import { createHash } from 'crypto';

import { promoteIfReady, stagePack, writeIndex } from '../cache';
import { CacheIndex, PackDescriptor } from '../contract';
import { contentStatus } from '../index';

const fs = require('expo-file-system');

const sha = (t: string): string => createHash('sha256').update(t, 'utf8').digest('hex');
const body = (id: string) => JSON.stringify({ kind: 'math', id });

const descriptor = (id: string, version: number): PackDescriptor => ({
  id: id as PackDescriptor['id'],
  version,
  sha256: sha(body(id)),
  url: `/packs/${id}.json`,
  bytes: body(id).length,
  schemaVersion: 1,
  minAppVersion: '1.0.0',
});

const index = (over: Partial<CacheIndex> = {}): CacheIndex => ({
  manifestVersion: 1,
  packs: {},
  checkedAt: '2026-08-25T12:00:00.000Z',
  ...over,
});

beforeEach(() => fs.__reset());

describe('contentStatus', () => {
  it('says the app is on its bundled copy before anything is downloaded', () => {
    const status = contentStatus();
    expect(status.manifestVersion).toBe(0);
    expect(status.packs).toBe(0);
    expect(status.checkedAt).toBeNull();
    expect(status.pendingVersion).toBeNull();
  });

  it('reports the live manifest once content has been downloaded', () => {
    writeIndex('a', index({
      manifestVersion: 7,
      packs: { 'math.g1': descriptor('math.g1', 3), 'rules': descriptor('rules', 1) },
      checkedAt: '2026-08-25T12:00:00.000Z',
    }));

    const status = contentStatus();
    expect(status.manifestVersion).toBe(7);
    expect(status.packs).toBe(2);
    expect(status.checkedAt).toBe('2026-08-25T12:00:00.000Z');
  });

  it('announces an update that is downloaded and waiting for a restart', async () => {
    writeIndex('a', index({ manifestVersion: 7 }));
    await stagePack('b', descriptor('math.g1', 4), body('math.g1'));
    writeIndex('b', index({ manifestVersion: 8, packs: { 'math.g1': descriptor('math.g1', 4) } }));

    expect(contentStatus().pendingVersion).toBe(8);
  });

  it('stops announcing it once the restart has happened', async () => {
    writeIndex('a', index({ manifestVersion: 7 }));
    await stagePack('b', descriptor('math.g1', 4), body('math.g1'));
    writeIndex('b', index({ manifestVersion: 8, packs: { 'math.g1': descriptor('math.g1', 4) } }));

    expect(promoteIfReady().promoted).toBe(true);
    const status = contentStatus();
    expect(status.manifestVersion).toBe(8);
    expect(status.pendingVersion).toBeNull();
  });

  it('does not mistake stale staged content for a pending update', () => {
    // A slot left over from before an update that has already been activated.
    writeIndex('a', index({ manifestVersion: 9 }));
    writeIndex('b', index({ manifestVersion: 4 }));
    expect(contentStatus().pendingVersion).toBeNull();
  });
});
