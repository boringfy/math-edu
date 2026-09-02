/**
 * When each pack's content last actually changed.
 *
 * The app carries a full set of packs in its binary and also downloads them,
 * and something has to decide which copy of `reading.g2` is the newer one.
 * Nothing already in the manifest can answer that:
 *
 *   - `version` restarts at 1 on a clean build, because `versionFor` reads
 *     the previous manifest and a Docker image is built without one. In
 *     production it has always been 1.
 *   - `sha256` says *whether* two copies differ, never which came first.
 *   - `generatedAt` is when the bake ran. Rebuilding an old checkout would
 *     stamp stale content as fresh, which is the same bug wearing a hat.
 *
 * So the stamp is committed to the repo and keyed on a hash of the pack's
 * *source*. Both bakes read the same file and hash the same full-depth body,
 * so a given checkout always produces the same stamps — including in a clean
 * container, which is the case that matters. A stamp only moves when the
 * content behind it moves.
 *
 * The file is small, human-readable and reviewable: a content change shows up
 * in a pull request as a date moving forward, next to the content that moved
 * it.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PackId } from '../contract';
import { BuiltPack } from './packs';

const here = dirname(fileURLToPath(import.meta.url));

/** Committed, and read by both bakes. */
export const STAMPS_FILE = join(here, '..', 'content', 'bakedAt.json');

export interface Stamp {
  /** First 12 hex of the SHA-256 of the full-depth body. */
  source: string;
  /** ISO 8601. Moves only when `source` moves. */
  bakedAt: string;
}

export type Stamps = Record<string, Stamp>;

/**
 * The identity of a pack's content.
 *
 * Taken from the full-depth body so the seed bake — which serves the same
 * content with shallower pools — arrives at the same answer. Hashing what
 * each bake happens to emit instead would make the two disagree on every
 * pack, for ever, and the comparison would be worthless.
 */
export const sourceHash = (body: unknown): string =>
  createHash('sha256').update(JSON.stringify(body), 'utf8').digest('hex').slice(0, 12);

export function readStamps(file = STAMPS_FILE): Stamps {
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
    return parsed && typeof parsed === 'object' ? (parsed as Stamps) : {};
  } catch {
    // No file yet, or an unreadable one. Everything is then "new", which
    // stamps this bake's time on every pack — correct for a first run and
    // harmless afterwards, since the file is committed.
    return {};
  }
}

/**
 * The stamps this set of packs should carry.
 *
 * Pure, so the tests do not need a filesystem and a bake run inside a test
 * cannot write over the committed file. Returns the whole map rather than
 * mutating, and reports whether anything moved so a caller can skip the
 * write — a bake of unchanged content must leave the tree alone.
 */
export function stampPacks(
  packs: BuiltPack[],
  previous: Stamps,
  now: string,
): { stamps: Stamps; changed: PackId[] } {
  const stamps: Stamps = { ...previous };
  const changed: PackId[] = [];

  for (const { id, body } of packs) {
    const source = sourceHash(body);
    const before = previous[id];
    if (before?.source === source && typeof before.bakedAt === 'string') continue;
    stamps[id] = { source, bakedAt: now };
    changed.push(id);
  }

  return { stamps, changed };
}

/** Writes the stamps back, sorted, so the committed diff is readable. */
export function writeStamps(stamps: Stamps, file = STAMPS_FILE): void {
  const sorted = Object.fromEntries(Object.entries(stamps).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(file, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
}

/**
 * Reads, stamps, and persists — the whole job, for a bake that wants it.
 *
 * A failed write is not fatal. The image build runs a bake from a clean
 * checkout where nothing should have changed, and if something has, serving
 * the content still matters more than recording the date.
 */
export function stampAndPersist(packs: BuiltPack[], now = new Date().toISOString()): Stamps {
  const { stamps, changed } = stampPacks(packs, readStamps(), now);
  if (changed.length > 0) {
    try {
      writeStamps(stamps);
    } catch {
      /* read-only tree; the stamps still apply to this bake's output */
    }
  }
  return stamps;
}
