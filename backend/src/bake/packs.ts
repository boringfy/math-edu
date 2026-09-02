/**
 * The pack bodies, at full depth, before anything is hashed or trimmed.
 *
 * Both bakes build from here. The served packs are these bodies as they
 * stand; the bundled ones are these bodies with their pools cut short. That
 * shared origin is what makes the two comparable: a pack's *source* stamp is
 * taken from the full-depth body, so the seed bake and the server bake agree
 * on when a pack's content last changed even though the bytes they each emit
 * are different.
 */

import { GRADES, Pack, PackId, SCHEMA_VERSION } from '../contract';
import { LESSONS } from '../content/lessons';
import { PUZZLE_SETS } from '../content/puzzles';
import { RULES } from '../content/rules';
import { STORIES } from '../content/stories';
import { logicPools, mathPools } from './pools';

export interface BuiltPack {
  id: PackId;
  body: Pack;
}

/**
 * Every pack, in a fixed order.
 *
 * The order is load-bearing for neither hash nor manifest — each pack is
 * hashed alone — but it is the order the bake logs and the seed directory
 * are written in, so it is kept stable for the sake of readable diffs.
 */
export function buildPacks(): BuiltPack[] {
  const packs: BuiltPack[] = [];

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
