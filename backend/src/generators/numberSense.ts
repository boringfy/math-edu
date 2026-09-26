import { Question } from '../contract';
import { Rng, makeQuestion, numPool } from './generator';

/**
 * Place value and number sense: which digit means what, counting in steps,
 * comparing, odd and even, rounding.
 *
 * None of it is arithmetic — nothing here is worked out, it is read off the
 * number itself — which is exactly why it belongs in the back half of the
 * map. By then a child can add three-digit numbers without knowing what the
 * 3 in 435 is worth, and that gap is what these questions close.
 */

/*
  Named as deep as any ramp can ask for, and then some.

  This had three entries while `digitPlace` and `placeParts` were both ramped
  to five-digit numbers, so every question at that depth read "9 undefined,
  4 hundreds" — an out-of-range index rendering straight into the prompt. The
  array is now longer than the deepest ramp on purpose, and `placeName` below
  refuses to return undefined whatever it is handed.
*/
const PLACES = [
  'ones',
  'tens',
  'hundreds',
  'thousands',
  'ten thousands',
  'hundred thousands',
  'millions',
];

/** "1 hundred, 3 tens and 2 ones" — one of anything doesn't take the s. */
const SINGULAR = [
  'one',
  'ten',
  'hundred',
  'thousand',
  'ten thousand',
  'hundred thousand',
  'million',
];

/**
 * The name of a place, plural or singular.
 *
 * Never undefined. A place deeper than the list has a name in principle, but
 * a wrong-looking prompt is better than a broken one, so anything past the
 * end falls back to the largest name rather than to nothing at all.
 */
const placeName = (place: number, singular: boolean): string => {
  const table = singular ? SINGULAR : PLACES;
  return table[place] ?? table[table.length - 1];
};

/**
 * Digits with no repeats, so "which digit is in the tens place" has one
 * answer, and the other digits of the same number make honest distractors.
 */
const distinctDigits = (count: number, rng: Rng): number[] =>
  rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, count);

/** "4 hundreds, 3 tens and 5 ones" — one comma, then an "and". */
const listParts = (parts: string[]): string =>
  parts.length < 2
    ? parts.join('')
    : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;

/** The digits of a number named by their places, most significant first. */
const namedParts = (digits: number[]): string[] =>
  digits.map((d, i) => {
    const place = digits.length - 1 - i;
    return `${d} ${placeName(place, d === 1)}`;
  });

export function digitPlace(length: number, rng: Rng): Question {
  const digits = distinctDigits(length, rng);
  const value = Number(digits.join(''));
  const at = rng.randInt(0, length - 1);
  const place = placeName(length - 1 - at, false);
  const answer = digits[at];
  const spare = rng.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !digits.includes(d)))[0];
  return makeQuestion(
    rng,
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
export function placeParts(length: number, rng: Rng): Question {
  const digits = distinctDigits(length, rng);
  const value = Number(digits.join(''));
  const reversed = Number([...digits].reverse().join(''));
  return makeQuestion(
    rng,
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
export function expandedForm(rng: Rng): Question {
  const digits = distinctDigits(3, rng);
  const value = Number(digits.join(''));
  const parts = digits.map((d, i) => d * 10 ** (2 - i));
  return makeQuestion(
    rng,
    `${parts.join(' + ')} = ?`,
    String(value),
    // Adding the digits rather than the parts, and the digits reversed.
    numPool(value, [digits.reduce((a, b) => a + b, 0), Number([...digits].reverse().join(''))]),
    `${parts.join(' + ')} = ${value}`,
    'integer',
  );
}

/** Ten and a hundred at a time — the jumps a number line is built from. */
export function stepBy(step: number, max: number, rng: Rng): Question {
  const value = rng.randInt(step + 20, max);
  const up = rng.next() < 0.5;
  const answer = up ? value + step : value - step;
  return makeQuestion(
    rng,
    `What is ${step} ${up ? 'more' : 'less'} than ${value}?`,
    String(answer),
    // Stepping the wrong way, and stepping by the wrong place.
    numPool(answer, [up ? value - step : value + step, value + step / 10, value - step / 10]),
    `${value} ${up ? '+' : '-'} ${step} = ${answer}`,
    'integer',
  );
}

/** Counting on in steps, with one of the middle numbers hidden. */
export function skipCount(steps: number[], max: number, rng: Rng): Question {
  const step = rng.pick(steps);
  const back = rng.next() < 0.3;
  const span = 4 * step;
  const start = back ? rng.randInt(span, max) : rng.randInt(step, Math.max(step, max - span));
  const terms = Array.from({ length: 5 }, (_, i) => start + (back ? -i : i) * step);
  const gap = rng.randInt(1, 3);
  const answer = terms[gap];
  return makeQuestion(
    rng,
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
export function evenOrOdd(max: number, rng: Rng): Question {
  const wantEven = rng.next() < 0.5;
  const wanted = new Set<number>();
  const others = new Set<number>();
  while (wanted.size < 1 || others.size < 3) {
    const n = rng.randInt(10, max);
    const even = n % 2 === 0;
    if (even === wantEven) wanted.add(n);
    else others.add(n);
  }
  const answer = [...wanted][0];
  const rest = [...others].slice(0, 3);
  return makeQuestion(
    rng,
    `Which of these numbers is ${wantEven ? 'even' : 'odd'}? ${rng.shuffle([answer, ...rest]).join(', ')}`,
    String(answer),
    rest.map(String),
    wantEven
      ? `${answer} ends in ${answer % 10}, so it splits into two equal groups: ${answer / 2} + ${answer / 2}`
      : `${answer} ends in ${answer % 10}, so splitting it in two always leaves one over`,
    'integer',
  );
}

/** Same digits, different order: the comparison is pure place value. */
export function greatestOrSmallest(rng: Rng): Question {
  const digits = distinctDigits(3, rng);
  const numbers = new Set<number>();
  while (numbers.size < 4) numbers.add(Number(rng.shuffle(digits).join('')));
  const listed = [...numbers];
  const greatest = rng.next() < 0.5;
  const answer = greatest ? Math.max(...listed) : Math.min(...listed);
  return makeQuestion(
    rng,
    `Which of these is the ${greatest ? 'greatest' : 'smallest'}? ${listed.join(', ')}`,
    String(answer),
    listed.filter((n) => n !== answer).map(String),
    `They all use the digits ${digits.join(', ')}, so compare the hundreds first, then the tens: ${answer} is the ${greatest ? 'greatest' : 'smallest'}`,
    'integer',
  );
}

/** Rounding, kept off the halfway mark so there is nothing to argue about. */
export function roundToTen(max: number, rng: Rng): Question {
  let value = rng.randInt(11, max);
  // A 5 makes the answer a convention rather than a fact, and a 0 makes the
  // question do nothing.
  while (value % 10 === 5 || value % 10 === 0) value = rng.randInt(11, max);
  const below = Math.floor(value / 10) * 10;
  const answer = value % 10 < 5 ? below : below + 10;
  return makeQuestion(
    rng,
    `What is ${value} rounded to the nearest 10?`,
    String(answer),
    // Rounding the wrong way, and rounding to the nearest 100.
    numPool(answer, [value % 10 < 5 ? below + 10 : below, Math.round(value / 100) * 100, value]),
    `${value} sits between ${below} and ${below + 10}, and it is nearer ${answer}`,
    'integer',
  );
}

/* ------------------------------------------------------------ decimals -- */

/*
  The catalog had exactly two decimal factories — add/subtract and multiply —
  for a topic that runs across two school years. These fill in the rest of it:
  comparing, ordering, rounding, dividing, and the bridge to fractions.

  Every answer is a decimal a child can check, and the distractors are the
  place-value slips that actually happen: a digit read in the wrong column, a
  tenth mistaken for a hundredth, a zero dropped.
*/

/** One decimal place, as a number that will not drift in floating point. */
const oneDp = (whole: number, tenths: number): number => Math.round(whole * 10 + tenths) / 10;

export function compareDecimals(rng: Rng): Question {
  const a = oneDp(rng.randInt(0, 9), rng.randInt(0, 9));
  let b = oneDp(rng.randInt(0, 9), rng.randInt(0, 9));
  if (b === a) b = Math.round((b + 0.1) * 10) / 10;
  const bigger = Math.max(a, b);
  return makeQuestion(
    rng,
    `Which is bigger: ${a.toFixed(1)} or ${b.toFixed(1)}?`,
    bigger.toFixed(1),
    [Math.min(a, b).toFixed(1), 'They are the same', `Neither`],
    `${bigger.toFixed(1)} is bigger — compare the whole numbers first, then the tenths.`,
    null,
  );
}

export function orderDecimals(rng: Rng): Question {
  const values = new Set<number>();
  while (values.size < 3) values.add(oneDp(rng.randInt(0, 9), rng.randInt(0, 9)));
  const list = [...values];
  const sorted = [...list].sort((x, y) => x - y);
  return makeQuestion(
    rng,
    `Put these in order, smallest first:\n${list.map((v) => v.toFixed(1)).join(', ')}`,
    sorted.map((v) => v.toFixed(1)).join(', '),
    [
      [...sorted].reverse().map((v) => v.toFixed(1)).join(', '),
      // Ordered by the digit after the point, which is the classic slip.
      [...list].sort((x, y) => (x * 10) % 10 - (y * 10) % 10).map((v) => v.toFixed(1)).join(', '),
      list.map((v) => v.toFixed(1)).join(', '),
    ],
    `Smallest first: ${sorted.map((v) => v.toFixed(1)).join(', ')}`,
    null,
  );
}

export function roundDecimal(rng: Rng): Question {
  const whole = rng.randInt(1, 40);
  const tenths = rng.randInt(1, 9);
  const value = oneDp(whole, tenths);
  const rounded = tenths >= 5 ? whole + 1 : whole;
  return makeQuestion(
    rng,
    `Round ${value.toFixed(1)} to the nearest whole number.`,
    String(rounded),
    // Rounding the wrong way, and chopping the decimal off regardless.
    numPool(rounded, [tenths >= 5 ? whole : whole + 1, whole, whole + 1]),
    tenths >= 5
      ? `The tenths digit is ${tenths}, which is 5 or more, so round up to ${rounded}`
      : `The tenths digit is ${tenths}, which is less than 5, so round down to ${rounded}`,
    'integer',
  );
}

export function decimalDivision(maxWhole: number, rng: Rng): Question {
  // Built from the answer so it always divides exactly to one decimal place.
  const divisor = rng.randInt(2, 9);
  const answer = oneDp(rng.randInt(1, maxWhole), rng.randInt(0, 9));
  const total = Math.round(answer * divisor * 10) / 10;
  return makeQuestion(
    rng,
    `${total.toFixed(1)} ÷ ${divisor} = ?`,
    answer.toFixed(1),
    // The point misplaced, and the division done on the whole part only.
    [(answer * 10).toFixed(1), (answer / 10).toFixed(1), (answer + 1).toFixed(1)],
    `${total.toFixed(1)} ÷ ${divisor} = ${answer.toFixed(1)}`,
    'decimal',
  );
}

const FRACTION_DECIMALS = [
  { fraction: '1/2', decimal: '0.5' },
  { fraction: '1/4', decimal: '0.25' },
  { fraction: '3/4', decimal: '0.75' },
  { fraction: '1/10', decimal: '0.1' },
  { fraction: '3/10', decimal: '0.3' },
  { fraction: '1/5', decimal: '0.2' },
];

export function fractionToDecimal(rng: Rng): Question {
  const pair = rng.pick(FRACTION_DECIMALS);
  const others = FRACTION_DECIMALS.filter((p) => p.decimal !== pair.decimal);
  return makeQuestion(
    rng,
    `What is ${pair.fraction} as a decimal?`,
    pair.decimal,
    rng.shuffle(others).slice(0, 3).map((p) => p.decimal),
    `${pair.fraction} = ${pair.decimal}`,
    'decimal',
  );
}
