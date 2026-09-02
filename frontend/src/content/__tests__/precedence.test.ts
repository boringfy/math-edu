/**
 * Which copy of a pack the app plays from.
 *
 * The app holds two: one in the binary and one it downloaded. The download
 * normally wins — that is what publishing content is for, and it carries
 * deeper pools. But it used to win merely by existing, which meant a device
 * that had downloaded `reading.g2` once kept that copy for ever. Sixty new
 * stories shipped inside an app build and never appeared, because the server
 * they had been published from had not been redeployed yet.
 *
 * So these tests are about one question: when does the binary get to win, and
 * — just as important — when must it not.
 */

import { Library, bundledIsNewer } from '../library';
import { PackId } from '../contract';
import { SEED_PACKS } from '../seed';
import { Grade, Story } from '../../types';

const OLD = '2026-01-01T00:00:00.000Z';
const NEW = '2026-09-01T00:00:00.000Z';

/**
 * A real reading pack with its first story renamed, so the two copies are
 * genuinely valid content and tell each other apart by title. Building one by
 * hand would only test whether the fixture happened to satisfy the decoder.
 */
const readingPack = (title: string): unknown => {
  const pack = JSON.parse(JSON.stringify(SEED_PACKS['reading.g2'])) as {
    catalog: { title: string }[];
  };
  pack.catalog[0].title = title;
  return pack;
};

const DOWNLOADED = readingPack('from the server');
const BUNDLED = readingPack('from the binary');

interface Case {
  downloaded?: unknown;
  bundled?: unknown;
  downloadedAt?: string | null;
  bundledAt?: string | null;
}

const titleFrom = ({
  downloaded = DOWNLOADED,
  bundled = BUNDLED,
  downloadedAt = null,
  bundledAt = null,
}: Case): string | undefined => {
  const library = new Library(
    (id: PackId) => (id === 'reading.g2' ? downloaded : null),
    (id: PackId) => (id === 'reading.g2' ? bundled : null),
    { downloaded: () => downloadedAt, bundled: () => bundledAt },
  );
  return (library.stories(2 as Grade) as Story[])[0]?.title;
};

describe('bundledIsNewer', () => {
  it('is true only when the binary is strictly newer', () => {
    expect(bundledIsNewer(NEW, OLD)).toBe(true);
    expect(bundledIsNewer(OLD, NEW)).toBe(false);
    expect(bundledIsNewer(OLD, OLD)).toBe(false);
  });

  /** With nothing to compare on the binary's side, the download keeps its place. */
  it('never promotes an unstamped binary', () => {
    expect(bundledIsNewer(null, OLD)).toBe(false);
    expect(bundledIsNewer(null, null)).toBe(false);
    expect(bundledIsNewer('not a date', OLD)).toBe(false);
  });

  /**
   * A stamped binary beats an unstamped download. Every bake since stamps
   * existed writes one, so a cache index without one provably predates a
   * binary that has one — which is the state of every device in the field.
   */
  it('beats a download that predates stamping', () => {
    expect(bundledIsNewer(NEW, null)).toBe(true);
    expect(bundledIsNewer(NEW, 'not a date')).toBe(true);
  });
});

describe('which copy is played', () => {
  it('takes the download when neither side is stamped', () => {
    // The behaviour every existing install has, and the one a cache index
    // written before stamps existed must keep.
    expect(titleFrom({})).toBe('from the server');
  });

  it('takes the download when it is the newer one', () => {
    expect(titleFrom({ downloadedAt: NEW, bundledAt: OLD })).toBe('from the server');
  });

  it('takes the download when the two are the same age', () => {
    expect(titleFrom({ downloadedAt: OLD, bundledAt: OLD })).toBe('from the server');
  });

  /** The bug this was built for: new content in the binary, stale server. */
  it('takes the binary when it is the newer one', () => {
    expect(titleFrom({ downloadedAt: OLD, bundledAt: NEW })).toBe('from the binary');
  });

  it('takes the download when only it is stamped', () => {
    expect(titleFrom({ downloadedAt: OLD, bundledAt: null })).toBe('from the server');
  });

  /**
   * The state the tablet was actually in: a pack downloaded before stamps
   * existed, and a binary built after them carrying newer content. Before
   * this, the 60-story download won and the 120 stories in the app were
   * unreachable.
   */
  it('takes the binary over a download from before stamping', () => {
    expect(titleFrom({ downloadedAt: null, bundledAt: NEW })).toBe('from the binary');
  });
});

describe('a bad copy never takes the grade down with it', () => {
  it('falls back to the binary when the download will not decode', () => {
    expect(titleFrom({ downloaded: { kind: 'nonsense' } })).toBe('from the binary');
  });

  it('falls back to the download when the newer binary will not decode', () => {
    expect(
      titleFrom({ bundled: { kind: 'nonsense' }, downloadedAt: OLD, bundledAt: NEW }),
    ).toBe('from the server');
  });

  it('reports the source it actually used', () => {
    const library = new Library(
      () => DOWNLOADED,
      () => BUNDLED,
      { downloaded: () => OLD, bundled: () => NEW },
    );
    library.stories(2 as Grade);
    expect(library.notes[0]).toMatchObject({ id: 'reading.g2', source: 'bundled' });
  });

  it('says why it fell back', () => {
    const library = new Library(
      () => ({ kind: 'nonsense' }),
      () => BUNDLED,
    );
    library.stories(2 as Grade);
    expect(library.notes[0].source).toBe('bundled');
    expect(library.notes[0].reason).toBeTruthy();
  });

  it('gives nothing when neither copy is usable', () => {
    expect(titleFrom({ downloaded: { kind: 'nonsense' }, bundled: null })).toBeUndefined();
  });
});
