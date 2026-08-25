/**
 * What the app decides to fetch, and how it behaves when the network is
 * unhelpful. Every failure here has to be survivable: a child with no signal
 * gets yesterday's app, never a broken one.
 */

import { CHECK_INTERVAL_MS, isThrottled, meetsVersion, packsToFetch } from '../updater';
import { CacheIndex, Manifest, PackDescriptor, SCHEMA_VERSION } from '../contract';

const pack = (over: Partial<PackDescriptor> = {}): PackDescriptor => ({
  id: 'math.g1',
  version: 2,
  sha256: 'a'.repeat(64),
  url: '/packs/math.g1.aaa.json',
  bytes: 100,
  schemaVersion: SCHEMA_VERSION,
  minAppVersion: '1.0.0',
  ...over,
});

const manifest = (packs: PackDescriptor[]): Manifest => ({
  manifestVersion: 4,
  generatedAt: '2026-08-24T00:00:00.000Z',
  minSupportedApp: '1.0.0',
  packs,
});

const index = (packs: Record<string, PackDescriptor>, checkedAt?: string): CacheIndex => ({
  manifestVersion: 3,
  packs,
  checkedAt: checkedAt ?? '2026-08-24T00:00:00.000Z',
});

describe('meetsVersion', () => {
  it('compares each segment as a number, not as text', () => {
    // The bug this exists to prevent: "1.2.10" < "1.2.9" lexicographically.
    expect(meetsVersion('1.2.10', '1.2.9')).toBe(true);
    expect(meetsVersion('1.2.9', '1.2.10')).toBe(false);
  });

  it('treats an equal version as good enough', () => {
    expect(meetsVersion('1.4.0', '1.4.0')).toBe(true);
  });

  it('handles versions of different lengths', () => {
    expect(meetsVersion('2', '1.9.9')).toBe(true);
    expect(meetsVersion('1.0', '1.0.0')).toBe(true);
    expect(meetsVersion('1.0.0', '1.0.1')).toBe(false);
  });

  it('does not throw on a malformed version', () => {
    expect(meetsVersion('', '1.0.0')).toBe(false);
    expect(meetsVersion('banana', '1.0.0')).toBe(false);
  });
});

describe('packsToFetch', () => {
  it('takes everything when nothing is cached', () => {
    expect(packsToFetch(manifest([pack()]), null, '1.0.0')).toHaveLength(1);
  });

  it('skips a pack already held at the same version and hash', () => {
    const p = pack();
    expect(packsToFetch(manifest([p]), index({ 'math.g1': p }), '1.0.0')).toEqual([]);
  });

  it('takes a pack whose version moved up', () => {
    const held = pack({ version: 1 });
    expect(packsToFetch(manifest([pack({ version: 2 })]), index({ 'math.g1': held }), '1.0.0'))
      .toHaveLength(1);
  });

  it('takes a pack whose hash changed even at the same version', () => {
    // Belt and braces: a republished pack must not be missed.
    const held = pack({ sha256: 'b'.repeat(64) });
    expect(packsToFetch(manifest([pack()]), index({ 'math.g1': held }), '1.0.0')).toHaveLength(1);
  });

  it('skips content that needs a newer app than this one', () => {
    // The forward-compatibility rule: an old build keeps what it has rather
    // than downloading something it cannot render.
    const future = pack({ minAppVersion: '2.0.0' });
    expect(packsToFetch(manifest([future]), null, '1.4.0')).toEqual([]);
  });

  it('skips content from a schema this build does not know', () => {
    const future = pack({ schemaVersion: SCHEMA_VERSION + 1 });
    expect(packsToFetch(manifest([future]), null, '1.0.0')).toEqual([]);
  });

  it('takes the readable packs and leaves the rest', () => {
    const wanted = packsToFetch(
      manifest([
        pack({ id: 'math.g1' }),
        pack({ id: 'math.g2', minAppVersion: '9.0.0' }),
        pack({ id: 'math.g3' }),
      ]),
      null,
      '1.0.0',
    );
    expect(wanted.map((p) => p.id)).toEqual(['math.g1', 'math.g3']);
  });
});

describe('isThrottled', () => {
  const now = Date.parse('2026-08-24T12:00:00.000Z');

  it('holds off just after a check', () => {
    expect(isThrottled(index({}, new Date(now - 1000).toISOString()), now)).toBe(true);
  });

  it('allows a check once the interval has passed', () => {
    const long = new Date(now - CHECK_INTERVAL_MS - 1000).toISOString();
    expect(isThrottled(index({}, long), now)).toBe(false);
  });

  it('allows a check when nothing has ever been checked', () => {
    expect(isThrottled(null, now)).toBe(false);
  });

  it('allows a check when the stored timestamp is nonsense', () => {
    expect(isThrottled(index({}, 'not a date'), now)).toBe(false);
  });
});
