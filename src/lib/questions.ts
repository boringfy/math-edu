import { Grade, Question, Tier } from '../types';
import { cakeCutQuestion } from './drawPuzzles';
import { Gen, makeQuestion, numPool, pick, randInt, shuffle } from './generator';
import { geometryFor } from './geometry';
import { measurementFor } from './measurement';
import { moneyFor } from './money';
import { physicsFor } from './physics';
import { wordProblemsFor } from './wordProblems';

function addition(maxSum: number): Question {
  const a = randInt(1, maxSum - 1);
  const b = randInt(1, maxSum - a);
  const sum = a + b;
  return makeQuestion(
    `${a} + ${b} = ?`,
    String(sum),
    numPool(sum, [a, b, Math.abs(a - b)]),
    `${a} + ${b} = ${sum}`,
    'integer',
  );
}

function subtraction(max: number): Question {
  const a = randInt(2, max);
  const b = randInt(1, a - 1);
  const diff = a - b;
  return makeQuestion(
    `${a} - ${b} = ?`,
    String(diff),
    numPool(diff, [a + b, b]),
    `${a} - ${b} = ${diff}`,
    'integer',
  );
}

/** "? + 3 = 10" — the sum and one part are known. */
function missingAddend(maxSum: number): Question {
  const sum = randInt(3, maxSum);
  const known = randInt(1, sum - 1);
  const missing = sum - known;
  const prompt = Math.random() < 0.5 ? `? + ${known} = ${sum}` : `${known} + ? = ${sum}`;
  return makeQuestion(
    prompt,
    String(missing),
    // Adding when you should subtract, or echoing a number from the prompt.
    numPool(missing, [sum + known, sum, known]),
    `${sum} - ${known} = ${missing}`,
    'integer',
  );
}

/** "10 - ? = 4" and "? - 4 = 6" — subtraction with a hole in it. */
function missingSubtractionPart(max: number): Question {
  const total = randInt(3, max);
  const result = randInt(1, total - 1);
  if (Math.random() < 0.5) {
    const missing = total - result;
    return makeQuestion(
      `${total} - ? = ${result}`,
      String(missing),
      numPool(missing, [total + result, result, total]),
      `${total} - ${missing} = ${result}, so the missing number is ${total} - ${result} = ${missing}`,
      'integer',
    );
  }
  // Cap the subtrahend so the missing starting amount stays inside the range.
  const subtracted = randInt(1, Math.max(1, max - result));
  const missing = subtracted + result;
  return makeQuestion(
    `? - ${subtracted} = ${result}`,
    String(missing),
    numPool(missing, [Math.abs(result - subtracted), result, subtracted]),
    `${missing} - ${subtracted} = ${result}, so the missing number is ${subtracted} + ${result} = ${missing}`,
    'integer',
  );
}

/** "6 × ? = 42" — the product and one factor are known. */
function missingFactor(maxFactor: number): Question {
  const known = randInt(2, maxFactor);
  const missing = randInt(2, maxFactor);
  const product = known * missing;
  const prompt = Math.random() < 0.5 ? `? × ${known} = ${product}` : `${known} × ? = ${product}`;
  return makeQuestion(
    prompt,
    String(missing),
    // Subtracting instead of dividing is the usual wrong move.
    numPool(missing, [product - known, product, known]),
    `${product} ÷ ${known} = ${missing}`,
    'integer',
  );
}

/** "? ÷ 3 = 5" and "24 ÷ ? = 6". */
function missingDivisionPart(divisorMax: number, quotientMax: number): Question {
  const divisor = randInt(2, divisorMax);
  const quotient = randInt(2, quotientMax);
  const dividend = divisor * quotient;
  if (Math.random() < 0.5) {
    return makeQuestion(
      `? ÷ ${divisor} = ${quotient}`,
      String(dividend),
      numPool(dividend, [quotient, divisor, quotient + divisor]),
      `${divisor} × ${quotient} = ${dividend}`,
      'integer',
    );
  }
  return makeQuestion(
    `${dividend} ÷ ? = ${quotient}`,
    String(divisor),
    numPool(divisor, [dividend, quotient, dividend - quotient]),
    `${dividend} ÷ ${quotient} = ${divisor}`,
    'integer',
  );
}

function tripleAddition(maxEach: number): Question {
  const a = randInt(1, maxEach);
  const b = randInt(1, maxEach);
  const c = randInt(1, maxEach);
  const sum = a + b + c;
  return makeQuestion(
    `${a} + ${b} + ${c} = ?`,
    String(sum),
    numPool(sum, [a + b, b + c]),
    `${a} + ${b} = ${a + b}, then ${a + b} + ${c} = ${sum}`,
    'integer',
  );
}

function multiplication(factorsA: [number, number], factorsB: [number, number]): Question {
  const a = randInt(factorsA[0], factorsA[1]);
  const b = randInt(factorsB[0], factorsB[1]);
  const product = a * b;
  return makeQuestion(
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

function tableMultiplication(tables: number[], maxOther: number): Question {
  const a = pick(tables);
  const b = randInt(1, maxOther);
  const product = a * b;
  return makeQuestion(
    `${a} × ${b} = ?`,
    String(product),
    [product + a, product - a, product + 1, a + b]
      .filter((n) => n !== product && n >= 0)
      .map(String),
    `${a} × ${b} = ${product}`,
    'integer',
  );
}

function division(divisorMax: number, quotientMax: number): Question {
  const divisor = randInt(2, divisorMax);
  const quotient = randInt(2, quotientMax);
  const dividend = divisor * quotient;
  return makeQuestion(
    `${dividend} ÷ ${divisor} = ?`,
    String(quotient),
    numPool(quotient, [divisor, dividend - divisor]),
    `${divisor} × ${quotient} = ${dividend}, so ${dividend} ÷ ${divisor} = ${quotient}`,
    'integer',
  );
}

function fractionAddSub(): Question {
  const d = randInt(4, 12);
  const isAdd = Math.random() < 0.5;
  if (isAdd) {
    const a = randInt(1, d - 2);
    const b = randInt(1, d - 1 - a);
    const n = a + b;
    return makeQuestion(
      `${a}/${d} + ${b}/${d} = ?`,
      `${n}/${d}`,
      // n/(2d) is the "added the denominators too" classic mistake.
      [`${n}/${2 * d}`, `${n + 1}/${d}`, `${Math.max(1, n - 1)}/${d}`, `${Math.abs(a - b) || n + 2}/${d}`],
      `Same denominator: add the tops. ${a} + ${b} = ${n}, so the answer is ${n}/${d}`,
      'fraction',
    );
  }
  const a = randInt(2, d - 1);
  const b = randInt(1, a - 1);
  const n = a - b;
  return makeQuestion(
    `${a}/${d} - ${b}/${d} = ?`,
    `${n}/${d}`,
    [`${n}/${2 * d}`, `${n + 1}/${d}`, `${a + b > d ? a : a + b}/${d}`, `${n + 2}/${d}`],
    `Same denominator: subtract the tops. ${a} - ${b} = ${n}, so the answer is ${n}/${d}`,
    'fraction',
  );
}

function largestFraction(): Question {
  const fractions: { text: string; value: number }[] = [];
  const seen = new Set<number>();
  while (fractions.length < 4) {
    const d = randInt(3, 9);
    const n = randInt(1, d - 1);
    const value = n / d;
    if (!seen.has(value)) {
      seen.add(value);
      fractions.push({ text: `${n}/${d}`, value });
    }
  }
  const best = fractions.reduce((a, b) => (b.value > a.value ? b : a));
  return makeQuestion(
    'Which fraction is the largest?',
    best.text,
    fractions.filter((f) => f !== best).map((f) => f.text),
    `${best.text} ≈ ${best.value.toFixed(2)}, which is bigger than the others`,
    // Unanswerable without seeing the options, so never asked as typed entry.
    null,
  );
}

function decimalAddSub(decimals: number): Question {
  const scale = 10 ** decimals;
  const ai = randInt(scale, 99 * scale) / scale;
  const bi = randInt(scale, 99 * scale) / scale;
  const isAdd = Math.random() < 0.5 || bi >= ai;
  const [a, b] = isAdd ? [ai, bi] : [Math.max(ai, bi), Math.min(ai, bi)];
  const result = isAdd ? a + b : a - b;
  const fmt = (n: number) => n.toFixed(decimals);
  const answer = fmt(result);
  return makeQuestion(
    `${fmt(a)} ${isAdd ? '+' : '-'} ${fmt(b)} = ?`,
    answer,
    // Misplaced decimal point and off-by-last-digit near-misses.
    [fmt(result * 10), fmt(result / 10), fmt(result + 1 / scale), fmt(result - 1 / scale)],
    `Line up the decimal points: ${fmt(a)} ${isAdd ? '+' : '-'} ${fmt(b)} = ${answer}`,
    'decimal',
  );
}

function decimalMultiplication(): Question {
  const a = randInt(11, 99) / 10;
  const k = randInt(2, 9);
  const result = (a * 10 * k) / 10;
  const fmt = (n: number) => n.toFixed(1);
  return makeQuestion(
    `${fmt(a)} × ${k} = ?`,
    fmt(result),
    [fmt(result * 10), fmt(result + k), fmt(result - k), fmt(result + 0.1)],
    `${a * 10} × ${k} = ${a * 10 * k}, then put the decimal back: ${fmt(result)}`,
    'decimal',
  );
}

function orderOfOperations(withParens: boolean): Question {
  const a = randInt(2, 9);
  const b = randInt(2, 9);
  const c = randInt(2, 9);
  if (withParens) {
    const result = (a + b) * c;
    return makeQuestion(
      `(${a} + ${b}) × ${c} = ?`,
      String(result),
      numPool(result, [a + b * c, a + b + c]),
      `Parentheses first: ${a} + ${b} = ${a + b}, then ${a + b} × ${c} = ${result}`,
      'integer',
    );
  }
  const result = a + b * c;
  return makeQuestion(
    `${a} + ${b} × ${c} = ?`,
    String(result),
    // (a+b)×c is the "went left to right" classic mistake.
    numPool(result, [(a + b) * c, a + b + c]),
    `Multiply first: ${b} × ${c} = ${b * c}, then ${a} + ${b * c} = ${result}`,
    'integer',
  );
}

/** Pure-arithmetic question generators for a grade at a difficulty tier. */
function generatorsFor(grade: Grade, tier: Tier): Gen[] {
  switch (grade) {
    case 1: {
      const limit = tier === 1 ? 10 : 20;
      const gens: Gen[] = [
        () => addition(limit),
        () => subtraction(limit),
        () => missingAddend(limit),
        () => missingSubtractionPart(limit),
      ];
      if (tier === 3) gens.push(() => tripleAddition(9));
      return gens;
    }
    case 2: {
      const limit = tier === 1 ? 50 : tier === 2 ? 100 : 200;
      const tables = tier === 1 ? [2, 5, 10] : tier === 2 ? [2, 3, 4, 5, 10] : [2, 3, 4, 5, 6, 10];
      return [
        () => addition(limit),
        () => subtraction(limit),
        () => tableMultiplication(tables, 10),
        () => missingAddend(limit),
        () => missingSubtractionPart(limit),
      ];
    }
    case 3: {
      const maxFactor = tier === 1 ? 5 : tier === 2 ? 10 : 12;
      const limit = tier === 1 ? 300 : 1000;
      return [
        () => multiplication([2, maxFactor], [2, maxFactor]),
        () => division(maxFactor, maxFactor),
        () => addition(limit),
        () => subtraction(limit),
        () => missingFactor(maxFactor),
        () => missingSubtractionPart(limit),
      ];
    }
    case 4: {
      const bigFactor: [number, number] =
        tier === 1 ? [11, 49] : tier === 2 ? [11, 99] : [101, 999];
      return [
        () => multiplication(bigFactor, [2, 9]),
        () => division(9, tier === 1 ? 20 : 99),
        () => fractionAddSub(),
        () => missingFactor(tier === 1 ? 9 : 12),
        () => missingDivisionPart(9, tier === 1 ? 20 : 50),
      ];
    }
    case 5: {
      const decimals = tier === 1 ? 1 : 2;
      const gens: Gen[] = [
        () => decimalAddSub(decimals),
        () => decimalMultiplication(),
        () => largestFraction(),
        () => orderOfOperations(false),
      ];
      if (tier === 3) gens.push(() => orderOfOperations(true));
      return gens;
    }
  }
}

/**
 * How the topics compete for slots in a quiz. Pools that are empty for a
 * grade (physics before grade 3, say) drop out and their share is spread
 * across the rest.
 */
const TOPIC_WEIGHTS = {
  arithmetic: 3,
  word: 2.5,
  geometry: 1.5,
  measurement: 1.5,
  money: 1.5,
  physics: 1,
};

/** Quizzes shorter than this skip the drawing puzzle. */
const MIN_QUESTIONS_FOR_DRAWING = 5;

/**
 * Share of typeable questions asked as typed entry instead of multiple
 * choice. Typing is harder than picking — there is nothing to guess from —
 * so it ramps up with the difficulty tier.
 */
export const ENTRY_SHARE: Record<Tier, number> = { 1: 0.25, 2: 0.5, 3: 0.75 };

/**
 * Splits `count` slots across the pools in proportion to their weights.
 * Whole slots go out first, then the leftovers go to whichever pools were
 * rounded down hardest, so the totals always add up exactly.
 */
function allocate(pools: { gens: Gen[]; weight: number }[], count: number): Question[] {
  const active = pools.filter((p) => p.gens.length > 0);
  if (active.length === 0 || count <= 0) return [];

  const totalWeight = active.reduce((sum, p) => sum + p.weight, 0);
  const shares = active.map((pool) => {
    const exact = (count * pool.weight) / totalWeight;
    const whole = Math.floor(exact);
    return { pool, whole, remainder: exact - whole };
  });

  let left = count - shares.reduce((sum, s) => sum + s.whole, 0);
  for (const share of [...shares].sort((a, b) => b.remainder - a.remainder)) {
    if (left <= 0) break;
    share.whole++;
    left--;
  }

  // Rotate within each pool so a quiz covers a spread of question types.
  return shares.flatMap(({ pool, whole }) =>
    Array.from({ length: whole }, (_, i) => pool.gens[i % pool.gens.length]()),
  );
}

export function generateQuiz(grade: Grade, tier: Tier, count: number): Question[] {
  const drawCount = count >= MIN_QUESTIONS_FOR_DRAWING ? 1 : 0;

  const questions = [
    ...allocate(
      [
        { gens: shuffle(generatorsFor(grade, tier)), weight: TOPIC_WEIGHTS.arithmetic },
        { gens: shuffle(wordProblemsFor(grade, tier)), weight: TOPIC_WEIGHTS.word },
        { gens: shuffle(geometryFor(grade, tier)), weight: TOPIC_WEIGHTS.geometry },
        { gens: shuffle(measurementFor(grade, tier)), weight: TOPIC_WEIGHTS.measurement },
        { gens: shuffle(moneyFor(grade, tier)), weight: TOPIC_WEIGHTS.money },
        { gens: shuffle(physicsFor(grade, tier)), weight: TOPIC_WEIGHTS.physics },
      ],
      count - drawCount,
    ),
    ...Array.from({ length: drawCount }, () => cakeCutQuestion(tier)),
  ];

  const typeable = questions.filter((q) => q.answerFormat !== null);
  const entryCount = Math.round(typeable.length * ENTRY_SHARE[tier]);
  for (const q of shuffle(typeable).slice(0, entryCount)) {
    q.mode = 'entry';
  }

  return shuffle(questions);
}

/** Same question with the choices re-shuffled, for correction-round retries. */
export function reshuffleChoices(q: Question): Question {
  return { ...q, choices: shuffle(q.choices) };
}

/** "3/4" -> 0.75, "1.50" -> 1.5. Returns null for anything unparseable. */
function parseAnswer(text: string): number | null {
  if (text === '') return null;
  const slash = text.indexOf('/');
  if (slash >= 0) {
    const numerator = Number(text.slice(0, slash));
    const denominator = Number(text.slice(slash + 1));
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
      return null;
    }
    return numerator / denominator;
  }
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/**
 * Grades a typed answer. Compares by value rather than by text, so "5" is
 * accepted for "5.0" and an equivalent fraction like "1/2" is accepted for
 * "4/8".
 */
export function isAnswerCorrect(question: Question, input: string): boolean {
  const given = input.trim();
  if (given === question.correctAnswer) return true;
  const a = parseAnswer(given);
  const b = parseAnswer(question.correctAnswer);
  return a !== null && b !== null && Math.abs(a - b) < 1e-9;
}

/** Grades a drawing puzzle: did the cuts produce exactly the target pieces? */
export function isDrawingCorrect(question: Question, pieces: number): boolean {
  return question.cakeTask !== undefined && pieces === question.cakeTask.pieces;
}

/**
 * Adaptive difficulty: too many mistakes (accuracy < 50%) steps the tier
 * down; near-perfect (>= 90%) steps it up.
 */
export function adjustTier(tier: Tier, accuracy: number): Tier {
  if (accuracy < 0.5) return Math.max(1, tier - 1) as Tier;
  if (accuracy >= 0.9) return Math.min(3, tier + 1) as Tier;
  return tier;
}
