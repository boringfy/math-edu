/**
 * Bakes every pack and writes the manifest.
 *
 * The output is content-addressed: a pack's filename carries the first 12
 * hex of its SHA-256, so publishing new content never overwrites old
 * content. That is what lets pack URLs be cached for ever, and what makes a
 * rollback nothing more than restoring an earlier manifest.
 *
 * Pack versions are derived from the hash rather than incremented blindly,
 * so re-baking unchanged content is a no-op that leaves every client alone.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  GRADES,
  Manifest,
  Pack,
  PackDescriptor,
  PackId,
  SCHEMA_VERSION,
} from '../contract';
import { LESSONS } from '../content/lessons';
import { PUZZLE_SETS } from '../content/puzzles';
import { RULES } from '../content/rules';
import { STORIES } from '../content/stories';
import { BAKE_SEED, DIST_DIR, MIN_APP_VERSION } from './config';
import { logicPools, mathPools } from './pools';

const sha256 = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

/**
 * A pack's version. Two bakes of the same content must agree on it, and it
 * has to increase when the content changes — but it also has to be an
 * integer the client can compare, and hashes do not order.
 *
 * So it comes from the previous manifest: unchanged hash keeps its version,
 * changed hash takes the next one up. A missing previous manifest starts
 * everything at 1, which is also what a clean checkout does.
 */
function versionFor(id: PackId, hash: string, previous: Manifest | null): number {
  const before = previous?.packs.find((p) => p.id === id);
  if (!before) return 1;
  return before.sha256 === hash ? before.version : before.version + 1;
}

function readPreviousManifest(): Manifest | null {
  try {
    return JSON.parse(readFileSync(join(DIST_DIR, 'manifest.json'), 'utf8')) as Manifest;
  } catch {
    return null;
  }
}

/** Builds every pack body, before hashing or versioning. */
function buildPacks(): { id: PackId; body: Pack }[] {
  const packs: { id: PackId; body: Pack }[] = [];

  for (const grade of GRADES) {
    packs.push({
      id: `math.g${grade}`,
      body: {
        kind: 'math',
        schemaVersion: SCHEMA_VERSION,
        grade,
        catalog: LESSONS[grade],
        pools: mathPools(grade),
      },
    });
    packs.push({
      id: `reading.g${grade}`,
      body: {
        kind: 'reading',
        schemaVersion: SCHEMA_VERSION,
        grade,
        catalog: STORIES[grade],
      },
    });
    packs.push({
      id: `logic.g${grade}`,
      body: {
        kind: 'logic',
        schemaVersion: SCHEMA_VERSION,
        grade,
        catalog: PUZZLE_SETS[grade],
        pools: logicPools(grade),
      },
    });
  }

  packs.push({
    id: 'rules',
    body: { kind: 'rules', schemaVersion: SCHEMA_VERSION, rules: RULES },
  });

  return packs;
}

export function bake(): Manifest {
  const previous = readPreviousManifest();
  const packsDir = join(DIST_DIR, 'packs');
  rmSync(packsDir, { recursive: true, force: true });
  mkdirSync(packsDir, { recursive: true });

  const descriptors: PackDescriptor[] = [];

  for (const { id, body } of buildPacks()) {
    // One hash, over exactly the bytes that will be served and exactly the
    // bytes the client will verify. The version is derived from it and kept
    // in the manifest, so republishing identical content is a no-op.
    const text = JSON.stringify(body);
    const hash = sha256(text);
    const version = versionFor(id, hash, previous);
    const file = `${id}.${hash.slice(0, 12)}.json`;

    writeFileSync(join(packsDir, file), text, 'utf8');
    descriptors.push({
      id,
      version,
      sha256: hash,
      url: `/packs/${file}`,
      bytes: Buffer.byteLength(text, 'utf8'),
      schemaVersion: SCHEMA_VERSION,
      minAppVersion: MIN_APP_VERSION,
    });
  }

  const changed = descriptors.filter(
    (d) => previous?.packs.find((p) => p.id === d.id)?.version !== d.version,
  );

  const manifest: Manifest = {
    manifestVersion: (previous?.manifestVersion ?? 0) + (changed.length > 0 ? 1 : 0),
    generatedAt: new Date().toISOString(),
    minSupportedApp: MIN_APP_VERSION,
    packs: descriptors,
  };

  writeFileSync(join(DIST_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}

/** Only runs the bake when invoked directly, so tests can import `bake`. */
if (process.argv[1]?.endsWith('bake.ts')) {
  const manifest = bake();
  const total = manifest.packs.reduce((sum, p) => sum + p.bytes, 0);
  console.log(`seed        ${BAKE_SEED}`);
  console.log(`manifest    v${manifest.manifestVersion}`);
  for (const p of manifest.packs) {
    console.log(`  ${p.id.padEnd(12)} v${String(p.version).padEnd(3)} ${(p.bytes / 1024).toFixed(0).padStart(5)} KB  ${p.sha256.slice(0, 12)}`);
  }
  console.log(`total       ${(total / 1024 / 1024).toFixed(2)} MB across ${manifest.packs.length} packs`);
}
