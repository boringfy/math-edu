export type Grade = 1 | 2 | 3 | 4 | 5;

/** Difficulty tier within a grade: 1 = easy, 2 = normal, 3 = hard. */
export type Tier = 1 | 2 | 3;

/** Which keys the number pad needs to type this question's answer. */
export type AnswerFormat = 'integer' | 'decimal' | 'fraction';

/** 'choice' = tap one of 4; 'entry' = type the answer on the number pad. */
export type AnswerMode = 'choice' | 'entry';

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
  grade: Grade;
  tier: Tier;
  total: number;
  correctCount: number;
  fixedCount: number;
  skippedCount: number;
  elapsedMs: number;
}

export const TIER_LABELS: Record<Tier, string> = {
  1: 'Easy',
  2: 'Normal',
  3: 'Hard',
};
