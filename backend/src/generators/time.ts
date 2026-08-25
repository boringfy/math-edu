import { Grade, Question, Tier, Tile } from '../contract';
import { Gen, makeQuestion, nextId, numPool, pick, randInt, shuffle } from './generator';

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
function timeDistractors(t: number): string[] {
  const { hour, minute } = fromRing(t);
  const misread = minute === 0 ? [] : [`${hour}:${String(minute / 5).padStart(2, '0')}`];
  return [...misread, label(t + 60), label(t - 60), label(t + 5), label(t - 5), label(t + 30)];
}

/** Read the hands: the clock is drawn, the answer is written. */
export function readClock(step: number): Question {
  const hour = randInt(1, 12);
  const minute = randInt(0, 60 / step - 1) * step;
  const t = toRing(hour, minute);
  const question = makeQuestion(
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
export function whichClock(step: number): Question {
  const hour = randInt(1, 12);
  const minute = randInt(0, 60 / step - 1) * step;
  const t = toRing(hour, minute);
  // Distinct offsets, so the four clocks are always four different times.
  const wrong = shuffle([t + 60, t - 60, t + 30, t - 30, t + 5, t - 5]).slice(0, 3);
  const times = shuffle([t, ...wrong]);

  const options: Record<string, Tile> = {};
  times.forEach((time, i) => {
    const face = fromRing(time);
    options[LABELS[i]] = clockTile(face.hour, face.minute);
  });

  return {
    id: nextId(),
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
export function elapsedMinutes(maxSpan: number): Question {
  const start = toRing(randInt(1, 11), randInt(0, 11) * 5);
  const span = randInt(1, maxSpan / 5) * 5;
  return makeQuestion(
    `${pick(EVENTS)} starts at ${label(start)} and finishes at ${label(start + span)}. How many minutes long is it?`,
    String(span),
    // Counting the whole hour, or counting the minutes left in it instead.
    numPool(span, [span + 60, Math.abs(60 - span), span + 5, Math.abs(span - 5)]),
    `From ${label(start)} to ${label(start + span)} is ${span} minutes`,
    'integer',
  );
}

/** Adding minutes on. The answer is a time, so it stays a choice. */
export function timeLater(step: number): Question {
  const start = toRing(randInt(1, 12), randInt(0, 60 / step - 1) * step);
  const span = pick(step === 30 ? [30, 60, 90] : step === 15 ? [15, 30, 45, 60] : [5, 10, 20, 25, 40]);
  const end = start + span;
  return makeQuestion(
    `It is ${label(start)}. What time will it be ${span} minutes later?`,
    label(end),
    [...timeDistractors(end), label(start)],
    `${label(start)} and ${span} more minutes is ${label(end)}`,
    null,
  );
}

/** The conversion every elapsed-time question quietly leans on. */
export function hoursToMinutes(): Question {
  const hours = randInt(2, 5);
  const minutes = hours * 60;
  return makeQuestion(
    `How many minutes are there in ${hours} hours?`,
    String(minutes),
    // A slipped power of ten, and counting hours as 10 or 100 minutes.
    numPool(minutes, [hours * 10, hours * 100, minutes - 60, minutes + 60]),
    `1 hour = 60 minutes, so ${hours} × 60 = ${minutes} minutes`,
    'integer',
  );
}

/**
 * Clock generators for a grade at a difficulty tier.
 *
 * Wired into grade 2 only for now. Every generator takes its minute step as
 * an argument, so opening clocks up to another grade is one line here.
 */
export function timeFor(grade: Grade, tier: Tier): Gen[] {
  if (grade !== 2) return [];
  // Half hours, then quarters, then the five-minute marks.
  const step = tier === 1 ? 30 : tier === 2 ? 15 : 5;
  const gens: Gen[] = [
    () => readClock(step),
    () => whichClock(step),
    () => hoursToMinutes(),
  ];
  if (tier >= 2) {
    gens.push(() => timeLater(step), () => elapsedMinutes(tier === 2 ? 30 : 55));
  }
  return gens;
}
