/**
 * The content contract: everything the backend bakes and the client renders.
 *
 * This file is the single source of truth for both halves of the project.
 * `npm run sync:shared` copies the whole `contract/` directory into
 * `frontend/src/content/contract/`, and CI fails if that copy is stale, so
 * the app can never be compiled against a shape the server has moved on from.
 *
 * Anything here is DATA that travels over the wire. Progression — stars,
 * coins, saved progress, grading — is the client's business and lives in
 * `frontend/src/lib/`, not here.
 */

export type Grade = 1 | 2 | 3 | 4 | 5;

export const GRADES: Grade[] = [1, 2, 3, 4, 5];

/** The three halves of the app, each with its own map and its own progress. */
export type Subject = 'math' | 'reading' | 'logic';

export const SUBJECTS: Subject[] = ['math', 'reading', 'logic'];

/** Difficulty tier within a grade: 1 = easy, 2 = normal, 3 = hard. */
export type Tier = 1 | 2 | 3;

export const TIERS: Tier[] = [1, 2, 3];

/** Which keys the number pad needs to type this question's answer. */
export type AnswerFormat = 'integer' | 'decimal' | 'fraction';

/**
 * 'choice' = tap one of 4; 'entry' = type the answer on the number pad;
 * 'draw' = solve it by drawing on the cake.
 *
 * A client that meets a mode it does not know MUST drop the question rather
 * than try to render it — see `KNOWN_ANSWER_MODES`.
 */
export type AnswerMode = 'choice' | 'entry' | 'draw';

/** Every mode this schema version defines, for the client's drop check. */
export const KNOWN_ANSWER_MODES: AnswerMode[] = ['choice', 'entry', 'draw'];

/** Divide a round cake into `pieces` using `cuts` straight cuts. */
export interface CakeCutTask {
  cuts: number;
  pieces: number;
  /** How the arrangement has to work, revealed as a hint or on giving up. */
  hint: string;
}

/** The shapes a puzzle tile can draw. */
export type ShapeKind = 'circle' | 'square' | 'triangle' | 'diamond';

export interface PuzzleShape {
  kind: ShapeKind;
  /** Solid shapes read as "filled", the rest are drawn as outlines. */
  filled: boolean;
}

/**
 * One drawn square in a question. 'shapes' holds up to four shapes side by
 * side, which is what count/shape/fill rules are built from; 'grid' is a
 * lopsided figure on a cell grid, which is what can be turned and mirrored
 * without the change being invisible; 'clock' is a face with hands on it.
 */
export type Tile =
  | { type: 'shapes'; shapes: PuzzleShape[] }
  | { type: 'grid'; size: number; /** Row-major; true is a filled cell. */ cells: boolean[] }
  /** A clock face with hands, for the time questions. Hour is 1-12. */
  | { type: 'clock'; hour: number; minute: number };

/** Every tile type this schema version defines, for the client's drop check. */
export const KNOWN_TILE_TYPES: Tile['type'][] = ['shapes', 'grid', 'clock'];

/** A puzzle whose question and answers are drawn rather than written. */
export interface VisualPuzzle {
  /**
   * Tiles above the prompt: the pattern, the series, the figure to turn.
   * A null is the gap to fill, drawn as a "?". Empty when the choices are
   * the whole puzzle, as in "which one does not belong?".
   */
  stimulus: (Tile | null)[];
  /** How the stimulus is laid out — 3 makes a 3-wide grid. */
  columns: number;
  /** The tile to draw on each choice's button, keyed by the choice label. */
  options: Record<string, Tile>;
}

export interface Question {
  id: string;
  prompt: string;
  correctAnswer: string;
  /** 4 choices, always including correctAnswer. Reshuffled on the device. */
  choices: string[];
  /** One-line worked answer, shown in the correction round. */
  explanation: string;
  /**
   * null when the answer can't be typed because the question only makes
   * sense with the choices visible (e.g. "which fraction is the largest?").
   * Such questions always stay in 'choice' mode.
   */
  answerFormat: AnswerFormat | null;
  mode: AnswerMode;
  /** Present only when mode is 'draw'. Drawing questions have no choices. */
  cakeTask?: CakeCutTask;
  /** Present on drawn logic puzzles; the choices are then A, B, C, D. */
  puzzle?: VisualPuzzle;
}

/**
 * The question pools a lesson can draw from. Arithmetic is split finer than
 * the other topics so a lesson can be about "+ and -" or "x and /" rather
 * than arithmetic in general.
 */
export type TopicKey =
  | 'addSub'
  | 'mulDiv'
  | 'fractions'
  | 'decimals'
  | 'order'
  | 'word'
  | 'geometry'
  | 'measurement'
  | 'money'
  | 'speed'
  /** Clocks and elapsed time. */
  | 'time'
  /** Place value, comparing, skip counting, odd and even. */
  | 'place';

export const TOPIC_KEYS: TopicKey[] = [
  'addSub', 'mulDiv', 'fractions', 'decimals', 'order', 'word',
  'geometry', 'measurement', 'money', 'speed', 'time', 'place',
];

/** The kinds of reasoning puzzle the logic map draws on. */
export type PuzzleFamily =
  | 'sequence'
  | 'letters'
  | 'oddWord'
  | 'oddNumber'
  | 'analogy'
  | 'syllogism'
  | 'balance'
  | 'grid'
  | 'series'
  | 'matrix'
  | 'rotation'
  | 'mirror'
  | 'oddShape';

export const PUZZLE_FAMILIES: PuzzleFamily[] = [
  'sequence', 'letters', 'oddWord', 'oddNumber', 'analogy', 'syllogism',
  'balance', 'grid', 'series', 'matrix', 'rotation', 'mirror', 'oddShape',
];

/**
 * A fixed stop on a grade's map. All three subjects lay their content out
 * this way, so unlocking, stars and the trail drawing are written once.
 *
 * `id` is the progress key. A stop may be retitled but NEVER renumbered or
 * reordered — doing so orphans every saved game. The bake enforces this
 * against a checked-in snapshot; see `backend/test/stopIds.test.ts`.
 */
export interface MapStop {
  id: string;
  grade: Grade;
  /** 1-based position on the map. */
  index: number;
  title: string;
  icon: string;
  tier: Tier;
}

/** A math stop: which pools its questions are drawn from, and how many. */
export interface Lesson extends MapStop {
  /** Pools this lesson pulls from; empty pools for the grade are skipped. */
  focus: TopicKey[];
  questionCount: number;
  /** Cut-the-cake puzzles mixed in on top of the question count. */
  drawCount: number;
}

/** A logic stop: which puzzle families it draws on, and how many. */
export interface PuzzleSet extends MapStop {
  focus: PuzzleFamily[];
  questionCount: number;
}

/** What a comprehension question is checking for. */
export type ReadingSkill = 'detail' | 'sequence' | 'vocabulary' | 'inference' | 'mainIdea';

/**
 * Authored rather than generated: the right answer and its three distractors
 * are written together, and shuffled into choices when the story is played.
 */
export interface StoryQuestion {
  /** Unique within its story. */
  id: string;
  prompt: string;
  answer: string;
  distractors: string[];
  /** Points back at the story, so a wrong answer teaches where to look. */
  explanation: string;
  skill: ReadingSkill;
}

/** A reading stop: one paragraph plus the questions about it. */
export interface Story extends MapStop {
  /** A single paragraph, sized for the grade. */
  text: string;
  questions: StoryQuestion[];
}

/** The paragraph a set of questions refers back to, kept on screen with them. */
export interface Passage {
  title: string;
  icon: string;
  text: string;
}
