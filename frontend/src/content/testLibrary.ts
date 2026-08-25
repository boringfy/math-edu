/**
 * A library over the bundled packs, for tests.
 *
 * Deliberately not `boot()`: a test that wanted grade 3's stories should not
 * also be exercising slot promotion and the filesystem. Those have their own
 * tests.
 */

import { PackId } from './contract';
import { Library } from './library';
import { SEED_PACKS } from './seed';

export const seedLibrary = (): Library =>
  new Library(
    () => null,
    (id: PackId) => SEED_PACKS[id] ?? null,
  );
