/**
 * Speed Match.
 *
 * The rules it has to keep are all countable, which is lucky, because the
 * thing it is trying to be — a drill that feels quick — is not. So this pins
 * the countable parts: where the lesson appears, that the budget is spent
 * rather than exceeded, that the arithmetic stays mental, and that two
 * different children on the same level get different lessons.
 */

import { describe, expect, it } from 'vitest';

import { Grade } from '../src/contract';
import { composeLevel, levelDifficulty, questionsFor } from '../src/factories/compose';
import {
  SPEED_BANDS,
  SPEED_FROM_LEVEL,
  SPEED_POSITIONS,
  SPEED_QUESTION_COUNT,
  hasSpeedLesson,
  speedBand,
  speedPositions,
} from '../src/factories/speed';

const GRADES: Grade[] = [1, 2, 3, 4, 5];

const level = (grade: Grade, n: number, mastery = {}) =>
  composeLevel({ subject: 'math', grade, level: n, firstComposedLevel: 7, mastery });

const speedOf = (grade: Grade, n: number, mastery = {}) =>
  level(grade, n, mastery).find((l) => l.speed);

describe('where it appears', () => {
  it('gives every composed math level exactly two', () => {
    const wrong: string[] = [];
    for (const grade of GRADES) {
      for (let n = 7; n <= 90; n++) {
        const found = level(grade, n).filter((l) => l.speed).length;
        const want = n >= SPEED_FROM_LEVEL ? 2 : 0;
        if (found !== want) wrong.push(`g${grade} L${n}: ${found}, wanted ${want}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('starts with the first composed level in every grade', () => {
    expect(level(1, 7).filter((lesson) => lesson.speed)).toHaveLength(2);
    expect(SPEED_FROM_LEVEL).toBe(7);
    expect(hasSpeedLesson('math', 1, 7)).toBe(true);
  });

  it('never appears on the logic map', () => {
    const logic = composeLevel({
      subject: 'logic',
      grade: 3,
      level: 60,
      firstComposedLevel: 7,
      mastery: {},
    });
    expect(logic.filter((l) => l.speed)).toHaveLength(0);
  });

  it('uses two predictable places in the level', () => {
    for (let n = 7; n <= 70; n++) {
      const lessons = level(3, n);
      expect(lessons.flatMap((lesson, i) => lesson.speed ? [i + 1] : []))
        .toEqual(speedPositions(n));
    }
    expect(SPEED_POSITIONS).toEqual([4, 9]);
  });

  /**
   * Cake falls on every twelfth map index, which is always even; the fifth
   * lesson of a level is always odd. They can never want the same slot, and
   * this is the test that says so if either number ever moves.
   */
  it('never collides with a cake lesson', () => {
    const clashes: string[] = [];
    for (const grade of GRADES) {
      for (let n = 7; n <= 120; n++) {
        for (const lesson of level(grade, n)) {
          if (lesson.speed && lesson.title === 'Cake Cutting') clashes.push(lesson.id);
        }
      }
    }
    expect(clashes).toEqual([]);
  });
});

describe('the fixed round', () => {
  it('always asks ten questions with five to ten seconds each', () => {
    for (const grade of [2, 3, 4, 5] as Grade[]) {
      for (let n = 7; n <= 100; n++) {
        for (const lesson of level(grade, n).filter((item) => item.speed)) {
          expect(lesson.slots).toHaveLength(SPEED_QUESTION_COUNT);
          expect(lesson.speed!.perProblem).toBeGreaterThanOrEqual(5);
          expect(lesson.speed!.perProblem).toBeLessThanOrEqual(10);
        }
      }
    }
  });

  it('puts a limit on every single question', () => {
    const lesson = speedOf(3, 50)!;
    const questions = questionsFor(lesson);
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.every((q) => q.limitSeconds === lesson.speed!.perProblem)).toBe(true);
  });

  it('leaves ordinary lessons without one', () => {
    const ordinary = level(3, 50).filter((l) => !l.speed);
    const limits = ordinary.flatMap((l) => questionsFor(l).map((q) => q.limitSeconds));
    expect(limits.every((l) => l === undefined)).toBe(true);
  });
});

describe('harder means harder arithmetic and a little more time', () => {
  it('raises the allowance while keeping the question count fixed', () => {
    const seen = new Set<number>();
    let previousPace = 0;
    for (let n = 7; n <= 37; n += 6) {
      const lesson = speedOf(3, n)!;
      const pace = lesson.speed!.perProblem;
      expect(lesson.slots).toHaveLength(SPEED_QUESTION_COUNT);
      expect(pace).toBeGreaterThanOrEqual(previousPace);
      previousPace = pace;
      seen.add(pace);
    }
    expect(seen.size).toBeGreaterThan(3);
  });

  it('starts gently, whatever grade the child is in', () => {
    // The first one a child ever meets is a new kind of lesson. A grade 5
    // child on level 41 should meet it at the same gentle pace as a grade 2.
    for (const grade of [2, 3, 4, 5] as Grade[]) {
      const lesson = speedOf(grade, SPEED_FROM_LEVEL)!;
      expect(lesson.speed!.perProblem).toBe(5);
      expect(lesson.slots).toHaveLength(10);
    }
  });

  it('reaches the sharpest band eventually', () => {
    const lesson = speedOf(3, 37)!;
    expect(lesson.speed!.perProblem).toBe(10);
    expect(lesson.slots).toHaveLength(10);
  });
});

describe('adjusted to the child, not just the level', () => {
  it('gives two children on one level different lessons', () => {
    const behind = speedOf(3, 19, { addSub: 3, mulDiv: 3 })!;
    const onLevel = speedOf(3, 19)!;
    const ahead = speedOf(3, 19, { addSub: 30, mulDiv: 30 })!;

    expect(behind.speed!.perProblem).toBeLessThan(onLevel.speed!.perProblem);
    expect(onLevel.speed!.perProblem).toBeLessThan(ahead.speed!.perProblem);
    expect(Math.max(...behind.slots.map((slot) => slot.d)))
      .toBeLessThan(Math.max(...ahead.slots.map((slot) => slot.d)));
  });

  it('brings a struggling child back to simple five-second facts', () => {
    const behind = speedOf(4, 60, { addSub: 5, mulDiv: 5 })!;
    expect(behind.speed!.perProblem).toBe(5);
    expect(behind.slots).toHaveLength(SPEED_QUESTION_COUNT);
  });

  it('is bounded, so one wild number cannot break the lesson', () => {
    for (const m of [{ addSub: 0 }, { addSub: 999, mulDiv: 999 }, { mulDiv: -50 }]) {
      const band = speedBand(60, 20, m);
      expect(band).toBeGreaterThanOrEqual(1);
      expect(band).toBeLessThanOrEqual(SPEED_BANDS);
    }
  });

  it('reads mastery, and does not need it', () => {
    expect(speedOf(3, 50, {})).toBeDefined();
    expect(speedBand(50, levelDifficulty(3, 50, 7), {})).toBeGreaterThanOrEqual(1);
  });
});

describe('the arithmetic stays mental', () => {
  /**
   * The point of the whole lesson: nothing here should want a pencil. The
   * cheapest way to check that is the size of the numbers on the page.
   */
  it('never asks for a number a child would have to write down', () => {
    const tooBig: string[] = [];
    for (const grade of [2, 3, 4, 5] as Grade[]) {
      for (let n = 41; n <= 100; n += 7) {
        for (const q of questionsFor(speedOf(grade, n)!)) {
          const numbers = (q.prompt.match(/\d+/g) ?? []).map(Number);
          const largest = Math.max(...numbers, 0);
          if (largest > 150) tooBig.push(`g${grade} L${n}: ${q.prompt}`);
        }
      }
    }
    expect(tooBig).toEqual([]);
  });

  it('asks all four shapes that were asked for', () => {
    const prompts = questionsFor(speedOf(3, 71)!).map((q) => q.prompt);
    expect(prompts.some((p) => p.includes('+') && !p.includes('?  +'))).toBe(true);
    expect(prompts.some((p) => p.includes('-'))).toBe(true);
    expect(prompts.some((p) => p.includes('×') || p.includes('÷'))).toBe(true);
    // A missing number: the ? is not the last thing on the line.
    expect(prompts.some((p) => /\?\s*[-+]/.test(p) || /=\s*\d+$/.test(p))).toBe(true);
  });

  it('gives every question a real answer among its choices', () => {
    const broken: string[] = [];
    for (const q of questionsFor(speedOf(5, 80)!)) {
      if (!q.choices.includes(q.correctAnswer)) broken.push(q.prompt);
      if (new Set(q.choices).size !== q.choices.length) broken.push(`${q.prompt} (duplicate)`);
    }
    expect(broken).toEqual([]);
  });
});

describe('it is still a composed lesson like any other', () => {
  it('deals the same problems for the same seed', () => {
    const first = questionsFor(speedOf(3, 55)!).map((q) => q.prompt);
    const second = questionsFor(speedOf(3, 55)!).map((q) => q.prompt);
    expect(first).toEqual(second);
  });

  it('keeps the level at ten lessons', () => {
    expect(level(3, 55)).toHaveLength(10);
  });

  it('has an id that fits the scheme, so progress records normally', () => {
    expect(speedOf(3, 55)!.id).toBe(`math.g3.L55.l${speedPositions(55)[0]}`);
  });
});
