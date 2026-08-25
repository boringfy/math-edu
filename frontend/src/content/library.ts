/**
 * The content the app actually plays from.
 *
 * This is what replaced the generators. Where the app used to call
 * `generateLesson(lesson)` and have a quiz invented on the spot, it now asks
 * the library to draw one from the pools that were downloaded — the same
 * call shape, the same `Question[]` out, and no knowledge in the app of how
 * any of it was made.
 *
 * Packs are decoded lazily, one grade at a time. The full set is around
 * 15MB of JSON, which is a third of a second of parsing nobody should spend
 * at launch to draw a map of grade 1. A pack is read and validated the first
 * time that grade is opened, and kept in memory afterwards.
 *
 * A library is built once per launch against whichever slot is live, and
 * never changes after that. Updates land in the other slot and are picked up
 * by the next launch.
 */

import {
  Grade,
  Lesson,
  PackId,
  Passage,
  PuzzleSet,
  Question,
  Rules,
  Story,
  Tier,
  drawPoolKey,
  logicPoolKey,
  mathPoolKey,
} from './contract';
import { CursorState, draw, prune } from './cursor';
import { decodePack } from './packs';
import { Pack } from './contract';

/** Where a pack body comes from. Returns null when this slot has no copy. */
export type PackSource = (id: PackId) => unknown | null;

export interface LoadNote {
  id: PackId;
  /** 'downloaded' or 'bundled' — which copy ended up being used. */
  source: 'downloaded' | 'bundled' | 'none';
  reason?: string;
  dropped: number;
}

export class Library {
  private readonly cache = new Map<PackId, Pack | null>();
  readonly notes: LoadNote[] = [];

  constructor(
    private readonly downloaded: PackSource,
    private readonly bundled: PackSource,
  ) {}

  /**
   * Decodes a pack once, preferring the downloaded copy.
   *
   * A downloaded pack that fails validation falls back to the one in the
   * binary rather than taking the grade down with it — a bad publish costs
   * freshness, not the app.
   */
  private pack(id: PackId): Pack | null {
    const cached = this.cache.get(id);
    if (cached !== undefined) return cached;

    let result: Pack | null = null;
    let note: LoadNote = { id, source: 'none', dropped: 0 };

    const fresh = this.downloaded(id);
    if (fresh !== null && fresh !== undefined) {
      const decoded = decodePack(fresh);
      if (decoded.pack) {
        result = decoded.pack;
        note = { id, source: 'downloaded', dropped: decoded.dropped };
      } else {
        note = { id, source: 'none', reason: decoded.reason, dropped: decoded.dropped };
      }
    }

    if (!result) {
      const seed = this.bundled(id);
      if (seed !== null && seed !== undefined) {
        const decoded = decodePack(seed);
        if (decoded.pack) {
          result = decoded.pack;
          note = { id, source: 'bundled', reason: note.reason, dropped: decoded.dropped };
        }
      }
    }

    this.cache.set(id, result);
    this.notes.push(note);
    return result;
  }

  private mathPack = (grade: Grade) => {
    const p = this.pack(`math.g${grade}`);
    return p?.kind === 'math' ? p : null;
  };

  private logicPack = (grade: Grade) => {
    const p = this.pack(`logic.g${grade}`);
    return p?.kind === 'logic' ? p : null;
  };

  /* ------------------------------------------------------------ catalogs -- */

  lessons = (grade: Grade): Lesson[] => this.mathPack(grade)?.catalog ?? [];

  puzzleSets = (grade: Grade): PuzzleSet[] => this.logicPack(grade)?.catalog ?? [];

  stories = (grade: Grade): Story[] => {
    const p = this.pack(`reading.g${grade}`);
    return p?.kind === 'reading' ? p.catalog : [];
  };

  get rules(): Rules | null {
    const p = this.pack('rules');
    return p?.kind === 'rules' ? p.rules : null;
  }

  /** True when every grade opened so far came from the binary. */
  get seedOnly(): boolean {
    return this.notes.length > 0 && this.notes.every((n) => n.source !== 'downloaded');
  }

  /* -------------------------------------------------------------- drawing -- */

  private mathPools = (grade: Grade): Record<string, Question[]> =>
    this.mathPack(grade)?.pools ?? {};

  private logicPools = (grade: Grade): Record<string, Question[]> =>
    this.logicPack(grade)?.pools ?? {};

  /** Pool keys for one tier, e.g. every "*:2" the grade has. */
  private tierKeys = (pools: Record<string, Question[]>, tier: Tier): string[] =>
    Object.keys(pools).filter((key) => key.endsWith(`:${tier}`));

  /** Cursor keys for every pool loaded so far, for pruning stale state. */
  poolKeys(): string[] {
    const keys: string[] = [];
    for (const grade of [1, 2, 3, 4, 5] as Grade[]) {
      keys.push(...Object.keys(this.mathPools(grade)).map((k) => `math.g${grade}/${k}`));
      keys.push(...Object.keys(this.logicPools(grade)).map((k) => `logic.g${grade}/${k}`));
    }
    return keys;
  }

  pruneCursors = (state: CursorState): CursorState => prune(state, this.poolKeys());

  /**
   * Spreads `count` picks across several pools, taking from each in turn, so
   * a lesson on two topics comes out half and half rather than however the
   * arithmetic happened to land.
   */
  private spread(
    scope: 'math' | 'logic',
    grade: Grade,
    pools: Record<string, Question[]>,
    poolKeys: string[],
    count: number,
    cursors: CursorState,
    random: () => number,
  ): { questions: Question[]; cursors: CursorState } {
    const live = poolKeys.filter((key) => (pools[key]?.length ?? 0) > 0);
    if (live.length === 0 || count <= 0) return { questions: [], cursors };

    const next = { ...cursors };
    const questions: Question[] = [];

    live.forEach((key, i) => {
      // Whole share each, with the remainder going to the first few pools.
      const share = Math.floor(count / live.length) + (i < count % live.length ? 1 : 0);
      if (share === 0) return;
      const stateKey = `${scope}.g${grade}/${key}`;
      const result = draw(pools[key], next[stateKey], share, random);
      next[stateKey] = result.cursor;
      questions.push(...result.picked);
    });

    return { questions, cursors: next };
  }

  /** The questions for one stop on the maths map. */
  lessonQuestions(
    lesson: Lesson,
    cursors: CursorState,
    random: () => number,
  ): { questions: Question[]; cursors: CursorState } {
    const pools = this.mathPools(lesson.grade);
    const keys = lesson.focus.map((topic) => mathPoolKey(topic, lesson.tier));
    let result = this.spread('math', lesson.grade, pools, keys, lesson.questionCount, cursors, random);

    // A lesson whose focus pools are all missing still has to be playable, so
    // it falls back to everything the grade has at that tier.
    if (result.questions.length === 0) {
      const general = this.tierKeys(pools, lesson.tier).filter((k) => !k.startsWith('draw:'));
      result = this.spread('math', lesson.grade, pools, general, lesson.questionCount, cursors, random);
    }

    if (lesson.drawCount > 0) {
      const drawn = this.spread(
        'math',
        lesson.grade,
        pools,
        [drawPoolKey(lesson.tier)],
        lesson.drawCount,
        result.cursors,
        random,
      );
      return {
        questions: [...result.questions, ...drawn.questions],
        cursors: drawn.cursors,
      };
    }

    return result;
  }

  /** Free practice: a general mix across every topic at this tier. */
  practiceQuestions(
    grade: Grade,
    tier: Tier,
    count: number,
    cursors: CursorState,
    random: () => number,
  ): { questions: Question[]; cursors: CursorState } {
    const pools = this.mathPools(grade);
    const drawCount = count >= 5 ? 1 : 0;
    const keys = this.tierKeys(pools, tier).filter((k) => !k.startsWith('draw:'));
    const result = this.spread('math', grade, pools, keys, count - drawCount, cursors, random);
    if (drawCount === 0) return result;

    const drawn = this.spread(
      'math',
      grade,
      pools,
      [drawPoolKey(tier)],
      drawCount,
      result.cursors,
      random,
    );
    return {
      questions: [...result.questions, ...drawn.questions],
      cursors: drawn.cursors,
    };
  }

  /** The questions for one stop on the logic map. */
  puzzleQuestions(
    set: PuzzleSet,
    cursors: CursorState,
    random: () => number,
  ): { questions: Question[]; cursors: CursorState } {
    const pools = this.logicPools(set.grade);
    const keys = set.focus.map((family) => logicPoolKey(family, set.tier));
    const result = this.spread('logic', set.grade, pools, keys, set.questionCount, cursors, random);
    if (result.questions.length > 0) return result;

    return this.spread(
      'logic',
      set.grade,
      pools,
      this.tierKeys(pools, set.tier),
      set.questionCount,
      cursors,
      random,
    );
  }
}

/**
 * A story's questions as ordinary quiz questions, so the reading half of the
 * app reuses the quiz, correction and results screens unchanged. The order is
 * kept — comprehension questions usually walk the paragraph — while the four
 * choices are shuffled on every play.
 */
export function storyQuestions(story: Story, shuffle: <T>(a: T[]) => T[]): Question[] {
  return story.questions.map((q) => ({
    id: `${story.id}-${q.id}`,
    prompt: q.prompt,
    correctAnswer: q.answer,
    choices: shuffle([q.answer, ...q.distractors]),
    explanation: q.explanation,
    // Comprehension answers are phrases, so they can only ever be tapped.
    answerFormat: null as null,
    mode: 'choice' as const,
  }));
}

export const passageOf = (story: Story): Passage => ({
  title: story.title,
  icon: story.icon,
  text: story.text,
});
