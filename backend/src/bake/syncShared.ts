/**
 * Copies the code both halves have to agree on into the app.
 *
 * Three directories travel:
 *
 *   contract    the wire shapes. The failure mode when these drift is nasty —
 *               everything compiles and the app quietly mis-reads a field on
 *               a child's phone.
 *   generators  the question bodies. The app builds questions again now, for
 *               the endless levels, so it needs the same code the bake used.
 *   factories   the catalog: which question, at which difficulty. A level
 *               recipe is written in factory ids, so a recipe the server
 *               composed is only meaningful if the app resolves those ids to
 *               exactly the same questions.
 *
 * That last one is why the copy has to be verbatim rather than merely
 * compatible: the server and the phone are both generating from a shared
 * seed, and any difference between them shows up as a child being marked
 * wrong for the right answer.
 *
 * Relative imports survive the move untouched, which is the reason for this
 * layout: `../contract` resolves inside the backend tree and inside the app's
 * `src/content` tree alike.
 *
 * `--check` verifies the copies are current without writing, which is what
 * the test script runs. Anything else writes them.
 */

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const backend = join(here, '..');
const app = join(here, '..', '..', '..', 'frontend', 'src', 'content');

/** Source directory under `backend/src`, and where it lands in the app. */
const SHARED = ['contract', 'generators', 'factories'];

const banner = (dir: string): string => `// GENERATED FILE — DO NOT EDIT.
// Copied from backend/src/${dir} by \`npm run sync:shared\`.
// Change the original and re-run that; edits here are overwritten.

`;

/** Every .ts under a directory, as paths relative to it. */
function walk(root: string, prefix = ''): string[] {
  return readdirSync(join(root, prefix), { withFileTypes: true }).flatMap((entry) => {
    const path = join(prefix, entry.name);
    if (entry.isDirectory()) return walk(root, path);
    return entry.name.endsWith('.ts') ? [path] : [];
  });
}

const check = process.argv.includes('--check');
const stale: string[] = [];
const extra: string[] = [];
let synced = 0;
let total = 0;

for (const dir of SHARED) {
  const source = join(backend, dir);
  const target = join(app, dir);
  const files = walk(source);
  total += files.length;

  for (const file of files) {
    const want = banner(dir) + readFileSync(join(source, file), 'utf8');
    const path = join(target, file);
    let have: string | null = null;
    try {
      have = readFileSync(path, 'utf8');
    } catch {
      have = null;
    }
    if (have === want) continue;
    if (check) {
      stale.push(join(dir, file));
    } else {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, want, 'utf8');
      console.log(`synced  ${join(dir, file)}`);
      synced++;
    }
  }

  // A file deleted from the source has to disappear from the copy too, or it
  // lingers as something that still compiles and is no longer true.
  let existing: string[] = [];
  try {
    existing = walk(target);
  } catch {
    existing = [];
  }
  for (const file of existing) {
    if (files.includes(file)) continue;
    if (check) {
      extra.push(join(dir, file));
    } else {
      rmSync(join(target, file));
      console.log(`removed ${join(dir, file)}`);
    }
  }
}

void relative;

if (check) {
  if (stale.length > 0 || extra.length > 0) {
    console.error("The app's copy of the shared code is out of date.");
    for (const f of stale) console.error(`  stale    ${f}`);
    for (const f of extra) console.error(`  removed  ${f}`);
    console.error('Run: npm run sync:shared');
    process.exit(1);
  }
  console.log(`shared code is in sync (${total} files)`);
} else {
  console.log(`shared code synced (${synced} written, ${total} files)`);
}
