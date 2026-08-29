/**
 * Asking the server's AI tutor for a lesson.
 *
 * The app never talks to a language model itself — it asks our own backend,
 * which holds the key and picks the model. All this module knows is the
 * server address and the shapes in the contract, so the provider behind the
 * lesson can change without the app noticing.
 */

import { CONTENT_URL } from '../content';
import type { ExplainRequest, ExplainResponse, Grade, Question, TutorTopic } from '../types';

/**
 * Where the tutor lives. Usually the content server; its own variable so the
 * two can be split later. Empty means no tutor, and the help button hides.
 */
export const TUTOR_URL = process.env.EXPO_PUBLIC_TUTOR_URL ?? CONTENT_URL;

export const tutorAvailable = (): boolean => TUTOR_URL !== '';

/**
 * The server waits up to two minutes on the model, so the app has to wait a
 * shade longer — timing out first would throw away an answer that was coming.
 */
const REQUEST_TIMEOUT_MS = 130_000;

/**
 * Fetches the spoken steps for one question. Throws on anything less than a
 * usable lesson; the tutor UI turns that into "try again", never a blank.
 */
export async function fetchLesson(question: Question, grade: Grade): Promise<string[]> {
  const request: ExplainRequest = {
    questionId: question.id,
    grade,
    prompt: question.prompt,
    correctAnswer: question.correctAnswer,
    choices: question.choices ?? [],
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${TUTOR_URL}/v1/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`tutor HTTP ${response.status}`);

    const body = (await response.json()) as ExplainResponse;
    const steps = (body.steps ?? []).filter((s) => typeof s === 'string' && s.trim() !== '');
    if (steps.length === 0) throw new Error('tutor sent an empty lesson');
    return steps;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * How each kind of problem dresses its lesson up. The teaching itself is
 * specialised server-side (the analogy arrives in the steps); this is the
 * face the lesson wears — a fractions question opens as pizza, money as a
 * shop — so the special treatment is visible before a word is spoken.
 */
export const TOPIC_LOOKS: Record<TutorTopic, { icon: string; title: string }> = {
  addSub: { icon: '🍬', title: 'Counting time!' },
  mulDiv: { icon: '🍪', title: 'Fair shares!' },
  fractions: { icon: '🍕', title: 'Pizza pieces!' },
  decimals: { icon: '💵', title: 'Dollars and cents!' },
  order: { icon: '📏', title: 'Big and small!' },
  word: { icon: '📖', title: 'A number story!' },
  geometry: { icon: '🔷', title: 'Shape spotting!' },
  measurement: { icon: '🫙', title: 'Measure it!' },
  money: { icon: '🪙', title: 'Playing shop!' },
  speed: { icon: '🚗', title: 'On a journey!' },
  time: { icon: '🕐', title: 'Clock hands!' },
  place: { icon: '🔟', title: 'Bundles of ten!' },
  draw: { icon: '🎂', title: 'Cake cutting!' },
  general: { icon: '✨', title: "Let's figure it out!" },
};
