/**
 * Every baked question has to be renderable by a client that has never seen
 * it. The app trusts what it is sent — it has no generator left to fall back
 * on — so a malformed question is a blank screen in front of a child rather
 * than an exception someone notices.
 */

import { describe, expect, it } from 'vitest';

import {
  GRADES,
  KNOWN_ANSWER_MODES,
  KNOWN_TILE_TYPES,
  Question,
  SCHEMA_VERSION,
  Tile,
} from '../src/contract';
import { logicPools, mathPools } from '../src/bake/pools';
import { STORIES } from '../src/content/stories';

/** Baking every grade twice is slow; do it once and share it. */
const baked = GRADES.map((grade) => ({
  grade,
  math: mathPools(grade),
  logic: logicPools(grade),
}));

const allQuestions = (): { where: string; q: Question }[] =>
  baked.flatMap(({ grade, math, logic }) => [
    ...Object.entries(math).flatMap(([key, qs]) =>
      qs.map((q) => ({ where: `math.g${grade}/${key}`, q })),
    ),
    ...Object.entries(logic).flatMap(([key, qs]) =>
      qs.map((q) => ({ where: `logic.g${grade}/${key}`, q })),
    ),
  ]);

const tilesOf = (q: Question): Tile[] =>
  q.puzzle
    ? [
        ...q.puzzle.stimulus.filter((t): t is Tile => t !== null),
        ...Object.values(q.puzzle.options),
      ]
    : [];

describe('baked questions are well formed', () => {
  const questions = allQuestions();

  it('bakes a substantial number of them', () => {
    expect(questions.length).toBeGreaterThan(10_000);
  });

  it('all carry the fields the renderer reads', () => {
    const bad = questions.filter(
      ({ q }) =>
        !q.id ||
        !q.prompt.trim() ||
        !q.explanation.trim() ||
        typeof q.correctAnswer !== 'string' ||
        !KNOWN_ANSWER_MODES.includes(q.mode),
    );
    expect(bad.map((b) => `${b.where}: ${b.q.id}`)).toEqual([]);
  });

  it('ids are unique across every pool', () => {
    const ids = questions.map(({ q }) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tapped questions offer 4 distinct choices including the answer', () => {
    const bad = questions.filter(({ q }) => {
      if (q.mode === 'draw') return false;
      return (
        q.choices.length !== 4 ||
        new Set(q.choices).size !== 4 ||
        !q.choices.includes(q.correctAnswer)
      );
    });
    expect(bad.map((b) => `${b.where}: ${b.q.prompt} -> ${JSON.stringify(b.q.choices)}`)).toEqual([]);
  });

  it('typeable answers really are typeable', () => {
    const bad = questions.filter(({ q }) => {
      if (q.answerFormat === null) return false;
      const a = q.correctAnswer;
      if (q.answerFormat === 'fraction') return !/^-?\d+\/\d+$/.test(a);
      return !Number.isFinite(Number(a));
    });
    expect(bad.map((b) => `${b.where}: ${b.q.answerFormat} "${b.q.correctAnswer}"`)).toEqual([]);
  });

  it('carries a cake task exactly when the answer is drawn', () => {
    const bad = questions.filter(
      ({ q }) => (q.mode === 'draw') !== (q.cakeTask !== undefined),
    );
    expect(bad.map((b) => `${b.where}: ${b.q.id}`)).toEqual([]);
  });

  it('drawn puzzles use only tile types the schema defines', () => {
    const bad = questions.flatMap(({ where, q }) =>
      tilesOf(q)
        .filter((t) => !KNOWN_TILE_TYPES.includes(t.type))
        .map((t) => `${where}: ${t.type}`),
    );
    expect(bad).toEqual([]);
  });

  /**
   * A puzzle draws either its question or its answers, not necessarily both.
   * "What time is this?" puts a clock in the stimulus and offers written
   * times; "which clock reads 3:15?" does exactly the reverse. So options is
   * allowed to be empty — but if it is used at all, it has to cover every
   * choice, or a button comes up blank.
   */
  it('drawn puzzles either label every choice or none of them', () => {
    const bad = questions.filter(({ q }) => {
      if (!q.puzzle) return false;
      const labelled = Object.keys(q.puzzle.options).length;
      if (labelled === 0) return false;
      return q.choices.some((c) => q.puzzle!.options[c] === undefined);
    });
    expect(bad.map((b) => `${b.where}: ${b.q.id}`)).toEqual([]);
  });

  it('drawn puzzles always have something to draw', () => {
    const bad = questions.filter(({ q }) => {
      if (!q.puzzle) return false;
      const stimulus = q.puzzle.stimulus.filter((t) => t !== null).length;
      return stimulus === 0 && Object.keys(q.puzzle.options).length === 0;
    });
    expect(bad.map((b) => `${b.where}: ${b.q.id}`)).toEqual([]);
  });

  it('grid tiles hold exactly size x size cells', () => {
    const bad = questions.flatMap(({ where, q }) =>
      tilesOf(q)
        .filter((t) => t.type === 'grid' && t.cells.length !== t.size * t.size)
        .map(() => where),
    );
    expect(bad).toEqual([]);
  });
});

describe('authored stories are well formed', () => {
  it('every question has 3 distractors, none equal to the answer', () => {
    const bad = GRADES.flatMap((g) =>
      STORIES[g].flatMap((s) =>
        s.questions
          .filter(
            (q) =>
              q.distractors.length !== 3 ||
              new Set([q.answer, ...q.distractors]).size !== 4 ||
              !q.explanation.trim(),
          )
          .map((q) => `${s.id}/${q.id}`),
      ),
    );
    expect(bad).toEqual([]);
  });

  it('every story asks between 3 and 5 questions', () => {
    const bad = GRADES.flatMap((g) =>
      STORIES[g]
        .filter((s) => s.questions.length < 3 || s.questions.length > 5)
        .map((s) => `${s.id}: ${s.questions.length}`),
    );
    expect(bad).toEqual([]);
  });

  it('question ids are unique within their story', () => {
    const bad = GRADES.flatMap((g) =>
      STORIES[g]
        .filter((s) => new Set(s.questions.map((q) => q.id)).size !== s.questions.length)
        .map((s) => s.id),
    );
    expect(bad).toEqual([]);
  });
});

describe('pools are deep enough to be worth walking', () => {
  it('no generated pool is thinner than 20', () => {
    const thin = baked.flatMap(({ grade, math, logic }) =>
      [
        ...Object.entries(math).map(([k, v]) => [`math.g${grade}/${k}`, v.length] as const),
        ...Object.entries(logic).map(([k, v]) => [`logic.g${grade}/${k}`, v.length] as const),
      ]
        // Cake cuts are authored, and there are only three per tier.
        .filter(([k, n]) => !k.includes('/draw:') && n < 20)
        .map(([k, n]) => `${k}=${n}`),
    );
    expect(thin).toEqual([]);
  });
});

describe('the schema version is declared', () => {
  it('is a positive integer', () => {
    expect(Number.isInteger(SCHEMA_VERSION)).toBe(true);
    expect(SCHEMA_VERSION).toBeGreaterThan(0);
  });
});
