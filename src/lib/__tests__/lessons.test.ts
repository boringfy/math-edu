import { Grade, ProgressMap, Stars } from '../../types';
import {
  currentLesson,
  generateLesson,
  isUnlocked,
  LESSONS,
  LESSONS_PER_GRADE,
  lessonLength,
  starsEarned,
} from '../lessons';
import { starsFor } from '../mapProgress';
import { lessonPools } from '../questions';

const GRADES: Grade[] = [1, 2, 3, 4, 5];
const ALL = GRADES.flatMap((g) => LESSONS[g]);

const cleared = (ids: string[], stars: Stars = 3): ProgressMap =>
  Object.fromEntries(
    ids.map((id) => [id, { stars, bestPercent: 100, clearedAt: '2026-01-01T00:00:00.000Z' }]),
  );

describe('the lesson map', () => {
  it('gives every grade the same fixed number of lessons', () => {
    for (const grade of GRADES) {
      expect(LESSONS[grade]).toHaveLength(LESSONS_PER_GRADE);
    }
  });

  it('numbers lessons from 1 with unique ids', () => {
    for (const grade of GRADES) {
      LESSONS[grade].forEach((lesson, i) => {
        expect(lesson.index).toBe(i + 1);
        expect(lesson.grade).toBe(grade);
      });
    }
    expect(new Set(ALL.map((l) => l.id)).size).toBe(ALL.length);
  });

  it('never gets easier as a grade goes on', () => {
    for (const grade of GRADES) {
      const tiers = LESSONS[grade].map((l) => l.tier);
      for (let i = 1; i < tiers.length; i++) {
        expect(tiers[i]).toBeGreaterThanOrEqual(tiers[i - 1]);
      }
      // Every grade should span the full range rather than sit on one tier.
      expect(tiers[0]).toBe(1);
      expect(tiers[tiers.length - 1]).toBe(3);
    }
  });

  it('covers more than one subject per grade', () => {
    for (const grade of GRADES) {
      const topics = new Set(LESSONS[grade].flatMap((l) => l.focus));
      expect(topics.size).toBeGreaterThanOrEqual(3);
    }
  });

  it('only points a lesson at pools its grade actually has', () => {
    for (const lesson of ALL) {
      const pools = lessonPools(lesson.grade, lesson.tier);
      for (const topic of lesson.focus) {
        expect(pools[topic].length).toBeGreaterThan(0);
      }
    }
  });
});

describe('generateLesson', () => {
  it('produces exactly the advertised number of questions', () => {
    for (const lesson of ALL) {
      expect(generateLesson(lesson)).toHaveLength(lessonLength(lesson));
    }
  });

  it('includes the cake puzzles the lesson asks for', () => {
    for (const lesson of ALL) {
      const drawings = generateLesson(lesson).filter((q) => q.mode === 'draw');
      expect(drawings).toHaveLength(lesson.drawCount);
    }
  });

  it('builds well-formed questions across repeated runs', () => {
    for (const lesson of ALL) {
      for (const q of generateLesson(lesson)) {
        expect(q.prompt).not.toMatch(/NaN|undefined|Infinity/);
        if (q.mode === 'draw') continue;
        expect(q.choices).toHaveLength(4);
        expect(q.choices).toContain(q.correctAnswer);
      }
    }
  });

  it('keeps a "+ −" lesson off multiplication and division', () => {
    const lesson = LESSONS[3].find((l) => l.focus.length === 1 && l.focus[0] === 'addSub')!;
    for (let i = 0; i < 10; i++) {
      for (const q of generateLesson(lesson)) {
        if (q.mode === 'draw') continue;
        expect(q.prompt).not.toMatch(/[×÷]/);
      }
    }
  });

  it('keeps a "× ÷" lesson on multiplication and division', () => {
    const lesson = LESSONS[3].find((l) => l.focus.length === 1 && l.focus[0] === 'mulDiv')!;
    for (let i = 0; i < 10; i++) {
      for (const q of generateLesson(lesson)) {
        if (q.mode === 'draw') continue;
        expect(q.prompt).toMatch(/[×÷]/);
      }
    }
  });
});

describe('starsFor', () => {
  it('needs a clean run for three stars', () => {
    expect(starsFor(10, 10)).toBe(3);
    expect(starsFor(9, 10)).toBe(2);
  });

  it('passes from half right', () => {
    expect(starsFor(8, 10)).toBe(2);
    expect(starsFor(5, 10)).toBe(1);
    expect(starsFor(4, 10)).toBe(0);
  });

  it('treats an empty lesson as unfinished', () => {
    expect(starsFor(0, 0)).toBe(0);
  });
});

describe('unlocking', () => {
  it('opens only the first lesson to a new player', () => {
    const open = LESSONS[1].filter((l) => isUnlocked(l, {}));
    expect(open).toHaveLength(1);
    expect(open[0].index).toBe(1);
  });

  it('opens the next lesson once the one before it is passed', () => {
    const progress = cleared(['g1-l1'], 1);
    expect(isUnlocked(LESSONS[1][1], progress)).toBe(true);
    expect(isUnlocked(LESSONS[1][2], progress)).toBe(false);
  });

  it('keeps a played-but-failed lesson closed', () => {
    const progress = cleared(['g1-l1'], 0);
    expect(isUnlocked(LESSONS[1][1], progress)).toBe(false);
  });

  it('points at the first unfinished lesson', () => {
    expect(currentLesson(1, {}).index).toBe(1);
    expect(currentLesson(1, cleared(['g1-l1', 'g1-l2'])).index).toBe(3);
  });

  it('stays on the last lesson once a grade is finished', () => {
    const all = cleared(LESSONS[2].map((l) => l.id));
    expect(currentLesson(2, all).index).toBe(LESSONS_PER_GRADE);
  });

  it('counts stars per grade without spilling across grades', () => {
    const progress = cleared(['g1-l1', 'g1-l2'], 2);
    expect(starsEarned(1, progress)).toBe(4);
    expect(starsEarned(2, progress)).toBe(0);
  });
});
