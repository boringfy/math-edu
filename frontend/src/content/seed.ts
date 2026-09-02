/**
 * The content baked into the binary.
 *
 * A fresh install has to be playable before it has ever reached the server —
 * on a plane, on a school tablet with no wifi, or simply while the first
 * download is still running. These are the same packs the server would send,
 * at a shallower pool depth to keep the download size of the app itself
 * sensible; the first update replaces them wholesale.
 *
 * They are declared at version 0, which is below anything the bake emits, so
 * a served pack of the same age always wins. Which of two copies is *newer*
 * is a separate question, answered by the `bakedAt` stamps below.
 *
 * Regenerate with `npm run seed -w backend`.
 */

import { Manifest, PackId } from './contract';

/**
 * Metro needs a literal path per require, so this cannot be a loop. Adding a
 * grade means adding six lines here and re-running the seed bake.
 */
export const SEED_PACKS: Record<PackId, unknown> = {
  'math.g1': require('../../assets/seed/math.g1.json'),
  'math.g2': require('../../assets/seed/math.g2.json'),
  'math.g3': require('../../assets/seed/math.g3.json'),
  'math.g4': require('../../assets/seed/math.g4.json'),
  'math.g5': require('../../assets/seed/math.g5.json'),
  'reading.g1': require('../../assets/seed/reading.g1.json'),
  'reading.g2': require('../../assets/seed/reading.g2.json'),
  'reading.g3': require('../../assets/seed/reading.g3.json'),
  'reading.g4': require('../../assets/seed/reading.g4.json'),
  'reading.g5': require('../../assets/seed/reading.g5.json'),
  'logic.g1': require('../../assets/seed/logic.g1.json'),
  'logic.g2': require('../../assets/seed/logic.g2.json'),
  'logic.g3': require('../../assets/seed/logic.g3.json'),
  'logic.g4': require('../../assets/seed/logic.g4.json'),
  'logic.g5': require('../../assets/seed/logic.g5.json'),
  rules: require('../../assets/seed/rules.json'),
};

/**
 * What the bundled packs are, as the bake described them.
 *
 * Written by the same run that writes the packs, so it cannot drift from
 * them the way a hand-kept list would.
 */
const SEED_MANIFEST = require('../../assets/seed/manifest.json') as Manifest;

const SEED_BAKED_AT: Record<string, string> = Object.fromEntries(
  (SEED_MANIFEST.packs ?? [])
    .filter((p) => typeof p.bakedAt === 'string')
    .map((p) => [p.id, p.bakedAt as string]),
);

/**
 * When the bundled copy of a pack was baked, or null before the seed bake
 * started recording it — in which case the download keeps its old priority.
 */
export const seedBakedAt = (id: PackId): string | null => SEED_BAKED_AT[id] ?? null;
