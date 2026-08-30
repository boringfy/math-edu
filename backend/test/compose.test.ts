/**
 * Levels built out of the catalog rather than authored.
 *
 * Two things matter more than the rest here. The seam: lesson 61 is the first
 * one nobody wrote, and it has to feel like lesson 60 did rather than like a
 * different app. And the ceiling: a child who keeps going has to keep being
 * offered something, for ever, without ever being handed a question the
 * catalog cannot actually build.
 */

import { describe, expect, it } from 'vitest';

import { CATALOG } from '../src/factories/catalog';
import { LESSONS_PER_LEVEL, composeLevel, liveSkills, questionsFor } from '../src/factories/compose';
import { KNOWN_ANSWER_MODES } from '../src/contract';

const FIRST = 7; // the authored maps are 60 lessons, so six levels

const level = (n: number, mastery = {}) =>
  composeLevel({ subject: 'math', grade: 2, level: n, firstComposedLevel: FIRST, mastery });

describe('a composed level', () => {
  it('is ten lessons, numbered on from the authored map', () => {
    const lessons = level(FIRST);
    expect(lessons).toHaveLength(LESSONS_PER_LEVEL);
    expect(lessons.map((l) => l.index)).toEqual([61, 62, 63, 64, 65, 66, 67, 68, 69, 70]);
  });

  it('numbers every later level on from the one before', () => {
    expect(level(8)[0].index).toBe(71);
    expect(level(30)[9].index).toBe(300);
  });

  /** Progress is stored against these, so a collision would overwrite a map. */
  it('gives every lesson an id that cannot collide with an authored one', () => {
    const ids = [FIRST, 8, 9, 20].flatMap((n) => level(n).map((l) => l.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => !/^g\d+-[lrp]\d+$/.test(id))).toBe(true);
  });

  it('asks the same number of problems the authored map did', () => {
    for (const lesson of level(9)) {
      // Ten, or five plus two drawn puzzles on a cake-cutting lesson.
      expect(lesson.slots.length === 10 || lesson.slots.length === 7).toBe(true);
    }
  });

  it('is the same level every time it is composed', () => {
    expect(level(12)).toEqual(level(12));
    expect(questionsFor(level(12)[3])).toEqual(questionsFor(level(12)[3]));
  });

  it('is a different level from its neighbours', () => {
    expect(level(12)[0].id).not.toBe(level(13)[0].id);
    expect(questionsFor(level(12)[0])).not.toEqual(questionsFor(level(13)[0]));
  });
});

describe('every problem it asks is real', () => {
  it('names only factories that exist, at difficulties they support', () => {
    const bad: string[] = [];
    for (const n of [FIRST, 10, 15, 25, 40]) {
      for (const lesson of level(n)) {
        for (const slot of lesson.slots) {
          const factory = CATALOG[slot.factory];
          if (!factory) bad.push(`${lesson.id}: no factory ${slot.factory}`);
          else if (slot.d < factory.dRange[0] || slot.d > factory.dRange[1]) {
            bad.push(`${lesson.id}: ${slot.factory} at d=${slot.d} outside ${factory.dRange}`);
          }
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it('builds well-formed questions all the way up', () => {
    const bad: string[] = [];
    for (const n of [FIRST, 12, 25, 50, 90]) {
      for (const lesson of level(n)) {
        for (const q of questionsFor(lesson)) {
          if (!q.prompt.trim() || !q.correctAnswer || !KNOWN_ANSWER_MODES.includes(q.mode)) {
            bad.push(`${lesson.id}: ${q.id}`);
          }
          if (q.mode !== 'draw' && new Set(q.choices).size !== 4) {
            bad.push(`${lesson.id}: ${q.id} has ${new Set(q.choices).size} choices`);
          }
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it('never runs out of levels to compose', () => {
    for (const n of [100, 500]) {
      const lessons = level(n);
      expect(lessons).toHaveLength(LESSONS_PER_LEVEL);
      expect(lessons.every((l) => l.slots.length > 0)).toBe(true);
    }
  });
});

describe('the seam at lesson 61', () => {
  /**
   * The authored sixty run to the top of the grade, so the first composed
   * level has to start there — not at the bottom, and not in the next grade.
   */
  it('starts where the grade left off', () => {
    for (const grade of [1, 2, 3, 4, 5] as const) {
      const lessons = composeLevel({
        subject: 'math',
        grade,
        level: FIRST,
        firstComposedLevel: FIRST,
        mastery: {},
      });
      const ds = lessons.flatMap((l) => l.slots.map((s) => s.d));
      expect(Math.min(...ds), `grade ${grade}`).toBeGreaterThanOrEqual(grade * 3 - 2);
    }
  });

  /** A grade-2 child has never met a decimal. They must not meet one here. */
  it('offers nothing the grade has not reached', () => {
    const skills = new Set(level(FIRST).flatMap((l) => l.skills));
    expect(skills.has('decimals')).toBe(false);
    expect(skills.has('order')).toBe(false);
    expect(skills.has('fractions')).toBe(false);
  });
});

describe('it gets harder', () => {
  const hardest = (n: number) => Math.max(...level(n).flatMap((l) => l.slots.map((s) => s.d)));

  it('climbs as the levels go by', () => {
    expect(hardest(20)).toBeGreaterThan(hardest(FIRST));
    expect(hardest(40)).toBeGreaterThan(hardest(20));
  });

  it('never goes backwards', () => {
    let previous = 0;
    for (let n = FIRST; n <= 40; n++) {
      const now = hardest(n);
      expect(now, `level ${n}`).toBeGreaterThanOrEqual(previous);
      previous = now;
    }
  });

  /** New kinds of question arrive on their own as the ladder rises. */
  it('brings in skills the child had not met yet', () => {
    const early = new Set(level(FIRST).flatMap((l) => l.skills));
    const later = new Set(level(30).flatMap((l) => l.skills));
    expect([...later].some((s) => !early.has(s))).toBe(true);
  });
});

describe('a level looks the same whatever the child has been doing', () => {
  /**
   * The map is drawn from the composed level, and it is redrawn every time
   * the adaptive state moves — which is after every round. If mastery could
   * change what a lesson is *called* or *about*, a child would watch the
   * lessons ahead of them rename themselves as they played.
   */
  it('names, skills and length do not depend on mastery', () => {
    const plain = level(10);
    const adapted = level(10, { time: 4, mulDiv: 11, addSub: 1 });
    expect(adapted.map((l) => l.title)).toEqual(plain.map((l) => l.title));
    expect(adapted.map((l) => l.icon)).toEqual(plain.map((l) => l.icon));
    expect(adapted.map((l) => l.skills)).toEqual(plain.map((l) => l.skills));
    expect(adapted.map((l) => l.slots.length)).toEqual(plain.map((l) => l.slots.length));
  });

  it('but the difficulty does', () => {
    const plain = level(10).flatMap((l) => l.slots.map((s) => s.d));
    const adapted = level(10, { mulDiv: 11 }).flatMap((l) => l.slots.map((s) => s.d));
    expect(adapted).not.toEqual(plain);
  });
});

describe('mastery moves one skill without moving the rest', () => {
  it('follows what the child has shown, in both directions', () => {
    const lessons = level(10, { time: 4, mulDiv: 11 });
    const at = (skill: string) =>
      lessons
        .flatMap((l) => l.slots)
        .filter((s) => CATALOG[s.factory].skill === skill)
        .map((s) => s.d);

    expect(at('time').every((d) => d <= 4)).toBe(true);
    expect(at('mulDiv').every((d) => d >= 9)).toBe(true);
  });

  it('leaves untouched skills on the level default', () => {
    const withOverride = level(10, { time: 4 });
    const plain = level(10);
    const addSubOf = (ls: ReturnType<typeof level>) =>
      ls.flatMap((l) => l.slots).filter((s) => CATALOG[s.factory].skill === 'addSub');
    expect(addSubOf(withOverride)).toEqual(addSubOf(plain));
  });
});

describe('the logic map composes too', () => {
  const logic = (n: number, mastery = {}) =>
    composeLevel({ subject: 'logic', grade: 2, level: n, firstComposedLevel: FIRST, mastery });

  it('asks puzzles, never arithmetic', () => {
    const skills = new Set(logic(FIRST).flatMap((l) => l.skills));
    for (const maths of ['addSub', 'mulDiv', 'word', 'decimals', 'draw']) {
      expect([...skills]).not.toContain(maths);
    }
    expect(skills.size).toBeGreaterThan(1);
  });

  it('builds real puzzles all the way up', () => {
    const bad: string[] = [];
    for (const n of [FIRST, 12, 25, 60]) {
      for (const lesson of logic(n)) {
        for (const q of questionsFor(lesson)) {
          if (!q.prompt.trim() || !q.correctAnswer) bad.push(`${lesson.id}: ${q.id}`);
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  /** The same rule as maths: a family arrives when its own ramp reaches it. */
  it('brings families in as the ladder reaches them', () => {
    expect(liveSkills(1, 'logic')).not.toContain('syllogism');
    expect(liveSkills(13, 'logic')).toContain('syllogism');
    expect(liveSkills(1, 'logic')).not.toContain('grid');
    expect(liveSkills(10, 'logic')).toContain('grid');
  });

  it('keeps the two maps' + "' skills apart", () => {
    expect(liveSkills(10, 'math')).not.toContain('rotation');
    expect(liveSkills(10, 'logic')).not.toContain('addSub');
  });

  it('has no cake cutting, which is a maths lesson', () => {
    for (const lesson of logic(12)) {
      expect(lesson.skills).not.toContain('draw');
    }
  });
});

describe('a composed question says what it is about', () => {
  /**
   * The app reads a topic back out of the question id to work out what a
   * child is good at. A baked question carries it; a composed one has to too,
   * or every answer is filed under nothing and mastery never moves.
   */
  it('names its lesson and its skill', () => {
    for (const lesson of level(FIRST)) {
      for (const q of questionsFor(lesson)) {
        expect(q.id).toMatch(/^math\.g2\.L7\.l\d+:[a-zA-Z]+#\d+$/);
        expect(lesson.skills.some((s) => q.id.includes(`:${s}#`))).toBe(true);
      }
    }
  });

  it('gives every problem in a level its own id', () => {
    const ids = level(FIRST).flatMap((l) => questionsFor(l).map((q) => q.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('liveSkills', () => {
  it('opens skills as the ladder reaches them', () => {
    expect(liveSkills(6)).not.toContain('fractions');
    expect(liveSkills(10)).toContain('fractions');
    expect(liveSkills(6)).not.toContain('decimals');
    expect(liveSkills(13)).toContain('decimals');
  });

  /**
   * The ramps run out eventually — around d 27, which is level 70-odd, some
   * seven hundred lessons in. Past there `composeLevel` holds the deepest
   * skills at their ceiling rather than returning nothing, which is the
   * "never runs out of levels" test above. This pins how far the authored
   * ladder actually reaches, so widening it is a visible change.
   */
  it('reaches well past the authored curriculum', () => {
    for (const d of [1, 6, 12, 18, 26]) {
      expect(liveSkills(d).length, `d=${d}`).toBeGreaterThan(0);
    }
    expect(liveSkills(26)).toEqual(['decimals', 'fractions', 'mulDiv', 'order']);
  });
});
