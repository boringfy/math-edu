// GENERATED FILE — DO NOT EDIT.
// Copied from backend/src/generators by `npm run sync:shared`.
// Change the original and re-run that; edits here are overwritten.

import { Question } from '../contract';
import { Rng, makeQuestion, numPool } from './generator';

/**
 * Data handling: reading a small table, a pictogram or a bar chart, and the
 * three averages.
 *
 * This was the one whole strand of the primary curriculum the catalog had
 * nothing for. It is deliberately written as text rather than drawn: a bar
 * chart described in words — "Mon 4, Tue 7, Wed 3" — asks the same question
 * as a picture of one, which is *reading a total off a set of readings*, and
 * needs no rendering to do it.
 *
 * The pictogram is the exception worth having, because its whole difficulty
 * is the key: half a symbol means half of whatever the key says, and a child
 * who ignores the key gets a plausible wrong answer rather than a silly one.
 */

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const SUBJECTS = ['Ella', 'Sam', 'Ravi', 'Mia', 'Tom'];

/** Values as a readable row: "Mon 4, Tue 7, Wed 3". */
const asRow = (labels: string[], values: number[]): string =>
  labels.map((label, i) => `${label} ${values[i]}`).join(', ');

const spread = (count: number, max: number, rng: Rng): number[] =>
  Array.from({ length: count }, () => rng.randInt(1, max));

export function chartTotal(maxValue: number, rng: Rng): Question {
  const count = rng.randInt(3, 5);
  const values = spread(count, maxValue, rng);
  const labels = DAYS.slice(0, count);
  const total = values.reduce((a, b) => a + b, 0);
  return makeQuestion(
    rng,
    `A bar chart shows how many books were read each day:\n${asRow(labels, values)}\n\nHow many were read altogether?`,
    String(total),
    // The largest bar alone, and the total one bar out either way.
    numPool(total, [Math.max(...values), total - Math.min(...values), total + 1]),
    `Add every bar: ${values.join(' + ')} = ${total}`,
    'integer',
  );
}

export function chartDifference(maxValue: number, rng: Rng): Question {
  const count = rng.randInt(3, 5);
  const labels = DAYS.slice(0, count);

  // At least two different heights, or "how many more than the worst day" is
  // zero — arithmetically fine and a pointless thing to ask.
  let values = spread(count, maxValue, rng);
  if (new Set(values).size === 1) {
    const other = values[0] === maxValue ? values[0] - 1 : values[0] + 1;
    values = [...values.slice(0, -1), other];
  }

  const most = Math.max(...values);
  const least = Math.min(...values);
  const gap = most - least;
  return makeQuestion(
    rng,
    `A bar chart shows how many goals were scored each day:\n${asRow(labels, values)}\n\nHow many more were scored on the best day than the worst?`,
    String(gap),
    // The two bars themselves, and their sum — the three near misses.
    numPool(gap, [most, least, most + least]),
    `The most is ${most} and the least is ${least}: ${most} − ${least} = ${gap}`,
    'integer',
  );
}

export function chartReadOff(maxValue: number, rng: Rng): Question {
  const count = rng.randInt(4, 5);
  const labels = SUBJECTS.slice(0, count);

  /*
    The winner has to be strictly ahead of everybody else.

    Dealing every value independently tied the top about one time in six —
    "Ella 8, Sam 9, Ravi 9, Mia 4" with the answer given as Sam, so a child
    reading it correctly and picking Ravi was marked wrong. Ties further down
    are fine and look like real data; it is only the answer that has to be
    unique, so the rest are dealt first and the winner is put one clear above
    them.
  */
  const rest = spread(count - 1, Math.max(2, maxValue - 1), rng);
  const most = Math.max(...rest) + 1;
  const at = rng.randInt(0, count - 1);
  const values = [...rest.slice(0, at), most, ...rest.slice(at)];
  const winner = labels[at];
  return makeQuestion(
    rng,
    `This table shows how many stickers each child collected:\n${asRow(labels, values)}\n\nWho collected the most?`,
    winner,
    labels.filter((l) => l !== winner),
    `${winner} has ${most}, which is more than anyone else.`,
    null,
  );
}

/**
 * A pictogram, where the key is the whole question.
 *
 * Half symbols only once the key is an even number, so a half is always a
 * whole number of things.
 */
export function pictogram(maxSymbols: number, rng: Rng): Question {
  const key = rng.pick([2, 4, 5, 10]);
  const whole = rng.randInt(2, maxSymbols);
  const half = key % 2 === 0 && rng.next() < 0.5;
  const total = whole * key + (half ? key / 2 : 0);
  const drawn = half ? `${whole} and a half symbols` : `${whole} symbols`;
  return makeQuestion(
    rng,
    `In a pictogram, one symbol stands for ${key} apples.\nOne row has ${drawn}.\n\nHow many apples is that?`,
    String(total),
    // Counting the symbols instead of using the key, and using half a symbol
    // as one whole.
    numPool(total, [whole, whole + key, whole * key + key]),
    half
      ? `${whole} × ${key} = ${whole * key}, and half a symbol is ${key / 2} more: ${total}`
      : `${whole} × ${key} = ${total}`,
    'integer',
  );
}

/** Mean, median, mode and range — chosen so each has a whole-number answer. */
export function averageOfSet(maxValue: number, rng: Rng): Question {
  const count = rng.pick([3, 5]);
  const values = spread(count, maxValue, rng).sort((a, b) => a - b);
  const kind = rng.pick(['median', 'range', 'mode'] as const);

  if (kind === 'range') {
    const range = values[values.length - 1] - values[0];
    return makeQuestion(
      rng,
      `Here are some scores:\n${values.join(', ')}\n\nWhat is the range?`,
      String(range),
      numPool(range, [values[values.length - 1], values[0], range + 1]),
      `The range is the biggest take away the smallest: ${values[values.length - 1]} − ${values[0]} = ${range}`,
      'integer',
    );
  }

  if (kind === 'median') {
    const median = values[(count - 1) / 2];
    return makeQuestion(
      rng,
      `Here are some scores, already in order:\n${values.join(', ')}\n\nWhat is the median?`,
      String(median),
      numPool(median, [values[0], values[count - 1], median + 1]),
      `The median is the middle one once they are in order: ${median}`,
      'integer',
    );
  }

  /*
    A mode needs exactly one repeated value.

    The others have to be distinct from each other as well as from the planted
    one. Keeping them clear of the mode alone is not enough: two of them
    landing on the same number gives that number a count of two as well, and
    the question then has two right answers with only one of them marked
    correct. Drawing without replacement is the only way to be sure.
  */
  const modeValue = rng.randInt(1, maxValue);
  const pool = rng.shuffle(
    Array.from({ length: maxValue }, (_, i) => i + 1).filter((v) => v !== modeValue),
  );
  const others = pool.slice(0, count - 2);
  const withMode = rng.shuffle([modeValue, modeValue, ...others]);
  return makeQuestion(
    rng,
    `Here are some scores:\n${withMode.join(', ')}\n\nWhich score appears most often?`,
    String(modeValue),
    numPool(modeValue, [...others.slice(0, 2), modeValue + 1]),
    `${modeValue} appears twice, and every other score appears once.`,
    'integer',
  );
}
