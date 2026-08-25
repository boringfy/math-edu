import { Grade, Question, Tier } from '../../types';
import { Gen } from '../generator';
import { geometryFor } from '../geometry';
import { measurementFor } from '../measurement';
import { moneyFor } from '../money';
import { numberSenseFor } from '../numberSense';
import { physicsFor } from '../physics';
import { timeFor } from '../time';
import {
  adjustTier,
  ENTRY_SHARE,
  generateQuiz,
  lessonPools,
  isAnswerCorrect,
  isDrawingCorrect,
  reshuffleChoices,
} from '../questions';
import { wordProblemsFor } from '../wordProblems';

const GRADES: Grade[] = [1, 2, 3, 4, 5];
const TIERS: Tier[] = [1, 2, 3];
const GRADE_TIERS = GRADES.flatMap((g) => TIERS.map((t) => [g, t] as const));

function evaluate(expression: string): number {
  // eslint-disable-next-line no-new-func
  return new Function(`return (${expression});`)() as number;
}

/** "3/4" -> 0.75, "2.50" -> 2.5. */
function valueOf(answer: string): number {
  if (answer.includes('/')) {
    const [n, d] = answer.split('/');
    return Number(n) / Number(d);
  }
  return Number(answer);
}

/**
 * For prompts that are plain equations — "12 + 3 = ?" or "10 - ? = 4" —
 * substitutes the answer back in and checks both sides really do balance.
 * Returns false for prompts this can't apply to.
 */
function equationBalances(prompt: string, answer: string): boolean {
  const expression = prompt.replace(/×/g, '*').replace(/÷/g, '/');
  if (!/^[\d\s+\-*/().?]+=[\d\s+\-*/().?]+$/.test(expression)) return false;
  // A fraction answer would read as division once substituted.
  if (answer.includes('/')) return false;

  const [left, right] = expression.split('=');
  const substitute = (side: string) => evaluate(side.replace('?', answer));
  expect(substitute(left)).toBeCloseTo(substitute(right), 6);
  return true;
}

function expectWellFormed(q: Question) {
  expect(q.prompt.length).toBeGreaterThan(0);
  expect(q.prompt).not.toMatch(/NaN|undefined|Infinity/);
  expect(q.explanation.length).toBeGreaterThan(0);
  expect(q.explanation).not.toMatch(/NaN|undefined|Infinity/);

  if (q.mode === 'draw') {
    // Drawing puzzles are solved on the cake, so they carry no choices.
    expect(q.cakeTask).toBeDefined();
    expect(q.choices).toHaveLength(0);
    return;
  }

  expect(q.choices).toHaveLength(4);
  expect(new Set(q.choices).size).toBe(4);
  expect(q.choices).toContain(q.correctAnswer);
  equationBalances(q.prompt, q.correctAnswer);
}

/** Every generator in a pool, exercised enough times to shake out edge cases. */
function expectPoolIsSound(gens: Gen[], runs = 25) {
  for (const gen of gens) {
    for (let i = 0; i < runs; i++) {
      const q = gen();
      expectWellFormed(q);
      expect(q.answerFormat).not.toBeNull();
      const value = valueOf(q.correctAnswer);
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
  }
}

describe('generateQuiz', () => {
  it.each(GRADE_TIERS)('grade %i tier %i produces valid questions', (grade, tier) => {
    const questions = generateQuiz(grade, tier, 40);
    expect(questions).toHaveLength(40);
    questions.forEach(expectWellFormed);
  });

  it('gives every question a unique id', () => {
    const questions = generateQuiz(3, 2, 30);
    expect(new Set(questions.map((q) => q.id)).size).toBe(30);
  });

  it('grade 1 tier 1 stays within 10', () => {
    for (const q of generateQuiz(1, 1, 50)) {
      if (q.mode === 'draw') continue; // answered in pieces, not a number in range
      expect(Number(q.correctAnswer)).toBeLessThanOrEqual(10);
      expect(Number(q.correctAnswer)).toBeGreaterThanOrEqual(0);
    }
  });

  it('mixes in story problems', () => {
    for (const [grade, tier] of GRADE_TIERS) {
      const questions = generateQuiz(grade, tier, 20);
      const stories = questions.filter(
        (q) => q.mode !== 'draw' && q.prompt.split(' ').length > 8,
      );
      expect(stories.length).toBeGreaterThan(0);
    }
  });

  it('asks a range of topics rather than one kind of question', () => {
    for (const [grade, tier] of GRADE_TIERS) {
      const prompts = new Set(generateQuiz(grade, tier, 20).map((q) => q.prompt));
      expect(prompts.size).toBeGreaterThan(10);
    }
  });

  it('always fills the requested number of questions', () => {
    for (const count of [1, 3, 5, 7, 10, 15, 40]) {
      for (const [grade, tier] of GRADE_TIERS) {
        expect(generateQuiz(grade, tier, count)).toHaveLength(count);
      }
    }
  });
});

describe('missing-operand questions', () => {
  it('balances once the answer is substituted back in', () => {
    // Grades 1-4 all carry a missing-operand generator.
    let checked = 0;
    for (const [grade, tier] of GRADE_TIERS) {
      for (const q of generateQuiz(grade, tier, 40)) {
        if (!/\?/.test(q.prompt) || q.prompt.trim().endsWith('= ?')) continue;
        if (equationBalances(q.prompt, q.correctAnswer)) checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe('drawing puzzles', () => {
  it('includes one in a normal-length quiz', () => {
    for (const [grade, tier] of GRADE_TIERS) {
      const drawings = generateQuiz(grade, tier, 10).filter((q) => q.mode === 'draw');
      expect(drawings).toHaveLength(1);
    }
  });

  it('leaves them out of very short quizzes', () => {
    expect(generateQuiz(3, 2, 3).filter((q) => q.mode === 'draw')).toHaveLength(0);
  });

  it('only asks for piece counts the cuts can actually reach', () => {
    for (const tier of TIERS) {
      for (let i = 0; i < 40; i++) {
        const [puzzle] = generateQuiz(3, tier, 10).filter((q) => q.mode === 'draw');
        const { cuts, pieces } = puzzle.cakeTask!;
        // n cuts give between n+1 and 1+n+n(n-1)/2 pieces.
        expect(pieces).toBeGreaterThanOrEqual(cuts + 1);
        expect(pieces).toBeLessThanOrEqual(1 + cuts + (cuts * (cuts - 1)) / 2);
      }
    }
  });

  it('grades on the number of pieces produced', () => {
    const [puzzle] = generateQuiz(3, 2, 10).filter((q) => q.mode === 'draw');
    const { pieces } = puzzle.cakeTask!;
    expect(isDrawingCorrect(puzzle, pieces)).toBe(true);
    expect(isDrawingCorrect(puzzle, pieces + 1)).toBe(false);
    expect(isDrawingCorrect(puzzle, pieces - 1)).toBe(false);
  });
});

describe('topic pools', () => {
  it.each(GRADE_TIERS)('grade %i tier %i story problems are sound', (grade, tier) => {
    expectPoolIsSound(wordProblemsFor(grade, tier));
  });

  it.each(GRADE_TIERS)('grade %i tier %i geometry is sound', (grade, tier) => {
    expectPoolIsSound(geometryFor(grade, tier));
  });

  it.each(GRADE_TIERS)('grade %i tier %i measurement is sound', (grade, tier) => {
    expectPoolIsSound(measurementFor(grade, tier));
  });

  it.each(GRADE_TIERS)('grade %i tier %i money problems are sound', (grade, tier) => {
    expectPoolIsSound(moneyFor(grade, tier));
  });

  it.each(GRADE_TIERS)('grade %i tier %i speed problems are sound', (grade, tier) => {
    expectPoolIsSound(physicsFor(grade, tier));
  });

  it.each(GRADE_TIERS)('grade %i tier %i number sense is sound', (grade, tier) => {
    expectPoolIsSound(numberSenseFor(grade, tier));
  });

  it.each(GRADE_TIERS)('grade %i tier %i clock questions are well formed', (grade, tier) => {
    // Times and clock labels aren't numbers, so these are checked for shape
    // rather than for value; time.test.ts checks the clocks themselves.
    for (const gen of timeFor(grade, tier)) {
      for (let i = 0; i < 25; i++) expectWellFormed(gen());
    }
  });

  it('keeps grade 1 story problems inside the grade 1 range', () => {
    for (const gen of wordProblemsFor(1, 1)) {
      for (let i = 0; i < 50; i++) {
        expect(Number(gen().correctAnswer)).toBeLessThanOrEqual(10);
      }
    }
  });
});

/**
 * Legs-and-wheels problems are the only ones that don't state their rate in
 * the prompt — "6 birds, how many feet?" expects the child to know a bird has
 * two. That only works when the count is genuinely fixed. "2 trucks, how many
 * wheels?" has no answer, because a truck can have 4, 6, 10 or 18.
 */
describe('story problems that rely on real-world knowledge', () => {
  /** Subjects whose leg or wheel count genuinely varies. */
  const AMBIGUOUS = [
    'truck', 'lorry', 'van', 'wagon', 'bus', 'train', 'trailer', 'tractor',
    'centipede', 'millipede', 'caterpillar', 'crab', 'shrimp',
  ];

  it('never leans on a subject whose count is arguable', () => {
    for (const [grade, tier] of GRADE_TIERS) {
      for (const gen of wordProblemsFor(grade, tier)) {
        for (let i = 0; i < 30; i++) {
          const prompt = gen().prompt.toLowerCase();
          // A prompt that spells its rate out is fine whatever it is about:
          // "each bus holds 20 students" settles the question by itself.
          if (/each .* (has|holds|costs) \d+/.test(prompt)) continue;
          for (const subject of AMBIGUOUS) {
            expect(prompt).not.toContain(subject);
          }
        }
      }
    }
  });

  /**
   * The real guarantee: any question that doesn't state its rate must be
   * answerable from the subject alone. Catch it by checking that a prompt
   * asking for a total of legs/feet/wheels either names a subject with a
   * fixed count or spells the rate out.
   */
  it('states the rate whenever the subject alone would not settle it', () => {
    const FIXED = /bird|duck|chicken|dog|cat|horse|cow|ant|beetle|spider|octopus|bicycle|motorbike|tricycle|car|taxi/;
    for (const [grade, tier] of GRADE_TIERS) {
      for (const gen of wordProblemsFor(grade, tier)) {
        for (let i = 0; i < 30; i++) {
          const q = gen();
          if (!/how many (feet|legs|arms|wheels)/i.test(q.prompt)) continue;
          const statesRate = /each .* has \d+/i.test(q.prompt);
          expect(statesRate || FIXED.test(q.prompt.toLowerCase())).toBe(true);
        }
      }
    }
  });
});

/**
 * Grade 2's "× ÷" pool used to be one times-table generator, which made the
 * back half of its map the same question over and over. These are what fill
 * it out, and each one has a different way of going wrong.
 */
describe('grade 2 multiplication and division', () => {
  const poolAt = (tier: Tier) => lessonPools(2, tier).mulDiv;

  const promptsFrom = (tier: Tier, runs = 60): Question[] =>
    Array.from({ length: runs }, () => poolAt(tier).map((gen) => gen())).flat();

  it('offers more than one kind of question at every tier', () => {
    for (const tier of TIERS) expect(poolAt(tier).length).toBeGreaterThanOrEqual(5);
  });

  it('divides exactly, inside the tables the grade has met', () => {
    for (const tier of TIERS) {
      const tables = tier === 1 ? [2, 5, 10] : tier === 2 ? [2, 3, 4, 5, 10] : [2, 3, 4, 5, 6, 10];
      for (const q of promptsFrom(tier)) {
        const division = q.prompt.match(/^(\d+) ÷ (\d+) = \?$/);
        if (!division) continue;
        const [, dividend, divisor] = division.map(Number);
        expect(tables).toContain(divisor);
        expect(dividend % divisor).toBe(0);
        expect(Number(q.correctAnswer)).toBe(dividend / divisor);
      }
    }
  });

  it('doubles and halves to whole numbers', () => {
    let seen = 0;
    for (const q of promptsFrom(2)) {
      const double = q.prompt.match(/^Double (\d+) = \?$/);
      const half = q.prompt.match(/^Half of (\d+) = \?$/);
      if (double) expect(Number(q.correctAnswer)).toBe(Number(double[1]) * 2);
      if (half) {
        expect(Number(half[1]) % 2).toBe(0);
        expect(Number(q.correctAnswer)).toBe(Number(half[1]) / 2);
      }
      if (double || half) seen++;
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('draws exactly as many dots as the array is worth', () => {
    let seen = 0;
    for (const tier of TIERS) {
      for (const q of promptsFrom(tier, 20)) {
        if (!q.prompt.includes('●')) continue;
        const rows = q.prompt.split('\n').filter((line) => line.includes('●'));
        const widths = new Set(rows.map((row) => row.split(' ').length));
        // A ragged array would make the shortcut a lie.
        expect(widths.size).toBe(1);
        const dots = (q.prompt.match(/●/g) ?? []).length;
        expect(dots).toBe(Number(q.correctAnswer));
        expect(rows.length * [...widths][0]).toBe(dots);
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('asks for the number of times a repeated addition repeats', () => {
    let seen = 0;
    for (const tier of TIERS) {
      for (const q of promptsFrom(tier, 20)) {
        const repeated = q.prompt.match(/^([\d +]+) = \? × (\d+)$/);
        if (!repeated) continue;
        const terms = repeated[1].split(' + ').map(Number);
        expect(new Set(terms).size).toBe(1);
        expect(terms[0]).toBe(Number(repeated[2]));
        expect(Number(q.correctAnswer)).toBe(terms.length);
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});

describe('typed-entry mode', () => {
  it.each(GRADE_TIERS)('grade %i tier %i only types answers that can be typed', (grade, tier) => {
    for (const q of generateQuiz(grade, tier, 40)) {
      if (q.mode === 'entry') expect(q.answerFormat).not.toBeNull();
      if (q.answerFormat === 'fraction') expect(q.correctAnswer).toContain('/');
      if (q.answerFormat === 'integer') expect(q.correctAnswer).toMatch(/^\d+$/);
      if (q.answerFormat === 'decimal') expect(q.correctAnswer).toMatch(/^\d+\.\d+$/);
    }
  });

  it('asks more questions by typing as the tier goes up', () => {
    for (const tier of TIERS) {
      const questions = generateQuiz(3, tier, 20);
      const typeable = questions.filter((q) => q.answerFormat !== null).length;
      const typed = questions.filter((q) => q.mode === 'entry').length;
      expect(typed).toBe(Math.round(typeable * ENTRY_SHARE[tier]));
    }
  });

  it('never types a question that needs its choices visible', () => {
    for (const tier of TIERS) {
      for (const q of generateQuiz(5, tier, 60)) {
        if (q.answerFormat === null) expect(q.mode).not.toBe('entry');
      }
    }
  });
});

describe('isAnswerCorrect', () => {
  const question = (correctAnswer: string): Question => ({
    id: 'q1',
    prompt: 'test',
    correctAnswer,
    choices: [correctAnswer],
    explanation: '',
    answerFormat: 'integer',
    mode: 'entry',
  });

  it('accepts the exact answer', () => {
    expect(isAnswerCorrect(question('42'), '42')).toBe(true);
  });

  it('rejects a wrong answer', () => {
    expect(isAnswerCorrect(question('42'), '24')).toBe(false);
  });

  it('rejects an empty or half-typed answer', () => {
    expect(isAnswerCorrect(question('42'), '')).toBe(false);
    expect(isAnswerCorrect(question('42'), '4.')).toBe(false);
    expect(isAnswerCorrect(question('3/4'), '3/')).toBe(false);
  });

  it('ignores trailing zeros and surrounding space on decimals', () => {
    expect(isAnswerCorrect(question('5.0'), '5')).toBe(true);
    expect(isAnswerCorrect(question('2.50'), '2.5')).toBe(true);
    expect(isAnswerCorrect(question('7'), ' 7 ')).toBe(true);
    expect(isAnswerCorrect(question('2.50'), '2.05')).toBe(false);
  });

  it('accepts an equivalent fraction', () => {
    expect(isAnswerCorrect(question('4/8'), '1/2')).toBe(true);
    expect(isAnswerCorrect(question('3/6'), '2/4')).toBe(true);
    expect(isAnswerCorrect(question('1/2'), '1/3')).toBe(false);
  });

  it('rejects a fraction with a zero denominator', () => {
    expect(isAnswerCorrect(question('1/2'), '1/0')).toBe(false);
  });
});

describe('reshuffleChoices', () => {
  it('keeps the same choices and answer', () => {
    const [q] = generateQuiz(2, 2, 1);
    const shuffled = reshuffleChoices(q);
    expect(shuffled.correctAnswer).toBe(q.correctAnswer);
    expect([...shuffled.choices].sort()).toEqual([...q.choices].sort());
  });
});

describe('adjustTier', () => {
  it('steps down on accuracy below 50%', () => {
    expect(adjustTier(3, 0.4)).toBe(2);
    expect(adjustTier(2, 0.2)).toBe(1);
    expect(adjustTier(1, 0)).toBe(1);
  });

  it('steps up on accuracy of 90% or more', () => {
    expect(adjustTier(1, 0.9)).toBe(2);
    expect(adjustTier(2, 1)).toBe(3);
    expect(adjustTier(3, 1)).toBe(3);
  });

  it('holds steady in between', () => {
    expect(adjustTier(2, 0.7)).toBe(2);
    expect(adjustTier(1, 0.5)).toBe(1);
    expect(adjustTier(3, 0.89)).toBe(3);
  });
});
