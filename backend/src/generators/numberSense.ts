import { Grade, Question, Tier } from '../contract';
import { Gen, makeQuestion, numPool, pick, randInt, random, shuffle } from './generator';

/**
 * Place value and number sense: which digit means what, counting in steps,
 * comparing, odd and even, rounding.
 *
 * None of it is arithmetic — nothing here is worked out, it is read off the
 * number itself — which is exactly why it belongs in the back half of the
 * map. By then a child can add three-digit numbers without knowing what the
 * 3 in 435 is worth, and that gap is what these questions close.
 */

const PLACES = ['ones', 'tens', 'hundreds'];

/** "1 hundred, 3 tens and 2 ones" — one of anything doesn't take the s. */
const SINGULAR = ['one', 'ten', 'hundred'];

/**
 * Digits with no repeats, so "which digit is in the tens place" has one
 * answer, and the other digits of the same number make honest distractors.
 */
const distinctDigits = (count: number): number[] =>
  shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, count);

/** "4 hundreds, 3 tens and 5 ones" — one comma, then an "and". */
const listParts = (parts: string[]): string =>
  parts.length < 2
    ? parts.join('')
    : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;

/** The digits of a number named by their places, most significant first. */
const namedParts = (digits: number[]): string[] =>
  digits.map((d, i) => {
    const place = digits.length - 1 - i;
    return `${d} ${d === 1 ? SINGULAR[place] : PLACES[place]}`;
  });

export function digitPlace(length: number): Question {
  const digits = distinctDigits(length);
  const value = Number(digits.join(''));
  const at = randInt(0, length - 1);
  const place = PLACES[length - 1 - at];
  const answer = digits[at];
  const spare = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !digits.includes(d)))[0];
  return makeQuestion(
    `Which digit is in the ${place} place of ${value}?`,
    String(answer),
    // The number's own other digits first: reading the wrong column is the
    // mistake this question is looking for.
    [...digits.filter((d) => d !== answer).map(String), String(spare)],
    `${value} is ${listParts(namedParts(digits))}, so the ${place} digit is ${answer}`,
    'integer',
  );
}

/** Place value said out loud, put back together as a number. */
export function placeParts(length: number): Question {
  const digits = distinctDigits(length);
  const value = Number(digits.join(''));
  const reversed = Number([...digits].reverse().join(''));
  return makeQuestion(
    `What number is ${listParts(namedParts(digits))}?`,
    String(value),
    // Writing the digits down in the order they were said, and slipping a
    // whole place.
    numPool(value, [reversed, value + 10 ** (length - 1), Math.abs(value - 10 ** (length - 1))]),
    `${listParts(namedParts(digits))} is ${value}`,
    'integer',
  );
}

/** The same idea written as a sum: 400 + 30 + 7. */
export function expandedForm(): Question {
  const digits = distinctDigits(3);
  const value = Number(digits.join(''));
  const parts = digits.map((d, i) => d * 10 ** (2 - i));
  return makeQuestion(
    `${parts.join(' + ')} = ?`,
    String(value),
    // Adding the digits rather than the parts, and the digits reversed.
    numPool(value, [digits.reduce((a, b) => a + b, 0), Number([...digits].reverse().join(''))]),
    `${parts.join(' + ')} = ${value}`,
    'integer',
  );
}

/** Ten and a hundred at a time — the jumps a number line is built from. */
export function stepBy(step: number, max: number): Question {
  const value = randInt(step + 20, max);
  const up = random() < 0.5;
  const answer = up ? value + step : value - step;
  return makeQuestion(
    `What is ${step} ${up ? 'more' : 'less'} than ${value}?`,
    String(answer),
    // Stepping the wrong way, and stepping by the wrong place.
    numPool(answer, [up ? value - step : value + step, value + step / 10, value - step / 10]),
    `${value} ${up ? '+' : '-'} ${step} = ${answer}`,
    'integer',
  );
}

/** Counting on in steps, with one of the middle numbers hidden. */
export function skipCount(steps: number[], max: number): Question {
  const step = pick(steps);
  const back = random() < 0.3;
  const span = 4 * step;
  const start = back ? randInt(span, max) : randInt(step, Math.max(step, max - span));
  const terms = Array.from({ length: 5 }, (_, i) => start + (back ? -i : i) * step);
  const gap = randInt(1, 3);
  const answer = terms[gap];
  return makeQuestion(
    `Fill the gap: ${terms.map((t, i) => (i === gap ? '?' : t)).join(', ')}`,
    String(answer),
    // One step out either way, which is what miscounting looks like.
    numPool(answer, [answer + step, Math.abs(answer - step)]),
    `The numbers count ${back ? 'back' : 'on'} in ${step}s, so after ${terms[gap - 1]} comes ${answer}`,
    'integer',
  );
}

/**
 * Odd and even asked with four numbers to judge rather than two, so it can't
 * be halved by guessing.
 */
export function evenOrOdd(max: number): Question {
  const wantEven = random() < 0.5;
  const wanted = new Set<number>();
  const others = new Set<number>();
  while (wanted.size < 1 || others.size < 3) {
    const n = randInt(10, max);
    const even = n % 2 === 0;
    if (even === wantEven) wanted.add(n);
    else others.add(n);
  }
  const answer = [...wanted][0];
  const rest = [...others].slice(0, 3);
  return makeQuestion(
    `Which of these numbers is ${wantEven ? 'even' : 'odd'}? ${shuffle([answer, ...rest]).join(', ')}`,
    String(answer),
    rest.map(String),
    wantEven
      ? `${answer} ends in ${answer % 10}, so it splits into two equal groups: ${answer / 2} + ${answer / 2}`
      : `${answer} ends in ${answer % 10}, so splitting it in two always leaves one over`,
    'integer',
  );
}

/** Same digits, different order: the comparison is pure place value. */
export function greatestOrSmallest(): Question {
  const digits = distinctDigits(3);
  const numbers = new Set<number>();
  while (numbers.size < 4) numbers.add(Number(shuffle(digits).join('')));
  const listed = [...numbers];
  const greatest = random() < 0.5;
  const answer = greatest ? Math.max(...listed) : Math.min(...listed);
  return makeQuestion(
    `Which of these is the ${greatest ? 'greatest' : 'smallest'}? ${listed.join(', ')}`,
    String(answer),
    listed.filter((n) => n !== answer).map(String),
    `They all use the digits ${digits.join(', ')}, so compare the hundreds first, then the tens: ${answer} is the ${greatest ? 'greatest' : 'smallest'}`,
    'integer',
  );
}

/** Rounding, kept off the halfway mark so there is nothing to argue about. */
export function roundToTen(max: number): Question {
  let value = randInt(11, max);
  // A 5 makes the answer a convention rather than a fact, and a 0 makes the
  // question do nothing.
  while (value % 10 === 5 || value % 10 === 0) value = randInt(11, max);
  const below = Math.floor(value / 10) * 10;
  const answer = value % 10 < 5 ? below : below + 10;
  return makeQuestion(
    `What is ${value} rounded to the nearest 10?`,
    String(answer),
    // Rounding the wrong way, and rounding to the nearest 100.
    numPool(answer, [value % 10 < 5 ? below + 10 : below, Math.round(value / 100) * 100, value]),
    `${value} sits between ${below} and ${below + 10}, and it is nearer ${answer}`,
    'integer',
  );
}

/**
 * Number sense generators for a grade at a difficulty tier.
 *
 * Grade 2 only for now — every generator takes its size as an argument, so
 * another grade is one line here.
 */
export function numberSenseFor(grade: Grade, tier: Tier): Gen[] {
  if (grade !== 2) return [];
  const length = tier === 1 ? 2 : 3;
  const gens: Gen[] = [
    () => digitPlace(length),
    () => placeParts(length),
    () => evenOrOdd(tier === 1 ? 40 : 99),
    () => skipCount(tier === 1 ? [2, 5, 10] : tier === 2 ? [2, 3, 5, 10] : [3, 4, 5, 10, 25], tier === 1 ? 60 : 200),
    () => stepBy(10, tier === 1 ? 90 : 490),
  ];
  if (tier >= 2) {
    gens.push(() => expandedForm(), () => greatestOrSmallest(), () => roundToTen(tier === 2 ? 99 : 199));
  }
  if (tier === 3) gens.push(() => stepBy(100, 899));
  return gens;
}
