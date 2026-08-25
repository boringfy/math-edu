/**
 * The safety rail.
 *
 * Progress is stored on the device against a stop's id. Now that content
 * ships over the air, an edit here reaches a child who is thirty stops into
 * grade 3 — and if that edit inserts a story in the middle, every id after
 * it shifts by one and their whole map silently resets.
 *
 * So the ordered id list of every map is pinned. Appending to the end is
 * fine and the snapshot grows; anything that reorders, removes or renumbers
 * fails the build.
 *
 * If a failure here is genuinely intended, regenerate with:
 *   npm run test -w backend -- -u
 */

import { describe, expect, it } from 'vitest';

import { GRADES, MapStop } from '../src/contract';
import { LESSONS } from '../src/content/lessons';
import { PUZZLE_SETS } from '../src/content/puzzles';
import { STORIES } from '../src/content/stories';

const ids = (stops: MapStop[]): string[] => stops.map((s) => s.id);

describe('map stop ids are stable', () => {
  for (const grade of GRADES) {
    it(`grade ${grade} math`, () => {
      expect(ids(LESSONS[grade])).toMatchSnapshot();
    });
    it(`grade ${grade} reading`, () => {
      expect(ids(STORIES[grade])).toMatchSnapshot();
    });
    it(`grade ${grade} logic`, () => {
      expect(ids(PUZZLE_SETS[grade])).toMatchSnapshot();
    });
  }
});

describe('map structure', () => {
  const maps: [string, Record<number, MapStop[]>][] = [
    ['math', LESSONS],
    ['reading', STORIES],
    ['logic', PUZZLE_SETS],
  ];

  for (const [name, map] of maps) {
    it(`${name} numbers every stop by its position`, () => {
      for (const grade of GRADES) {
        map[grade].forEach((stop, i) => {
          expect(stop.index).toBe(i + 1);
          expect(stop.grade).toBe(grade);
        });
      }
    });

    it(`${name} ids are unique across all grades`, () => {
      const all = GRADES.flatMap((g) => ids(map[g]));
      expect(new Set(all).size).toBe(all.length);
    });

    it(`${name} tiers never dip backwards along a map`, () => {
      for (const grade of GRADES) {
        const tiers = map[grade].map((s) => s.tier);
        expect([...tiers].sort((a, b) => a - b)).toEqual(tiers);
      }
    });
  }
});
