/**
 * Turning bytes off the network into content the app is willing to render.
 *
 * The app has no generators left — whatever arrives here is what a child
 * sees. So this layer is deliberately suspicious: it validates the shape of
 * everything, and where a single question is malformed or uses a feature
 * this build does not know about, it drops that question and keeps the rest.
 *
 * That last part is what makes content updates safe in both directions. The
 * server can start shipping a new question mode to new clients, and an app
 * that has not been updated quietly ignores those questions instead of
 * crashing in front of its user.
 */

import {
  AdaptiveRules,
  ChallengeDef,
  KNOWN_ANSWER_MODES,
  KNOWN_TILE_TYPES,
  Lesson,
  Pack,
  PuzzleSet,
  Question,
  Rules,
  SCHEMA_VERSION,
  Story,
  Subject,
  SUBJECTS,
  Tile,
  VisualPuzzle,
} from './contract';

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isString = (v: unknown): v is string => typeof v === 'string';
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function validTile(v: unknown): v is Tile {
  if (!isObject(v) || !isString(v.type)) return false;
  if (!(KNOWN_TILE_TYPES as string[]).includes(v.type)) return false;
  if (v.type === 'shapes') {
    return (
      Array.isArray(v.shapes) &&
      v.shapes.every((s) => isObject(s) && isString(s.kind) && typeof s.filled === 'boolean')
    );
  }
  if (v.type === 'grid') {
    return (
      isNumber(v.size) &&
      Array.isArray(v.cells) &&
      v.cells.length === v.size * v.size &&
      v.cells.every((c) => typeof c === 'boolean')
    );
  }
  return isNumber(v.hour) && isNumber(v.minute);
}

function validPuzzle(v: unknown): v is VisualPuzzle {
  if (!isObject(v)) return false;
  if (!Array.isArray(v.stimulus) || !isNumber(v.columns) || !isObject(v.options)) return false;
  if (!v.stimulus.every((t) => t === null || validTile(t))) return false;
  return Object.values(v.options).every(validTile);
}

/**
 * One question, or null if this build cannot draw it.
 *
 * Note the mode check: an unknown mode is not an error, it is a question
 * meant for a newer app. Same for an unknown tile type inside a puzzle.
 */
export function validQuestion(v: unknown): Question | null {
  if (!isObject(v)) return null;
  if (!isString(v.id) || !isString(v.prompt) || !isString(v.correctAnswer)) return null;
  if (!isString(v.explanation)) return null;
  if (!isString(v.mode) || !(KNOWN_ANSWER_MODES as string[]).includes(v.mode)) return null;
  if (!Array.isArray(v.choices) || !v.choices.every(isString)) return null;

  const format = v.answerFormat;
  if (format !== null && format !== 'integer' && format !== 'decimal' && format !== 'fraction') {
    return null;
  }

  const question = v as unknown as Question;

  if (question.mode === 'draw') {
    const task = v.cakeTask;
    if (!isObject(task) || !isNumber(task.cuts) || !isNumber(task.pieces) || !isString(task.hint)) {
      return null;
    }
  } else {
    // Anything tapped or typed has to offer choices that contain the answer,
    // or the correction round has nothing to show.
    if (question.choices.length < 2) return null;
    if (!question.choices.includes(question.correctAnswer)) return null;
  }

  if (v.puzzle !== undefined && !validPuzzle(v.puzzle)) return null;

  return question;
}

const validStop = (v: unknown): v is Record<string, unknown> =>
  isObject(v) &&
  isString(v.id) &&
  isNumber(v.grade) &&
  isNumber(v.index) &&
  isString(v.title) &&
  isString(v.icon) &&
  (v.tier === 1 || v.tier === 2 || v.tier === 3);

const validLesson = (v: unknown): v is Lesson =>
  validStop(v) &&
  Array.isArray((v as Record<string, unknown>).focus) &&
  isNumber((v as Record<string, unknown>).questionCount) &&
  isNumber((v as Record<string, unknown>).drawCount);

const validPuzzleSet = (v: unknown): v is PuzzleSet =>
  validStop(v) &&
  Array.isArray((v as Record<string, unknown>).focus) &&
  isNumber((v as Record<string, unknown>).questionCount);

function validStory(v: unknown): v is Story {
  if (!validStop(v) || !isString(v.text)) return false;
  if (!Array.isArray(v.questions) || v.questions.length === 0) return false;
  return v.questions.every(
    (q) =>
      isObject(q) &&
      isString(q.id) &&
      isString(q.prompt) &&
      isString(q.answer) &&
      isString(q.explanation) &&
      Array.isArray(q.distractors) &&
      q.distractors.every(isString),
  );
}

/** Drops the questions this build cannot draw, keeping the pools' shape. */
function cleanPools(v: unknown): { pools: Record<string, Question[]>; dropped: number } {
  const pools: Record<string, Question[]> = {};
  let dropped = 0;
  if (!isObject(v)) return { pools, dropped };

  for (const [key, list] of Object.entries(v)) {
    if (!Array.isArray(list)) continue;
    const kept: Question[] = [];
    for (const raw of list) {
      const q = validQuestion(raw);
      if (q) kept.push(q);
      else dropped++;
    }
    if (kept.length > 0) pools[key] = kept;
  }
  return { pools, dropped };
}

/**
 * The adaptive-practice numbers, or undefined when the pack predates them or
 * ships something this build cannot read. Absence is not an error — the app
 * falls back to its compiled-in copy — so unlike the fields below, a bad
 * `adaptive` never rejects the pack.
 */
function validAdaptive(v: unknown): AdaptiveRules | undefined {
  if (!isObject(v)) return undefined;
  const up = v.topicUp;
  const down = v.topicDown;
  const starters = v.starterCount;
  const order = v.unlockOrder;
  if (
    !isNumber(v.strongRound) ||
    !isNumber(v.unlockAfter) ||
    typeof v.perfectUnlocks !== 'boolean' ||
    !isNumber(v.topicWindow) ||
    v.topicWindow < 1 ||
    !isObject(up) ||
    !isNumber(up.minAttempts) ||
    !isNumber(up.accuracy) ||
    !isObject(down) ||
    !isNumber(down.minAttempts) ||
    !isNumber(down.accuracy) ||
    !isNumber(down.wrongStreak) ||
    !isNumber(v.roundUp) ||
    !isNumber(v.roundDown) ||
    !isNumber(v.newTopicWeight) ||
    !isNumber(v.weakTopicWeight) ||
    !isObject(starters) ||
    !isNumber(starters.math) ||
    !isNumber(starters.logic) ||
    !isObject(order) ||
    !Array.isArray(order.math) ||
    !order.math.every(isString) ||
    order.math.length === 0 ||
    !Array.isArray(order.logic) ||
    !order.logic.every(isString) ||
    order.logic.length === 0
  ) {
    return undefined;
  }
  return v as unknown as AdaptiveRules;
}

/**
 * Reward numbers arrive as content, so they get the same suspicion as
 * questions do: a malformed rules pack means the app keeps the values it was
 * compiled with rather than paying out NaN coins.
 */
function validRules(v: unknown): Rules | null {
  if (!isObject(v)) return null;

  const rates = v.coinRates;
  if (
    !isObject(rates) ||
    !isNumber(rates.correct) ||
    !isNumber(rates.fixed) ||
    !isNumber(rates.comboMilestone) ||
    !isNumber(rates.perfect) ||
    !isNumber(rates.firstClear)
  ) {
    return null;
  }

  if (!isNumber(v.firstCombo) || v.firstCombo < 1) return null;

  const share = v.entryShare;
  if (!isObject(share) || ![1, 2, 3].every((t) => isNumber(share[t]))) return null;

  const stars = v.starThresholds;
  if (
    !isObject(stars) ||
    !isNumber(stars.three) ||
    !isNumber(stars.two) ||
    !isNumber(stars.one)
  ) {
    return null;
  }

  if (!Array.isArray(v.challengeBuckets) || v.challengeBuckets.length === 0) return null;
  const buckets: ChallengeDef[][] = [];
  for (const bucket of v.challengeBuckets) {
    if (!Array.isArray(bucket)) return null;
    const defs = bucket.filter(
      (c): c is ChallengeDef =>
        isObject(c) &&
        isString(c.id) &&
        isString(c.title) &&
        isString(c.icon) &&
        isNumber(c.target) &&
        isNumber(c.reward) &&
        isString(c.metric) &&
        (c.mode === 'sum' || c.mode === 'max'),
    );
    // A bucket the app cannot read would mean a day with two challenges
    // instead of three, so an unusable bucket rejects the whole pack.
    if (defs.length === 0) return null;
    buckets.push(defs);
  }

  return {
    coinRates: rates as unknown as Rules['coinRates'],
    firstCombo: v.firstCombo,
    challengeBuckets: buckets,
    entryShare: share as unknown as Rules['entryShare'],
    starThresholds: stars as unknown as Rules['starThresholds'],
    // Absent on packs baked before lessons had to be bought, and a nonsense
    // value would either give the game away or make it unplayable — so
    // anything but a sane positive number falls back to the compiled-in one.
    unlockCost: isNumber(v.unlockCost) && v.unlockCost >= 0 ? v.unlockCost : undefined,
    // Anything but a list of subjects this app knows falls back, so a typo
    // cannot accidentally put a price on every map — or take it off one.
    paidSubjects: Array.isArray(v.paidSubjects)
      ? (v.paidSubjects.filter((s): s is Subject => SUBJECTS.includes(s as Subject)) as Subject[])
      : undefined,
    adaptive: validAdaptive(v.adaptive),
  };
}

export interface DecodeResult {
  pack: Pack | null;
  /** Why a pack was refused outright, for logging. */
  reason?: string;
  /** Questions dropped as unrenderable — normal after a server-side upgrade. */
  dropped: number;
}

/**
 * Decodes one pack body. A pack is refused outright only when it is
 * unusable: wrong schema version, wrong shape, or an empty catalog. Partial
 * damage costs the damaged questions, not the pack.
 */
export function decodePack(raw: unknown): DecodeResult {
  if (!isObject(raw)) return { pack: null, reason: 'not an object', dropped: 0 };
  if (raw.schemaVersion !== SCHEMA_VERSION) {
    return { pack: null, reason: `schema ${String(raw.schemaVersion)} != ${SCHEMA_VERSION}`, dropped: 0 };
  }

  if (raw.kind === 'rules') {
    const rules = validRules(raw.rules);
    if (!rules) return { pack: null, reason: 'malformed rules', dropped: 0 };
    return {
      pack: { kind: 'rules', schemaVersion: SCHEMA_VERSION, rules },
      dropped: 0,
    };
  }

  const grade = raw.grade;
  if (grade !== 1 && grade !== 2 && grade !== 3 && grade !== 4 && grade !== 5) {
    return { pack: null, reason: 'bad grade', dropped: 0 };
  }
  if (!Array.isArray(raw.catalog)) return { pack: null, reason: 'no catalog', dropped: 0 };

  if (raw.kind === 'reading') {
    const catalog = raw.catalog.filter(validStory);
    if (catalog.length === 0) return { pack: null, reason: 'empty story catalog', dropped: 0 };
    return {
      pack: { kind: 'reading', schemaVersion: SCHEMA_VERSION, grade, catalog },
      dropped: raw.catalog.length - catalog.length,
    };
  }

  if (raw.kind === 'math' || raw.kind === 'logic') {
    const catalog = raw.catalog.filter(raw.kind === 'math' ? validLesson : validPuzzleSet);
    if (catalog.length === 0) return { pack: null, reason: 'empty catalog', dropped: 0 };
    const { pools, dropped } = cleanPools(raw.pools);
    if (Object.keys(pools).length === 0) return { pack: null, reason: 'no usable pools', dropped };
    return {
      pack: {
        kind: raw.kind,
        schemaVersion: SCHEMA_VERSION,
        grade,
        catalog: catalog as never,
        pools,
      } as Pack,
      dropped: dropped + (raw.catalog.length - catalog.length),
    };
  }

  return { pack: null, reason: `unknown kind ${String(raw.kind)}`, dropped: 0 };
}
