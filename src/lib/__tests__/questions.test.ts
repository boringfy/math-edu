import { Grade, Question, Tier } from '../../types';
import { adjustTier, ENTRY_SHARE, generateQuiz, isAnswerCorrect, reshuffleChoices } from '../questions';
import { wordProblemsFor } from '../wordProblems';

const GRADES: Grade[] = [1, 2, 3, 4, 5];
const TIERS: Tier[] = [1, 2, 3];
const GRADE_TIERS = GRADES.flatMap((g) => TIERS.map((t) => [g, t] as const));

/** Evaluates plain arithmetic prompts like "12 + 3 × 4 = ?". */
function evaluatePrompt(prompt: string): number {
  const expression = prompt
    .replace(' = ?', '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/');
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

describe('generateQuiz', () => {
  it.each(GRADE_TIERS)('grade %i tier %i produces valid questions', (grade, tier) => {
    const questions = generateQuiz(grade, tier, 40);
    expect(questions).toHaveLength(40);

    for (const q of questions) {
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices).toContain(q.correctAnswer);
      expect(q.explanation.length).toBeGreaterThan(0);

      // Numeric prompts must actually evaluate to the stated answer.
      // Story prompts and fraction questions are covered by the structural
      // checks above.
      const isPlainArithmetic =
        /^[\d\s+\-×÷().]+ = \?$/.test(q.prompt) && !q.correctAnswer.includes('/');
      if (isPlainArithmetic) {
        expect(evaluatePrompt(q.prompt)).toBeCloseTo(Number(q.correctAnswer), 6);
      }
    }
  });

  it('gives every question a unique id', () => {
    const questions = generateQuiz(3, 2, 30);
    expect(new Set(questions.map((q) => q.id)).size).toBe(30);
  });

  it('grade 1 tier 1 stays within 10', () => {
    for (const q of generateQuiz(1, 1, 50)) {
      expect(Number(q.correctAnswer)).toBeLessThanOrEqual(10);
      expect(Number(q.correctAnswer)).toBeGreaterThanOrEqual(0);
    }
  });

  it('mixes in story problems', () => {
    for (const [grade, tier] of GRADE_TIERS) {
      const questions = generateQuiz(grade, tier, 20);
      // Story problems are full sentences; arithmetic prompts are a handful
      // of tokens ("Which fraction is the largest?" is the longest of those).
      const stories = questions.filter((q) => q.prompt.split(' ').length > 8);
      expect(stories.length).toBeGreaterThan(0);
    }
  });
});

describe('typed-entry mode', () => {
  it.each(GRADE_TIERS)('grade %i tier %i only types answers that can be typed', (grade, tier) => {
    for (const q of generateQuiz(grade, tier, 40)) {
      if (q.mode === 'entry') expect(q.answerFormat).not.toBeNull();
      // The format has to match what the number pad can actually produce.
      if (q.answerFormat === 'fraction') expect(q.correctAnswer).toContain('/');
      if (q.answerFormat === 'integer') expect(q.correctAnswer).toMatch(/^\d+$/);
      if (q.answerFormat === 'decimal') expect(q.correctAnswer).toMatch(/^\d+\.\d+$/);
    }
  });

  it('asks more questions by typing as the tier goes up', () => {
    const entryCount = (tier: Tier) =>
      // Grade 3 has no choice-only questions, so every question is typeable
      // and the share is exact.
      generateQuiz(3, tier, 20).filter((q) => q.mode === 'entry').length;

    expect(entryCount(1)).toBe(Math.round(20 * ENTRY_SHARE[1]));
    expect(entryCount(2)).toBe(Math.round(20 * ENTRY_SHARE[2]));
    expect(entryCount(3)).toBe(Math.round(20 * ENTRY_SHARE[3]));
  });

  it('never types a question that needs its choices visible', () => {
    // "Which fraction is the largest?" only appears in grade 5.
    for (const tier of TIERS) {
      for (const q of generateQuiz(5, tier, 60)) {
        if (q.answerFormat === null) expect(q.mode).toBe('choice');
      }
    }
  });
});

describe('word problems', () => {
  it.each(GRADE_TIERS)('grade %i tier %i story problems are well formed', (grade, tier) => {
    const gens = wordProblemsFor(grade, tier);
    expect(gens.length).toBeGreaterThan(0);

    for (const gen of gens) {
      for (let i = 0; i < 25; i++) {
        const q = gen();
        expect(q.prompt).toMatch(/\?$/);
        expect(q.prompt).not.toMatch(/NaN|undefined|Infinity/);
        expect(q.choices).toHaveLength(4);
        expect(q.choices).toContain(q.correctAnswer);
        expect(q.explanation).not.toMatch(/NaN|undefined/);
        // Story answers are real quantities: finite and never negative.
        expect(Number.isFinite(valueOf(q.correctAnswer))).toBe(true);
        expect(valueOf(q.correctAnswer)).toBeGreaterThan(0);
        // Typeable, so they can be asked on the number pad.
        expect(q.answerFormat).not.toBeNull();
      }
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
