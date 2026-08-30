// GENERATED FILE — DO NOT EDIT.
// Copied from backend/src/contract by `npm run sync:shared`.
// Change the original and re-run that; edits here are overwritten.

/**
 * The AI tutor: on-demand spoken explanations of a maths problem.
 *
 * Unlike everything else in the contract, this is not baked content — the
 * app asks the server while a child is stuck, and the server asks a language
 * model on its behalf. It lives in the contract because the two halves still
 * have to agree on the shapes crossing the wire, and drift here fails the
 * same nasty way it does for packs.
 *
 * The model behind the endpoint is the server's business and can change at
 * any time; nothing about it leaks into these shapes.
 */

import type { Grade, TopicKey } from './content';

/**
 * What kind of problem is being explained, parsed out of the question id.
 * Each topic gets its own way of being taught — fractions arrive as pizza
 * slices, division as sharing between friends — so the server needs to know
 * which lesson it is giving. 'draw' is the cut-the-cake puzzles, which have
 * a pool of their own; 'general' is the fallback for an id the parser does
 * not recognise, which must still get a perfectly good explanation.
 */
export type TutorTopic = TopicKey | 'draw' | 'general';

/**
 * Question ids look like "boring-quest-v1/math.g3:addSub:2#1" — the topic is
 * the middle segment. Parsed rather than sent as its own field, so a client
 * cannot claim a topic the question does not have.
 */
export function tutorTopicOf(questionId: string): TutorTopic {
  const match = /\/math\.g\d+:([a-zA-Z]+):/.exec(questionId);
  const topic = match?.[1];
  if (topic === 'draw') return 'draw';
  if (topic && (TUTOR_TOPICS as readonly string[]).includes(topic)) return topic as TutorTopic;
  return 'general';
}

/** The topics the parser will vouch for; anything else becomes 'general'. */
export const TUTOR_TOPICS = [
  'addSub', 'mulDiv', 'fractions', 'decimals', 'order', 'word',
  'geometry', 'measurement', 'money', 'speed', 'time', 'place',
] as const;

/** POST /v1/explain — everything the tutor needs to teach one question. */
export interface ExplainRequest {
  questionId: string;
  grade: Grade;
  prompt: string;
  correctAnswer: string;
  /** Empty for typed and drawn answers, where there is nothing to choose. */
  choices: string[];
}

/**
 * The explanation, as short spoken-word steps. The app shows and reads them
 * one at a time; each step has to survive being heard rather than read.
 */
export interface ExplainResponse {
  steps: string[];
}
