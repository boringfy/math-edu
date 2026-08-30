// GENERATED FILE — DO NOT EDIT.
// Copied from backend/src/generators by `npm run sync:shared`.
// Change the original and re-run that; edits here are overwritten.

import { Grade, Question, Tile } from '../contract';
import { Rng, makeQuestion, numPool } from './generator';

/**
 * Clocks and elapsed time.
 *
 * Grade 2 is where a child moves on from "o'clock" to reading the minute
 * hand, so the clock is drawn rather than written: working out what the
 * hands mean is the whole skill, and a prompt that says "3:40" has already
 * done it for them. The written-time questions here are the other direction
 * — picking the clock, or adding minutes on — so both ways round get asked.
 */

/** Minutes round a 12-hour face. */
const RING = 12 * 60;

/** Choices are named on the drawn questions; the picture is the answer. */
const LABELS = ['A', 'B', 'C', 'D'];

export const clockTile = (hour: number, minute: number): Tile => ({
  type: 'clock',
  hour,
  minute,
});

const toRing = (hour: number, minute: number): number => (hour % 12) * 60 + minute;

const fromRing = (t: number): { hour: number; minute: number } => {
  const wrapped = ((t % RING) + RING) % RING;
  // Hour 0 on the ring is 12 on the face.
  return { hour: Math.floor(wrapped / 60) || 12, minute: wrapped % 60 };
};

/** "3:40" — how a child reads a clock out, never 24-hour time. */
const label = (t: number): string => {
  const { hour, minute } = fromRing(t);
  return `${hour}:${String(minute).padStart(2, '0')}`;
};

/** "the big hand is on 8", which is what 40 minutes looks like. */
const bigHandAt = (minute: number): number => (minute === 0 ? 12 : minute / 5);

/**
 * Wrong times that are wrong for a reason: the minute hand read as the
 * number it points at (3:40 called "3:08"), the hour hand read as the hour
 * it is heading towards, and a step either side. The ± hour and ± five
 * minute entries can't collide with each other or with the answer, so there
 * are always at least three real distractors to choose from.
 */
export function timeDistractors(t: number): string[] {
  const { hour, minute } = fromRing(t);
  const misread = minute === 0 ? [] : [`${hour}:${String(minute / 5).padStart(2, '0')}`];
  return [...misread, label(t + 60), label(t - 60), label(t + 5), label(t - 5), label(t + 30)];
}

/** Read the hands: the clock is drawn, the answer is written. */
export function readClock(step: number, rng: Rng): Question {
  const hour = rng.randInt(1, 12);
  const minute = rng.randInt(0, 60 / step - 1) * step;
  const t = toRing(hour, minute);
  const question = makeQuestion(
    rng,
    'What time does the clock show?',
    label(t),
    timeDistractors(t),
    minute === 0
      ? `The little hand is on ${hour} and the big hand is on 12, so it is ${label(t)}`
      : `The little hand has gone past ${hour} and the big hand is on ${bigHandAt(minute)}, which counts ${minute} minutes, so it is ${label(t)}`,
    // ':' isn't on the number pad, and a time isn't a number anyway.
    null,
  );
  return {
    ...question,
    puzzle: { stimulus: [clockTile(hour, minute)], columns: 1, options: {} },
  };
}

/** The other way round: the time is written and the clocks are drawn. */
export function whichClock(step: number, rng: Rng): Question {
  const hour = rng.randInt(1, 12);
  const minute = rng.randInt(0, 60 / step - 1) * step;
  const t = toRing(hour, minute);
  // Distinct offsets, so the four clocks are always four different times.
  const wrong = rng.shuffle([t + 60, t - 60, t + 30, t - 30, t + 5, t - 5]).slice(0, 3);
  const times = rng.shuffle([t, ...wrong]);

  const options: Record<string, Tile> = {};
  times.forEach((time, i) => {
    const face = fromRing(time);
    options[LABELS[i]] = clockTile(face.hour, face.minute);
  });

  return {
    id: rng.nextId(),
    prompt: `Which clock shows ${label(t)}?`,
    correctAnswer: LABELS[times.indexOf(t)],
    choices: [...LABELS],
    explanation: `At ${label(t)} the little hand is ${minute === 0 ? 'on' : 'just past'} ${hour} and the big hand is on ${bigHandAt(minute)}`,
    answerFormat: null,
    mode: 'choice',
    puzzle: { stimulus: [], columns: 2, options },
  };
}

const EVENTS = [
  'Swimming',
  'The film',
  'Art club',
  'Football practice',
  'The bus ride',
  'The music lesson',
  'Story time',
];

/** How long something lasts, counted on from the start time. */
export function elapsedMinutes(maxSpan: number, rng: Rng): Question {
  const start = toRing(rng.randInt(1, 11), rng.randInt(0, 11) * 5);
  const span = rng.randInt(1, maxSpan / 5) * 5;
  return makeQuestion(
    rng,
    `${rng.pick(EVENTS)} starts at ${label(start)} and finishes at ${label(start + span)}. How many minutes long is it?`,
    String(span),
    // Counting the whole hour, or counting the minutes left in it instead.
    numPool(span, [span + 60, Math.abs(60 - span), span + 5, Math.abs(span - 5)]),
    `From ${label(start)} to ${label(start + span)} is ${span} minutes`,
    'integer',
  );
}

/** Adding minutes on. The answer is a time, so it stays a choice. */
export function timeLater(step: number, rng: Rng): Question {
  const start = toRing(rng.randInt(1, 12), rng.randInt(0, 60 / step - 1) * step);
  const span = rng.pick(step === 30 ? [30, 60, 90] : step === 15 ? [15, 30, 45, 60] : [5, 10, 20, 25, 40]);
  const end = start + span;
  return makeQuestion(
    rng,
    `It is ${label(start)}. What time will it be ${span} minutes later?`,
    label(end),
    [...timeDistractors(end), label(start)],
    `${label(start)} and ${span} more minutes is ${label(end)}`,
    null,
  );
}

/** The conversion every elapsed-time question quietly leans on. */
export function hoursToMinutes(rng: Rng): Question {
  const hours = rng.randInt(2, 5);
  const minutes = hours * 60;
  return makeQuestion(
    rng,
    `How many minutes are there in ${hours} hours?`,
    String(minutes),
    // A slipped power of ten, and counting hours as 10 or 100 minutes.
    numPool(minutes, [hours * 10, hours * 100, minutes - 60, minutes + 60]),
    `1 hour = 60 minutes, so ${hours} × 60 = ${minutes} minutes`,
    'integer',
  );
}
