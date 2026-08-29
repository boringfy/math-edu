/**
 * The app's types.
 *
 * Anything describing CONTENT — questions, stories, map stops — is defined
 * by the backend and re-exported here, so the several dozen files that say
 * `from '../types'` carry on working unchanged. The originals live in
 * `src/content/contract/`, which is a generated copy of the backend's; edit
 * it there and run `npm run sync:contract`.
 *
 * Everything below the re-export is the app's own: progress, coins, history
 * and settings. None of it goes over the wire, and none of it belongs to the
 * server.
 */

export type {
  AnswerFormat,
  AnswerMode,
  CakeCutTask,
  ExplainRequest,
  ExplainResponse,
  Grade,
  Lesson,
  MapStop,
  Passage,
  PuzzleFamily,
  PuzzleSet,
  PuzzleShape,
  Question,
  ReadingSkill,
  Rules,
  ShapeKind,
  Story,
  StoryQuestion,
  Subject,
  Tier,
  Tile,
  TopicKey,
  TutorTopic,
  VisualPuzzle,
} from './content/contract';

export { SUBJECTS, tutorTopicOf } from './content/contract';

import type { Grade, Question, Subject, Tier } from './content/contract';

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

/** What a grown-up can turn on and off for this device. */
export interface Settings {
  /** Whether maths questions come with a sheet of scrap paper. */
  scratchPaper: boolean;
  /**
   * Whether that paper takes a stylus only. A hand resting on the screen
   * draws as readily as a fingertip does, so a child writing with a pen
   * needs everything but the pen turned away.
   */
  penOnly: boolean;
}

export const DEFAULT_SETTINGS: Settings = { scratchPaper: true, penOnly: true };
