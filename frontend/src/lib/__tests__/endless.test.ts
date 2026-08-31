/**
 * The map past the end of the authored one.
 *
 * The seam is what these are really about. Lesson 60 was written by a person
 * and lesson 61 was not, and a child must not be able to tell: same shape of
 * lesson, same number of problems, ids that keep working as progress keys,
 * and a level that keeps counting rather than stopping.
 */

import { seedLibrary } from '../../content/testLibrary';
import {
  authoredLevels,
  composedQuestions,
  highestOpenLevel,
  isEndless,
  lessonsForLevel,
  levelOf,
  parseComposedId,
  masteryFor,
  stopsUpTo,
  windowOf,
} from '../endless';
import { AdaptiveState } from '../adaptive';
import { ProgressMap } from '../../types';

const LIB = seedLibrary();
const authored = LIB.lessons(2);

/** Every lesson passed with one star, which is what opens the next. */
const allCleared = (): ProgressMap =>
  Object.fromEntries(
    authored.map((l) => [l.id, { stars: 1 as const, bestPercent: 60, clearedAt: '2026-01-01' }]),
  );

describe('levels', () => {
  it('is ten lessons to a level', () => {
    expect(levelOf(1)).toBe(1);
    expect(levelOf(10)).toBe(1);
    expect(levelOf(11)).toBe(2);
    expect(levelOf(61)).toBe(7);
  });

  it('makes six levels out of the authored sixty', () => {
    expect(authored).toHaveLength(60);
    expect(authoredLevels(authored)).toBe(6);
  });

  it('shows ten lessons at a time', () => {
    expect(windowOf(authored, 1).map((l) => l.index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(windowOf(authored, 6)[0].index).toBe(51);
  });
});

describe('which maps carry on', () => {
  it('is the two maps with factories behind them', () => {
    expect(isEndless('math')).toBe(true);
    expect(isEndless('logic')).toBe(true);
    // A story is written, not generated, so reading stops where its author did.
    expect(isEndless('reading')).toBe(false);
  });

  it('stops a finite map at its end', () => {
    const stories = LIB.stories(2);
    expect(highestOpenLevel('reading', 2, stories, {})).toBe(1);
    const done = Object.fromEntries(
      stories.map((s) => [s.id, { stars: 1 as const, bestPercent: 60, clearedAt: 'x' }]),
    );
    // However many stories are written, reading stops on the last of them
    // rather than inventing an extra level.
    expect(highestOpenLevel('reading', 2, stories, done)).toBe(authoredLevels(stories));
  });

  it('opens the next level once the authored map is finished', () => {
    expect(highestOpenLevel('math', 2, authored, allCleared())).toBe(7);
  });

  it('walks on as composed levels are finished too', () => {
    const progress = allCleared();
    for (let i = 1; i <= 10; i++) {
      progress[`math.g2.L7.l${i}`] = { stars: 2, bestPercent: 85, clearedAt: 'x' };
    }
    expect(highestOpenLevel('math', 2, authored, progress)).toBe(8);
  });

  it('stays where the child is while the authored map is unfinished', () => {
    expect(highestOpenLevel('math', 2, authored, {})).toBe(1);
  });

  /**
   * This walked the composed levels by spelling their ids out by hand, and
   * spelled them all as maths — so the logic map found nothing it recognised
   * and stuck for ever at its first composed level. Silent, because every
   * maths test passed.
   */
  it('walks the logic map on too, not just the maths one', () => {
    const puzzles = LIB.puzzleSets(2);
    const progress: ProgressMap = Object.fromEntries(
      puzzles.map((p) => [p.id, { stars: 1 as const, bestPercent: 60, clearedAt: 'x' }]),
    );
    expect(highestOpenLevel('logic', 2, puzzles, progress)).toBe(7);

    for (const stop of lessonsForLevel({ subject: 'logic', grade: 2, level: 7, authored: puzzles })) {
      progress[stop.id] = { stars: 2, bestPercent: 85, clearedAt: 'x' };
    }
    expect(highestOpenLevel('logic', 2, puzzles, progress)).toBe(8);
  });
});

describe('a composed level', () => {
  const level7 = lessonsForLevel({ subject: 'math', grade: 2, level: 7, authored });

  it('hands back the authored lessons for the levels that have them', () => {
    expect(lessonsForLevel({ subject: 'math', grade: 2, level: 1, authored })).toEqual(
      authored.slice(0, 10),
    );
  });

  it('carries the numbering straight on from lesson 60', () => {
    expect(level7).toHaveLength(10);
    expect(level7.map((l) => l.index)).toEqual([61, 62, 63, 64, 65, 66, 67, 68, 69, 70]);
  });

  /** The map, the quiz and the results screen all read a Lesson. */
  it('looks exactly like an authored lesson', () => {
    for (const lesson of level7) {
      expect(typeof lesson.title).toBe('string');
      expect(lesson.title.length).toBeGreaterThan(0);
      expect(lesson.icon.length).toBeGreaterThan(0);
      expect(lesson.grade).toBe(2);
      expect([1, 2, 3]).toContain(lesson.tier);
      expect(lesson.questionCount + lesson.drawCount).toBeGreaterThan(0);
    }
  });

  it('asks the same number of problems the authored map did', () => {
    for (const lesson of level7) {
      const total = lesson.questionCount + lesson.drawCount;
      expect(total === 10 || total === 7).toBe(true);
    }
  });

  it('is the same level every time', () => {
    expect(lessonsForLevel({ subject: 'math', grade: 2, level: 9, authored })).toEqual(
      lessonsForLevel({ subject: 'math', grade: 2, level: 9, authored }),
    );
  });
});

describe('composed ids', () => {
  it('cannot be mistaken for an authored one', () => {
    expect(parseComposedId('g2-l7')).toBeNull();
    expect(parseComposedId('g2-r12')).toBeNull();
    expect(parseComposedId('math.g2.L7.l3')).not.toBeNull();
  });

  it('says everything needed to rebuild the lesson', () => {
    expect(parseComposedId('math.g2.L7.l3')).toEqual({
      subject: 'math',
      grade: 2,
      level: 7,
      position: 3,
    });
    expect(parseComposedId('g2-l7')).toBeNull();
  });
});

describe('the problems a composed lesson asks', () => {
  const lesson = lessonsForLevel({ subject: 'math', grade: 2, level: 7, authored })[0];

  it('are built from the lesson, not drawn from a pool', () => {
    const questions = composedQuestions(lesson, authored.length);
    expect(questions).not.toBeNull();
    expect(questions).toHaveLength(lesson.questionCount + lesson.drawCount);
  });

  it('are the same problems every time the lesson is opened', () => {
    expect(composedQuestions(lesson, authored.length)).toEqual(
      composedQuestions(lesson, authored.length),
    );
  });

  it('are well formed enough to render', () => {
    for (const q of composedQuestions(lesson, authored.length) ?? []) {
      expect(q.prompt.trim().length).toBeGreaterThan(0);
      expect(q.correctAnswer.length).toBeGreaterThan(0);
      if (q.mode !== 'draw') {
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(q.correctAnswer);
      }
    }
  });

  /** An authored lesson still comes from the baked pools. */
  it('are not built for a lesson someone wrote', () => {
    expect(composedQuestions(authored[0], authored.length)).toBeNull();
  });
});

describe('the logic map carries on too', () => {
  const puzzles = LIB.puzzleSets(2);

  it('composes puzzle sets past the authored sixty', () => {
    const stops = stopsUpTo('logic', 2, 7, puzzles);
    expect(stops).toHaveLength(70);
    expect(stops[60].id).toMatch(/^logic\.g2\.L7\.l1$/);
  });

  it('asks puzzles rather than arithmetic', () => {
    const set = stopsUpTo('logic', 2, 7, puzzles)[60];
    for (const q of composedQuestions(set, puzzles.length) ?? []) {
      expect(q.id).toMatch(/^logic\.g2\.L7\.l1:[a-zA-Z]+#\d+$/);
      // A puzzle family, never a maths topic.
      expect(q.id).not.toMatch(/:(addSub|mulDiv|word|decimals)#/);
    }
  });
});

describe('what the child has shown moves their next level', () => {
  const state = (topics: Record<string, number>): AdaptiveState => ({
    version: 1,
    updatedAt: '2026-01-01T00:00:00.000Z',
    rounds: 12,
    unlocked: Object.keys(topics),
    hotRounds: 0,
    topics: Object.fromEntries(
      Object.entries(topics).map(([k, tier]) => [
        k,
        { window: [], streak: 0, tier: tier as 1 | 2 | 3, unlockedAtRound: 0 },
      ]),
    ),
  });

  /** Tier 2 is "about right"; 1 and 3 are a step either side of the level. */
  it('reads a tier as a step either side of the level', () => {
    const level7 = masteryFor(state({ addSub: 2 }), 2, 7, 60);
    expect(level7.addSub).toBe(6);
    expect(masteryFor(state({ addSub: 1 }), 2, 7, 60).addSub).toBe(5);
    expect(masteryFor(state({ addSub: 3 }), 2, 7, 60).addSub).toBe(7);
  });

  it('says nothing about a skill it has no evidence for', () => {
    expect(masteryFor(state({ addSub: 3 }), 2, 7, 60).geometry).toBeUndefined();
    expect(masteryFor(undefined, 2, 7, 60)).toEqual({});
  });

  it('climbs with the level, not just with the tier', () => {
    expect(masteryFor(state({ addSub: 2 }), 2, 16, 60).addSub).toBeGreaterThan(
      masteryFor(state({ addSub: 2 }), 2, 7, 60).addSub!,
    );
  });

  /**
   * The point of the whole thing: a weak skill is asked more gently, in the
   * same level, at the same time as a strong one is stretched.
   *
   * Driven the way the app drives it — the same adaptive state given to both
   * the map and the questions. They must agree, because the questions are
   * built by composing the level a second time.
   */
  const g5 = LIB.lessons(5);
  const addSubNumbers = (tier: number) => {
    const known = state({ addSub: tier });
    return stopsUpTo('math', 5, 7, g5, known)
      .slice(g5.length)
      .flatMap((stop) => composedQuestions(stop, g5.length, known) ?? [])
      .filter((q) => q.id.includes(':addSub#'))
      .flatMap((q) => (q.prompt.match(/\d+/g) ?? []).map(Number));
  };

  it('asks a struggling skill smaller numbers than a strong one', () => {
    const struggling = addSubNumbers(1);
    const strong = addSubNumbers(3);
    expect(struggling.length).toBeGreaterThan(0);
    expect(strong.length).toBeGreaterThan(0);
    expect(Math.max(...struggling)).toBeLessThan(Math.max(...strong));
  });
});

describe('stopsUpTo', () => {
  it('leaves the authored map alone while it lasts', () => {
    expect(stopsUpTo('math', 2, 6, authored)).toEqual(authored);
  });

  it('runs on without a gap in the numbering', () => {
    const stops = stopsUpTo('math', 2, 9, authored);
    expect(stops).toHaveLength(90);
    expect(stops.map((s) => s.index)).toEqual(Array.from({ length: 90 }, (_, i) => i + 1));
  });

  it('gives every lesson its own id', () => {
    const ids = stopsUpTo('math', 2, 12, authored).map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
