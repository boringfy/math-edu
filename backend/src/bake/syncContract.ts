/**
 * Copies the contract into the app.
 *
 * The two halves have to agree on these shapes exactly, and the failure mode
 * when they drift is nasty: everything compiles, and the app quietly
 * mis-reads a field on a child's phone. So there is one owner — this
 * directory — and the app gets a copy it must never edit.
 *
 * `--check` verifies the copy is current without writing, which is what CI
 * runs. Anything else writes it.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(here, '..', 'contract');
const TARGET = join(here, '..', '..', '..', 'frontend', 'src', 'content', 'contract');

const BANNER = `// GENERATED FILE — DO NOT EDIT.
// Copied from backend/src/contract by \`npm run sync:contract\`.
// Change the original and re-run that; edits here are overwritten.

`;

const check = process.argv.includes('--check');
const files = readdirSync(SOURCE).filter((f) => f.endsWith('.ts'));

mkdirSync(TARGET, { recursive: true });

const stale: string[] = [];
for (const file of files) {
  const want = BANNER + readFileSync(join(SOURCE, file), 'utf8');
  const path = join(TARGET, file);
  let have: string | null = null;
  try {
    have = readFileSync(path, 'utf8');
  } catch {
    have = null;
  }
  if (have === want) continue;
  if (check) {
    stale.push(file);
  } else {
    writeFileSync(path, want, 'utf8');
    console.log(`synced  ${file}`);
  }
}

// A file deleted from the contract has to disappear from the copy too.
const extra = readdirSync(TARGET).filter((f) => f.endsWith('.ts') && !files.includes(f));

if (check) {
  if (stale.length > 0 || extra.length > 0) {
    console.error('The app\'s copy of the contract is out of date.');
    for (const f of stale) console.error(`  stale    ${f}`);
    for (const f of extra) console.error(`  removed  ${f}`);
    console.error('Run: npm run sync:contract');
    process.exit(1);
  }
  console.log(`contract is in sync (${files.length} files)`);
} else {
  for (const f of extra) console.log(`note: ${f} no longer exists in the contract; delete it`);
  console.log(`contract synced (${files.length} files)`);
}
