// GENERATED FILE — DO NOT EDIT.
// Copied from backend/src/generators by `npm run sync:shared`.
// Change the original and re-run that; edits here are overwritten.

import { Question } from '../contract';
import { Rng, makeQuestion, numPool } from './generator';

export function addition(maxSum: number, rng: Rng): Question {
  const a = rng.randInt(1, maxSum - 1);
  const b = rng.randInt(1, maxSum - a);
  const sum = a + b;
  return makeQuestion(
    rng,
    `${a} + ${b} = ?`,
    String(sum),
    numPool(sum, [a, b, Math.abs(a - b)]),
    `${a} + ${b} = ${sum}`,
    'integer',
  );
}

export function subtraction(max: number, rng: Rng): Question {
  const a = rng.randInt(2, max);
  const b = rng.randInt(1, a - 1);
  const diff = a - b;
  return makeQuestion(
    rng,
    `${a} - ${b} = ?`,
    String(diff),
    numPool(diff, [a + b, b]),
    `${a} - ${b} = ${diff}`,
    'integer',
  );
}

/** "? + 3 = 10" — the sum and one part are known. */
export function missingAddend(maxSum: number, rng: Rng): Question {
  const sum = rng.randInt(3, maxSum);
  const known = rng.randInt(1, sum - 1);
  const missing = sum - known;
  const prompt = rng.next() < 0.5 ? `? + ${known} = ${sum}` : `${known} + ? = ${sum}`;
  return makeQuestion(
    rng,
    prompt,
    String(missing),
    // Adding when you should subtract, or echoing a number from the prompt.
    numPool(missing, [sum + known, sum, known]),
    `${sum} - ${known} = ${missing}`,
    'integer',
  );
}

/** "10 - ? = 4" and "? - 4 = 6" — subtraction with a hole in it. */
export function missingSubtractionPart(max: number, rng: Rng): Question {
  const total = rng.randInt(3, max);
  const result = rng.randInt(1, total - 1);
  if (rng.next() < 0.5) {
    const missing = total - result;
    return makeQuestion(
      rng,
      `${total} - ? = ${result}`,
      String(missing),
      numPool(missing, [total + result, result, total]),
      `${total} - ${missing} = ${result}, so the missing number is ${total} - ${result} = ${missing}`,
      'integer',
    );
  }
  // Cap the subtrahend so the missing starting amount stays inside the range.
  const subtracted = rng.randInt(1, Math.max(1, max - result));
  const missing = subtracted + result;
  return makeQuestion(
    rng,
    `? - ${subtracted} = ${result}`,
    String(missing),
    numPool(missing, [Math.abs(result - subtracted), result, subtracted]),
    `${missing} - ${subtracted} = ${result}, so the missing number is ${subtracted} + ${result} = ${missing}`,
    'integer',
  );
}

/** "6 × ? = 42" — the product and one factor are known. */
export function missingFactor(maxFactor: number, rng: Rng): Question {
  const known = rng.randInt(2, maxFactor);
  const missing = rng.randInt(2, maxFactor);
  const product = known * missing;
  const prompt = rng.next() < 0.5 ? `? × ${known} = ${product}` : `${known} × ? = ${product}`;
  return makeQuestion(
    rng,
    prompt,
    String(missing),
    // Subtracting instead of dividing is the usual wrong move.
    numPool(missing, [product - known, product, known]),
    `${product} ÷ ${known} = ${missing}`,
    'integer',
  );
}

/** "? ÷ 3 = 5" and "24 ÷ ? = 6". */
export function missingDivisionPart(divisorMax: number, quotientMax: number, rng: Rng): Question {
  const divisor = rng.randInt(2, divisorMax);
  const quotient = rng.randInt(2, quotientMax);
  const dividend = divisor * quotient;
  if (rng.next() < 0.5) {
    return makeQuestion(
      rng,
      `? ÷ ${divisor} = ${quotient}`,
      String(dividend),
      numPool(dividend, [quotient, divisor, quotient + divisor]),
      `${divisor} × ${quotient} = ${dividend}`,
      'integer',
    );
  }
  return makeQuestion(
    rng,
    `${dividend} ÷ ? = ${quotient}`,
    String(divisor),
    numPool(divisor, [dividend, quotient, dividend - quotient]),
    `${dividend} ÷ ${quotient} = ${divisor}`,
    'integer',
  );
}

export function tripleAddition(maxEach: number, rng: Rng): Question {
  const a = rng.randInt(1, maxEach);
  const b = rng.randInt(1, maxEach);
  const c = rng.randInt(1, maxEach);
  const sum = a + b + c;
  return makeQuestion(
    rng,
    `${a} + ${b} + ${c} = ?`,
    String(sum),
    numPool(sum, [a + b, b + c]),
    `${a} + ${b} = ${a + b}, then ${a + b} + ${c} = ${sum}`,
    'integer',
  );
}

export function multiplication(factorsA: [number, number], factorsB: [number, number], rng: Rng): Question {
  const a = rng.randInt(factorsA[0], factorsA[1]);
  const b = rng.randInt(factorsB[0], factorsB[1]);
  const product = a * b;
  return makeQuestion(
    rng,
    `${a} × ${b} = ?`,
    String(product),
    // Adjacent table entries are the classic near-misses.
    [product + a, product - a, product + b, product - b, a + b]
      .filter((n) => n !== product && n >= 0)
      .map(String),
    `${a} × ${b} = ${product}`,
    'integer',
  );
}

export function tableMultiplication(tables: number[], maxOther: number, rng: Rng): Question {
  const a = rng.pick(tables);
  const b = rng.randInt(1, maxOther);
  const product = a * b;
  return makeQuestion(
    rng,
    `${a} × ${b} = ?`,
    String(product),
    [product + a, product - a, product + 1, a + b]
      .filter((n) => n !== product && n >= 0)
      .map(String),
    `${a} × ${b} = ${product}`,
    'integer',
  );
}

export function division(divisorMax: number, quotientMax: number, rng: Rng): Question {
  const divisor = rng.randInt(2, divisorMax);
  const quotient = rng.randInt(2, quotientMax);
  const dividend = divisor * quotient;
  return makeQuestion(
    rng,
    `${dividend} ÷ ${divisor} = ?`,
    String(quotient),
    numPool(quotient, [divisor, dividend - divisor]),
    `${divisor} × ${quotient} = ${dividend}, so ${dividend} ÷ ${divisor} = ${quotient}`,
    'integer',
  );
}

/** Division kept inside the tables the grade has actually met. */
export function tableDivision(tables: number[], maxQuotient: number, rng: Rng): Question {
  const divisor = rng.pick(tables);
  const quotient = rng.randInt(2, maxQuotient);
  const dividend = divisor * quotient;
  return makeQuestion(
    rng,
    `${dividend} ÷ ${divisor} = ?`,
    String(quotient),
    // Subtracting instead of dividing, and answering with a number that was
    // in the question.
    numPool(quotient, [dividend - divisor, dividend, divisor]),
    `${divisor} × ${quotient} = ${dividend}, so ${dividend} ÷ ${divisor} = ${quotient}`,
    'integer',
  );
}

/** Doubling and halving — the first × 2 and ÷ 2 done in the head. */
export function doubleOrHalf(max: number, rng: Rng): Question {
  if (rng.next() < 0.5) {
    const n = rng.randInt(5, max);
    return makeQuestion(
      rng,
      `Double ${n} = ?`,
      String(n * 2),
      // Halving instead of doubling, and adding ten rather than another n.
      numPool(n * 2, [n, Math.floor(n / 2), n + 10]),
      `${n} + ${n} = ${n * 2}`,
      'integer',
    );
  }
  const half = rng.randInt(3, max);
  const n = half * 2;
  return makeQuestion(
    rng,
    `Half of ${n} = ?`,
    String(half),
    numPool(half, [n, n * 2, half + 10]),
    `${half} + ${half} = ${n}, so half of ${n} is ${half}`,
    'integer',
  );
}

/**
 * The same amount added over and over, written as a multiplication with the
 * count missing. It is the one question that says out loud what × means,
 * which is what makes the tables worth learning rather than reciting.
 */
export function repeatedAddition(tables: number[], maxTimes: number, rng: Rng): Question {
  const value = rng.pick(tables);
  const times = rng.randInt(2, maxTimes);
  return makeQuestion(
    rng,
    `${Array.from({ length: times }, () => value).join(' + ')} = ? × ${value}`,
    String(times),
    // Answering with the total, or with the number being added.
    numPool(times, [value * times, value]),
    `${value} is added ${times} times, so it is ${times} × ${value} = ${value * times}`,
    'integer',
  );
}

/**
 * An array of dots. The point is that the answer can be counted one by one
 * if it has to be, so a child who hasn't learnt the table yet still gets
 * there — and sees why the rows-times-columns shortcut works.
 */
export function dotArray(maxRows: number, maxColumns: number, rng: Rng): Question {
  const rows = rng.randInt(2, maxRows);
  const columns = rng.randInt(2, maxColumns);
  const total = rows * columns;
  const picture = Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => '●').join(' '),
  ).join('\n');
  return makeQuestion(
    rng,
    `${picture}\nHow many dots altogether?`,
    String(total),
    // Adding the sides instead of multiplying, and losing a row or a column.
    numPool(total, [rows + columns, total - rows, total - columns]),
    `${rows} rows of ${columns} is ${rows} × ${columns} = ${total}`,
    'integer',
  );
}

export function fractionAddSub(rng: Rng): Question {
  const d = rng.randInt(4, 12);
  const isAdd = rng.next() < 0.5;
  if (isAdd) {
    const a = rng.randInt(1, d - 2);
    const b = rng.randInt(1, d - 1 - a);
    const n = a + b;
    return makeQuestion(
      rng,
      `${a}/${d} + ${b}/${d} = ?`,
      `${n}/${d}`,
      // n/(2d) is the "added the denominators too" classic mistake.
      [`${n}/${2 * d}`, `${n + 1}/${d}`, `${Math.max(1, n - 1)}/${d}`, `${Math.abs(a - b) || n + 2}/${d}`],
      `Same denominator: add the tops. ${a} + ${b} = ${n}, so the answer is ${n}/${d}`,
      'fraction',
    );
  }
  const a = rng.randInt(2, d - 1);
  const b = rng.randInt(1, a - 1);
  const n = a - b;
  return makeQuestion(
    rng,
    `${a}/${d} - ${b}/${d} = ?`,
    `${n}/${d}`,
    [`${n}/${2 * d}`, `${n + 1}/${d}`, `${a + b > d ? a : a + b}/${d}`, `${n + 2}/${d}`],
    `Same denominator: subtract the tops. ${a} - ${b} = ${n}, so the answer is ${n}/${d}`,
    'fraction',
  );
}

export function largestFraction(rng: Rng): Question {
  const fractions: { text: string; value: number }[] = [];
  const seen = new Set<number>();
  while (fractions.length < 4) {
    const d = rng.randInt(3, 9);
    const n = rng.randInt(1, d - 1);
    const value = n / d;
    if (!seen.has(value)) {
      seen.add(value);
      fractions.push({ text: `${n}/${d}`, value });
    }
  }
  const best = fractions.reduce((a, b) => (b.value > a.value ? b : a));
  return makeQuestion(
    rng,
    'Which fraction is the largest?',
    best.text,
    fractions.filter((f) => f !== best).map((f) => f.text),
    `${best.text} ≈ ${best.value.toFixed(2)}, which is bigger than the others`,
    // Unanswerable without seeing the options, so never asked as typed entry.
    null,
  );
}

export function decimalAddSub(decimals: number, rng: Rng): Question {
  const scale = 10 ** decimals;
  const ai = rng.randInt(scale, 99 * scale) / scale;
  const bi = rng.randInt(scale, 99 * scale) / scale;
  const isAdd = rng.next() < 0.5 || bi >= ai;
  const [a, b] = isAdd ? [ai, bi] : [Math.max(ai, bi), Math.min(ai, bi)];
  const result = isAdd ? a + b : a - b;
  const fmt = (n: number) => n.toFixed(decimals);
  const answer = fmt(result);
  return makeQuestion(
    rng,
    `${fmt(a)} ${isAdd ? '+' : '-'} ${fmt(b)} = ?`,
    answer,
    // Misplaced decimal point and off-by-last-digit near-misses.
    [fmt(result * 10), fmt(result / 10), fmt(result + 1 / scale), fmt(result - 1 / scale)],
    `Line up the decimal points: ${fmt(a)} ${isAdd ? '+' : '-'} ${fmt(b)} = ${answer}`,
    'decimal',
  );
}

export function decimalMultiplication(rng: Rng): Question {
  const a = rng.randInt(11, 99) / 10;
  const k = rng.randInt(2, 9);
  const result = (a * 10 * k) / 10;
  const fmt = (n: number) => n.toFixed(1);
  return makeQuestion(
    rng,
    `${fmt(a)} × ${k} = ?`,
    fmt(result),
    [fmt(result * 10), fmt(result + k), fmt(result - k), fmt(result + 0.1)],
    `${a * 10} × ${k} = ${a * 10 * k}, then put the decimal back: ${fmt(result)}`,
    'decimal',
  );
}

export function orderOfOperations(withParens: boolean, rng: Rng): Question {
  const a = rng.randInt(2, 9);
  const b = rng.randInt(2, 9);
  const c = rng.randInt(2, 9);
  if (withParens) {
    const result = (a + b) * c;
    return makeQuestion(
      rng,
      `(${a} + ${b}) × ${c} = ?`,
      String(result),
      numPool(result, [a + b * c, a + b + c]),
      `Parentheses first: ${a} + ${b} = ${a + b}, then ${a + b} × ${c} = ${result}`,
      'integer',
    );
  }
  const result = a + b * c;
  return makeQuestion(
    rng,
    `${a} + ${b} × ${c} = ?`,
    String(result),
    // (a+b)×c is the "went left to right" classic mistake.
    numPool(result, [(a + b) * c, a + b + c]),
    `Multiply first: ${b} × ${c} = ${b * c}, then ${a} + ${b * c} = ${result}`,
    'integer',
  );
}
