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
 * a served pack always wins.
 *
 * Regenerate with `npm run seed -w backend`.
 */

import { PackId } from './contract';

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
