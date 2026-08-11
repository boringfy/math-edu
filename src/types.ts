export type Grade = 1 | 2 | 3 | 4 | 5;

/** The three halves of the app, each with its own map and its own progress. */
export type Subject = 'math' | 'reading' | 'logic';

export const SUBJECTS: Subject[] = ['math', 'reading', 'logic'];

/** Difficulty tier within a grade: 1 = easy, 2 = normal, 3 = hard. */
export type Tier = 1 | 2 | 3;

/** Which keys the number pad needs to type this question's answer. */
export type AnswerFormat = 'integer' | 'decimal' | 'fraction';

/**
 * 'choice' = tap one of 4; 'entry' = type the answer on the number pad;
 * 'draw' = solve it by drawing on the cake.
 */
export type AnswerMode = 'choice' | 'entry' | 'draw';

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
 * One drawn square in a logic puzzle. 'shapes' holds up to four shapes side
 * by side, which is what count/shape/fill rules are built from; 'grid' is a
 * lopsided figure on a cell grid, which is what can be turned and mirrored
 * without the change being invisible.
 */
export type Tile =
  | { type: 'shapes'; shapes: PuzzleShape[] }
  | { type: 'grid'; size: number; /** Row-major; true is a filled cell. */ cells: boolean[] };

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
  /** 4 shuffled choices, always including correctAnswer. */
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

export interface AnswerRecord {
  question: Question;
  chosen: string | null;
  correct: boolean;
  /** Correction-round outcome (only set for questions answered wrong). */
  attempts?: number;
  fixed?: boolean;
  skipped?: boolean;
}

export interface QuizResult {
  id: string;
  date: string;
  subject: Subject;
  grade: Grade;
  tier: Tier;
  total: number;
  correctCount: number;
  fixedCount: number;
  skippedCount: number;
  elapsedMs: number;
  /** Set when the quiz came from a map rather than free practice. */
  stopId?: string;
  stars?: Stars;
  coins?: number;
}

/**
 * The question pools a lesson can draw from. Arithmetic is split finer than
 * the other topics so a lesson can be about "+ and −" or "× and ÷" rather
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
  | 'speed';

/**
 * A fixed stop on a grade's map. Both subjects lay their content out this
 * way, so unlocking, stars and the trail drawing are written once.
 */
export interface MapStop {
  /** Stable across runs — used as the progress key, so never renumber. */
  id: string;
  grade: Grade;
  /** 1-based position on the map. */
  index: number;
  title: string;
  icon: string;
  tier: Tier;
}

/** A math stop: a bundle of generated questions. */
export interface Lesson extends MapStop {
  /** Pools this lesson pulls from; empty pools for the grade are skipped. */
  focus: TopicKey[];
  questionCount: number;
  /** Cut-the-cake puzzles mixed in on top of the question count. */
  drawCount: number;
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

/** 0 means the stop was played but not passed, so it stays unfinished. */
export type Stars = 0 | 1 | 2 | 3;

export interface StopProgress {
  stars: Stars;
  bestPercent: number;
  clearedAt: string;
}

/** Keyed by stop id. One map per subject. */
export type ProgressMap = Record<string, StopProgress>;

/**
 * What one play session contributes to the day's challenges. The day is
 * shared across subjects, so a reading story counts as a "lesson" here too.
 */
export interface DayMetrics {
  lessonsPlayed: number;
  lessonsCleared: number;
  perfectLessons: number;
  correctAnswers: number;
  mistakesFixed: number;
  /** Longest correct streak, so this merges by max rather than by sum. */
  bestCombo: number;
  coinsEarned: number;
}

export interface DailyState {
  /** Local YYYY-MM-DD; a different date resets the challenges. */
  date: string;
  challengeIds: string[];
  progress: Record<string, number>;
  /** Ids whose reward has already been paid out. */
  claimed: string[];
}

/** Where a session's coins came from, so the results screen can itemise them. */
export interface CoinAward {
  correct: number;
  fixed: number;
  combo: number;
  perfect: number;
  firstClear: number;
  challenges: number;
  total: number;
}

export const TIER_LABELS: Record<Tier, string> = {
  1: 'Easy',
  2: 'Normal',
  3: 'Hard',
};
