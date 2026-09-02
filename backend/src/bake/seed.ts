/**
 * Bakes the copy of the content that ships inside the app.
 *
 * A fresh install has to be playable before it has ever reached the server —
 * on a plane, on a locked-down school tablet, or simply while the first
 * download is still running. So a complete set of packs is bundled into the
 * binary and used until a newer one has been fetched and verified.
 *
 * They are baked at a shallower pool depth than the served packs. Depth is
 * what stops a child seeing the same question twice, and it is also almost
 * all of the file size — so the bundled copy trades variety for install
 * size, and gets the full-depth version on the first update.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Manifest, Pack, PackDescriptor, SCHEMA_VERSION } from '../contract';
import { MIN_APP_VERSION } from './config';
import { buildPacks } from './packs';
import { stampAndPersist } from './stamps';

const here = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = join(here, '..', '..', '..', 'frontend', 'assets', 'seed');

/**
 * How deep the bundled pools go. Shallow on purpose — see the note above.
 * `pools.ts` reads its depth from `config.ts`, so this trims after the fact
 * rather than re-baking, which also guarantees the bundled questions are a
 * subset of the served ones.
 */
const SEED_DEPTH = { math: 30, logic: 20 };

const trim = <T,>(pools: Record<string, T[]>, depth: number): Record<string, T[]> =>
  Object.fromEntries(
    Object.entries(pools).map(([key, questions]) => [key, questions.slice(0, depth)]),
  );

/** The bundled body for a pack: the full one, with its pools cut short. */
function shallow(body: Pack): Pack {
  if (body.kind === 'math') return { ...body, pools: trim(body.pools, SEED_DEPTH.math) };
  if (body.kind === 'logic') return { ...body, pools: trim(body.pools, SEED_DEPTH.logic) };
  return body;
}

export function bakeSeed(): { files: number; bytes: number } {
  rmSync(SEED_DIR, { recursive: true, force: true });
  mkdirSync(SEED_DIR, { recursive: true });

  const built = buildPacks();
  // Stamped from the full-depth bodies, exactly as the served bake stamps
  // them, so the same checkout gives the bundled and served copies of a pack
  // the same date and the client's comparison means something.
  const stamps = stampAndPersist(built);

  let bytes = 0;
  const write = (name: string, body: unknown): string => {
    const text = JSON.stringify(body);
    writeFileSync(join(SEED_DIR, name), text, 'utf8');
    bytes += Buffer.byteLength(text, 'utf8');
    return text;
  };

  const descriptors: PackDescriptor[] = [];
  for (const { id, body } of built) {
    const text = write(`${id}.json`, shallow(body));
    descriptors.push({
      id,
      // Zero, so a served pack outranks a bundled one whenever the two are
      // the same age. Freshness is decided by `bakedAt`; this stays as the
      // tie-break it always was.
      version: 0,
      sha256: createHash('sha256').update(text, 'utf8').digest('hex'),
      // Bundled packs are read from the binary, never fetched.
      url: '',
      bytes: Buffer.byteLength(text, 'utf8'),
      schemaVersion: SCHEMA_VERSION,
      minAppVersion: MIN_APP_VERSION,
      bakedAt: stamps[id]?.bakedAt,
    });
  }

  /*
    Previously `packs: []`, which left the app with nothing to say about what
    it was carrying. The descriptors are what let `Library` notice that the
    binary holds newer content than the cache and prefer it.
  */
  const manifest: Manifest = {
    manifestVersion: 0,
    generatedAt: new Date(0).toISOString(),
    minSupportedApp: MIN_APP_VERSION,
    packs: descriptors,
  };
  write('manifest.json', manifest);

  return { files: readdirSync(SEED_DIR).length, bytes };
}

if (process.argv[1]?.endsWith('seed.ts')) {
  const { files, bytes } = bakeSeed();
  console.log(`seed packs  ${files} files, ${(bytes / 1024 / 1024).toFixed(2)} MB into frontend/assets/seed/`);
}
