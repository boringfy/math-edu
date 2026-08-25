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

import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { GRADES, Manifest, SCHEMA_VERSION } from '../contract';
import { LESSONS } from '../content/lessons';
import { PUZZLE_SETS } from '../content/puzzles';
import { RULES } from '../content/rules';
import { STORIES } from '../content/stories';
import { MIN_APP_VERSION } from './config';
import { logicPools, mathPools } from './pools';

const here = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = join(here, '..', '..', '..', 'frontend', 'assets', 'seed');

/**
 * How deep the bundled pools go. Shallow on purpose — see the note above.
 * `pools.ts` reads its depth from `config.ts`, so this trims after the fact
 * rather than re-baking, which also guarantees the bundled questions are a
 * subset of the served ones.
 */
const SEED_DEPTH = { math: 30, logic: 20 };

const trim = (
  pools: Record<string, unknown[]>,
  depth: number,
): Record<string, unknown[]> =>
  Object.fromEntries(
    Object.entries(pools).map(([key, questions]) => [key, questions.slice(0, depth)]),
  );

export function bakeSeed(): { files: number; bytes: number } {
  rmSync(SEED_DIR, { recursive: true, force: true });
  mkdirSync(SEED_DIR, { recursive: true });

  let bytes = 0;
  const write = (name: string, body: unknown): void => {
    const text = JSON.stringify(body);
    writeFileSync(join(SEED_DIR, name), text, 'utf8');
    bytes += Buffer.byteLength(text, 'utf8');
  };

  for (const grade of GRADES) {
    write(`math.g${grade}.json`, {
      kind: 'math',
      schemaVersion: SCHEMA_VERSION,
      grade,
      catalog: LESSONS[grade],
      pools: trim(mathPools(grade), SEED_DEPTH.math),
    });
    write(`reading.g${grade}.json`, {
      kind: 'reading',
      schemaVersion: SCHEMA_VERSION,
      grade,
      catalog: STORIES[grade],
    });
    write(`logic.g${grade}.json`, {
      kind: 'logic',
      schemaVersion: SCHEMA_VERSION,
      grade,
      catalog: PUZZLE_SETS[grade],
      pools: trim(logicPools(grade), SEED_DEPTH.logic),
    });
  }

  write('rules.json', { kind: 'rules', schemaVersion: SCHEMA_VERSION, rules: RULES });

  const manifest: Manifest = {
    manifestVersion: 0,
    generatedAt: new Date(0).toISOString(),
    minSupportedApp: MIN_APP_VERSION,
    packs: [],
  };
  write('manifest.json', manifest);

  return { files: readdirSync(SEED_DIR).length, bytes };
}

if (process.argv[1]?.endsWith('seed.ts')) {
  const { files, bytes } = bakeSeed();
  console.log(`seed packs  ${files} files, ${(bytes / 1024 / 1024).toFixed(2)} MB into frontend/assets/seed/`);
}
