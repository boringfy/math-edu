/**
 * What every difficulty means, pinned.
 *
 * `stopIds.test.ts` pins the order of the map because progress is stored
 * against a stop's id. This pins the other axis for the same reason: a child's
 * per-skill progress is a `d`, so quietly re-authoring what d 7 asks for moves
 * the ground under everyone already standing on it — a child who was
 * comfortable at d 7 in mulDiv comes back to find it means the 12-times table.
 *
 * Rows hold, so inserting one shifts the meaning of every d above it. That is
 * sometimes right, and it shows up here as a shifted block rather than as a
 * silent change.
 *
 * If a failure here is intended, regenerate with:
 *   npm run test -w backend -- -u
 */

import { describe, expect, it } from 'vitest';

import { FACTORIES } from '../src/factories/catalog';
import { atD } from '../src/factories/ramp';

/** Past 20 every ramp has flattened out, so there is nothing left to pin. */
const TOP = 20;

describe('what each difficulty asks for', () => {
  for (const f of [...FACTORIES].sort((a, b) => a.id.localeCompare(b.id))) {
    it(f.id, () => {
      const settings = Object.fromEntries(
        Array.from({ length: TOP }, (_, i) => i + 1).map((d) => {
          const { d: _row, ...args } = atD(f.ramp, d);
          const inRange = d >= f.dRange[0] && d <= f.dRange[1];
          const shown = Object.keys(args).length === 0 ? '—' : JSON.stringify(args);
          return [`d${String(d).padStart(2, '0')}`, inRange ? shown : `(outside) ${shown}`];
        }),
      );
      expect({ skill: f.skill, dRange: f.dRange, settings }).toMatchSnapshot();
    });
  }
});
