/**
 * The stamps that tell two copies of a pack apart.
 *
 * What has to hold is narrow but load-bearing: the same content must always
 * produce the same date, and changed content must produce a later one. If the
 * first fails, every rebuild looks like new content and devices re-download
 * for nothing. If the second fails, the bug this was written for comes back.
 */

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { BuiltPack, buildPacks } from '../src/bake/packs';
import { STAMPS_FILE, Stamps, sourceHash, stampPacks } from '../src/bake/stamps';

const pack = (id: string, body: unknown): BuiltPack =>
  ({ id, body } as unknown as BuiltPack);

const OLD = '2026-01-01T00:00:00.000Z';
const NOW = '2026-09-01T00:00:00.000Z';

describe('a stamp moves only when the content moves', () => {
  it('keeps the date when the source is unchanged', () => {
    const packs = [pack('reading.g2', { a: 1 })];
    const previous: Stamps = {
      'reading.g2': { source: sourceHash({ a: 1 }), bakedAt: OLD },
    };
    const { stamps, changed } = stampPacks(packs, previous, NOW);
    expect(stamps['reading.g2'].bakedAt).toBe(OLD);
    expect(changed).toEqual([]);
  });

  it('moves the date forward when the source changes', () => {
    const previous: Stamps = {
      'reading.g2': { source: sourceHash({ a: 1 }), bakedAt: OLD },
    };
    const { stamps, changed } = stampPacks([pack('reading.g2', { a: 2 })], previous, NOW);
    expect(stamps['reading.g2'].bakedAt).toBe(NOW);
    expect(changed).toEqual(['reading.g2']);
  });

  it('stamps a pack it has never seen', () => {
    const { stamps, changed } = stampPacks([pack('logic.g1', { a: 1 })], {}, NOW);
    expect(stamps['logic.g1'].bakedAt).toBe(NOW);
    expect(changed).toEqual(['logic.g1']);
  });

  it('leaves other packs alone when one changes', () => {
    const previous: Stamps = {
      'math.g1': { source: sourceHash({ m: 1 }), bakedAt: OLD },
      'reading.g2': { source: sourceHash({ r: 1 }), bakedAt: OLD },
    };
    const { stamps, changed } = stampPacks(
      [pack('math.g1', { m: 1 }), pack('reading.g2', { r: 2 })],
      previous,
      NOW,
    );
    expect(stamps['math.g1'].bakedAt).toBe(OLD);
    expect(stamps['reading.g2'].bakedAt).toBe(NOW);
    expect(changed).toEqual(['reading.g2']);
  });

  /** A half-written entry must not be trusted into keeping a stale date. */
  it('restamps an entry with no usable date', () => {
    const previous = {
      'math.g1': { source: sourceHash({ m: 1 }) },
    } as unknown as Stamps;
    const { stamps } = stampPacks([pack('math.g1', { m: 1 })], previous, NOW);
    expect(stamps['math.g1'].bakedAt).toBe(NOW);
  });

  it('is idempotent — stamping its own output changes nothing', () => {
    const packs = [pack('math.g1', { m: 1 }), pack('reading.g2', { r: 1 })];
    const first = stampPacks(packs, {}, OLD).stamps;
    const second = stampPacks(packs, first, NOW);
    expect(second.stamps).toEqual(first);
    expect(second.changed).toEqual([]);
  });
});

describe('the source hash', () => {
  it('is stable across calls', () => {
    expect(sourceHash({ a: [1, 2], b: 'x' })).toBe(sourceHash({ a: [1, 2], b: 'x' }));
  });

  it('separates content that differs', () => {
    expect(sourceHash({ catalog: ['One'] })).not.toBe(sourceHash({ catalog: ['Two'] }));
  });

  /**
   * The point of hashing the full-depth body rather than what each bake
   * emits: the seed bake trims pools, so hashing its output would give every
   * pack a different identity from the served copy and the comparison the
   * client makes would be meaningless.
   */
  it('gives every real pack a distinct identity', () => {
    const hashes = buildPacks().map((p) => sourceHash(p.body));
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it('agrees with itself across two builds of the same tree', () => {
    const a = buildPacks().map((p) => `${p.id}:${sourceHash(p.body)}`);
    const b = buildPacks().map((p) => `${p.id}:${sourceHash(p.body)}`);
    expect(a).toEqual(b);
  });
});

/**
 * The gate that keeps the committed file honest.
 *
 * A content change that is not followed by `npm run seed -w backend` leaves
 * the bundled packs stamped with the old date, so the app would ship new
 * content that still loses to a stale download — the exact failure this was
 * built to end, quietly reintroduced.
 */
describe('the committed stamps match the content in the tree', () => {
  it('has a current entry for every pack', () => {
    const committed = JSON.parse(readFileSync(STAMPS_FILE, 'utf8')) as Stamps;
    const stale = buildPacks()
      .filter(({ id, body }) => committed[id]?.source !== sourceHash(body))
      .map(({ id }) => `${id} — content changed; run \`npm run seed -w backend\``);
    expect(stale).toEqual([]);
  });
});
