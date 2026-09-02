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

/**
 * When each side's copy of a pack was baked, ISO 8601, or null if unknown.
 *
 * Both default to "unknown", which reproduces the old behaviour of always
 * preferring the download — so a caller that does not care, such as a test
 * over the bundled packs, need not supply either.
 */
export interface BakeStamps {
  downloaded: (id: PackId) => string | null;
  bundled: (id: PackId) => string | null;
}

const NO_STAMPS: BakeStamps = { downloaded: () => null, bundled: () => null };

const parse = (iso: string | null): number | null => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
};

/**
 * Whether the bundled copy should be tried first.
 *
 * An unstamped binary never wins: with nothing to compare, the download keeps
 * the priority it has always had.
 *
 * An unstamped *download* loses to a stamped binary, and that is a deduction
 * rather than a guess. Stamps are written by every bake from the moment they
 * existed, so a cache index without one was necessarily written from a
 * manifest baked before that — and a binary that carries a stamp was
 * necessarily built after it. The download is provably the older of the two.
 * This is the case that matters in practice: it is the state every device
 * already in the field is in, and refusing to rule on it would leave them all
 * pinned to whatever they downloaded last, which is the bug.
 *
 * The cost when this fires is pool depth, not correctness — bundled packs
 * hold the same content with shallower question pools — and it corrects
 * itself the moment the server is redeployed and a stamped pack arrives.
 *
 * Equal dates leave the download in front. So this can promote the binary
 * over a stale cache, but it can never demote a server that is doing its job.
 */
export function bundledIsNewer(bundled: string | null, downloaded: string | null): boolean {
  const a = parse(bundled);
  if (a === null) return false;
  const b = parse(downloaded);
  if (b === null) return true;
  return a > b;
}

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
    private readonly stamps: BakeStamps = NO_STAMPS,
  ) {}

  /**
   * Decodes a pack once, taking the newer of the two copies.
   *
   * The download normally wins: it is the whole point of publishing content,
   * and it carries deeper question pools than the binary does. But it does
   * not win merely by existing. A device that had once downloaded a pack used
   * to keep it for ever, so content shipped inside a newer app build could
   * never take over from a server that had not been redeployed — which is how
   * a grade-2 reading map sat at 60 stories while the binary held 120. When
   * the bundled copy is stamped strictly newer, it goes first.
   *
   * Either way the other copy is the fallback: whichever is tried first, a
   * pack that fails validation hands over to the other rather than taking the
   * grade down with it. A bad publish costs freshness, not the app.
   */
  private pack(id: PackId): Pack | null {
    const cached = this.cache.get(id);
    if (cached !== undefined) return cached;

    const preferBundled = bundledIsNewer(this.stamps.bundled(id), this.stamps.downloaded(id));
    const order: { source: PackSource; label: 'downloaded' | 'bundled' }[] = preferBundled
      ? [
          { source: this.bundled, label: 'bundled' },
          { source: this.downloaded, label: 'downloaded' },
        ]
      : [
          { source: this.downloaded, label: 'downloaded' },
          { source: this.bundled, label: 'bundled' },
        ];

    let result: Pack | null = null;
    let note: LoadNote = { id, source: 'none', dropped: 0 };

    for (const { source, label } of order) {
      const body = source(id);
      if (body === null || body === undefined) continue;

      const decoded = decodePack(body);
      if (decoded.pack) {
        result = decoded.pack;
        // `note.reason` carries why the copy tried first was rejected, when
        // one was, so the settings screen can still explain the fallback.
        note = { id, source: label, reason: note.reason, dropped: decoded.dropped };
        break;
      }
      note = { id, source: 'none', reason: decoded.reason, dropped: decoded.dropped };
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

  /**
   * The subset of an unlock ladder this grade can actually play: topics with
   * at least one pool in the pack, in ladder order. What a grade has varies
   * (grade 3 bakes no fractions pool at all), so the ladder is a wish list
   * until it has been intersected with this.
   */
  availableTopics(scope: 'math' | 'logic', grade: Grade, order: string[]): string[] {
    const pools = scope === 'math' ? this.mathPools(grade) : this.logicPools(grade);
    const keys = Object.keys(pools);
    return order.filter((topic) => keys.some((key) => key.startsWith(`${topic}:`)));
  }

  /** Every pool key this grade has, for building a practice plan against. */
  practicePools(scope: 'math' | 'logic', grade: Grade): string[] {
    const pools = scope === 'math' ? this.mathPools(grade) : this.logicPools(grade);
    return Object.keys(pools);
  }

  /**
   * Adaptive free practice: draws `count` questions across the given pools
   * in proportion to their weights (largest remainder, so every weighted
   * pool gets its fair rounding). Math rounds of 5 or more keep their one
   * cake-drawing question, at the given tier; logic packs have no draw pool.
   */
  weightedPractice(
    scope: 'math' | 'logic',
    grade: Grade,
    picks: { key: string; weight: number }[],
    drawTier: Tier,
    count: number,
    cursors: CursorState,
    random: () => number,
  ): { questions: Question[]; cursors: CursorState } {
    const pools = scope === 'math' ? this.mathPools(grade) : this.logicPools(grade);
    const live = picks.filter((p) => (pools[p.key]?.length ?? 0) > 0 && p.weight > 0);
    if (live.length === 0 || count <= 0) return { questions: [], cursors };

    const drawCount = scope === 'math' && count >= 5 && pools[drawPoolKey(drawTier)] ? 1 : 0;
    const target = count - drawCount;

    // Largest remainder: whole shares first, the leftovers to the pools that
    // were rounded down the hardest.
    const totalWeight = live.reduce((sum, p) => sum + p.weight, 0);
    const shares = live.map((p) => {
      const exact = (target * p.weight) / totalWeight;
      return { key: p.key, whole: Math.floor(exact), fraction: exact - Math.floor(exact) };
    });
    let remainder = target - shares.reduce((sum, s) => sum + s.whole, 0);
    for (const share of [...shares].sort((a, b) => b.fraction - a.fraction)) {
      if (remainder <= 0) break;
      share.whole += 1;
      remainder -= 1;
    }

    const next = { ...cursors };
    const questions: Question[] = [];
    for (const share of shares) {
      if (share.whole === 0) continue;
      const stateKey = `${scope}.g${grade}/${share.key}`;
      const result = draw(pools[share.key], next[stateKey], share.whole, random);
      next[stateKey] = result.cursor;
      questions.push(...result.picked);
    }

    if (drawCount > 0) {
      const stateKey = `${scope}.g${grade}/${drawPoolKey(drawTier)}`;
      const result = draw(pools[drawPoolKey(drawTier)], next[stateKey], drawCount, random);
      next[stateKey] = result.cursor;
      questions.push(...result.picked);
    }

    return { questions, cursors: next };
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
