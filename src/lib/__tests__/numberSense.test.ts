import { Question, Tier } from '../../types';
import {
  digitPlace,
  evenOrOdd,
  expandedForm,
  greatestOrSmallest,
  numberSenseFor,
  placeParts,
  roundToTen,
  skipCount,
  stepBy,
} from '../numberSense';

const TIERS: Tier[] = [1, 2, 3];

function expectWellFormed(q: Question) {
  expect(q.prompt).not.toMatch(/NaN|undefined|Infinity/);
  expect(q.explanation).not.toMatch(/NaN|undefined|Infinity/);
  expect(q.choices).toHaveLength(4);
  expect(new Set(q.choices).size).toBe(4);
  expect(q.choices).toContain(q.correctAnswer);
  // Everything here is a whole number, so everything here can be typed.
  expect(q.answerFormat).toBe('integer');
  expect(q.correctAnswer).toMatch(/^\d+$/);
}

/** The numbers a "which of these" question lists in its own prompt. */
const listed = (prompt: string): number[] =>
  prompt
    .slice(prompt.indexOf('?') + 1)
    .split(',')
    .map((part) => Number(part.trim()));

describe('digitPlace', () => {
  it('names the digit that really is in that column', () => {
    for (let i = 0; i < 200; i++) {
      const length = i % 2 === 0 ? 2 : 3;
      const q = digitPlace(length);
      expectWellFormed(q);
      const [, place, value] = q.prompt.match(/in the (\w+) place of (\d+)\?/)!;
      const column = { ones: 0, tens: 1, hundreds: 2 }[place]!;
      expect(value).toHaveLength(length);
      expect(Number(q.correctAnswer)).toBe(Math.floor(Number(value) / 10 ** column) % 10);
    }
  });

  it('never repeats a digit, so the answer is the only right one', () => {
    for (let i = 0; i < 200; i++) {
      const value = digitPlace(3).prompt.match(/of (\d+)\?/)![1];
      expect(new Set(value).size).toBe(3);
    }
  });
});

describe('place value put back together', () => {
  it('builds the number the parts describe', () => {
    for (let i = 0; i < 200; i++) {
      const q = placeParts(3);
      expectWellFormed(q);
      const parts = [...q.prompt.matchAll(/(\d) (ones?|tens?|hundreds?)/g)];
      expect(parts).toHaveLength(3);
      const value = parts.reduce(
        (sum, [, digit, place]) =>
          sum + Number(digit) * { one: 1, ten: 10, hundred: 100 }[place.replace(/s$/, '')]!,
        0,
      );
      expect(Number(q.correctAnswer)).toBe(value);
      // "1 hundreds" reads as a typo to a child who is learning the words.
      for (const [, digit, place] of parts) {
        expect(place.endsWith('s')).toBe(digit !== '1');
      }
    }
  });

  it('adds an expanded form up to itself', () => {
    for (let i = 0; i < 200; i++) {
      const q = expandedForm();
      expectWellFormed(q);
      const parts = q.prompt.replace(' = ?', '').split(' + ').map(Number);
      expect(Number(q.correctAnswer)).toBe(parts.reduce((a, b) => a + b, 0));
    }
  });
});

describe('stepping by tens and hundreds', () => {
  it('steps the way the question asks', () => {
    for (const step of [10, 100]) {
      for (let i = 0; i < 100; i++) {
        const q = stepBy(step, step === 10 ? 490 : 899);
        expectWellFormed(q);
        const [, size, direction, value] = q.prompt.match(/What is (\d+) (more|less) than (\d+)\?/)!;
        expect(Number(size)).toBe(step);
        const expected = direction === 'more' ? Number(value) + step : Number(value) - step;
        expect(Number(q.correctAnswer)).toBe(expected);
        expect(expected).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('skip counting', () => {
  it('fills the gap in a sequence that really does count in steps', () => {
    for (let i = 0; i < 300; i++) {
      const q = skipCount([2, 3, 4, 5, 10, 25], 200);
      expectWellFormed(q);
      const terms = q.prompt
        .replace('Fill the gap: ', '')
        .split(', ')
        .map((t) => (t === '?' ? null : Number(t)));

      const filled = terms.map((t) => (t === null ? Number(q.correctAnswer) : t));
      const step = filled[1] - filled[0];
      expect(step).not.toBe(0);
      for (let k = 1; k < filled.length; k++) expect(filled[k] - filled[k - 1]).toBe(step);
      expect(Math.min(...filled)).toBeGreaterThanOrEqual(0);
      // The gap is never the first number, which would have nothing to count from.
      expect(terms[0]).not.toBeNull();
    }
  });
});

describe('odd and even', () => {
  it('offers exactly one number of the parity it asks for', () => {
    for (let i = 0; i < 300; i++) {
      const q = evenOrOdd(99);
      expectWellFormed(q);
      const wantEven = q.prompt.includes('even');
      const numbers = q.choices.map(Number);
      expect(numbers.filter((n) => (n % 2 === 0) === wantEven)).toEqual([Number(q.correctAnswer)]);
      // The four numbers on the buttons are the four the prompt lists.
      expect(listed(q.prompt).sort()).toEqual(numbers.sort());
    }
  });
});

describe('comparing numbers made of the same digits', () => {
  it('answers with the greatest or smallest of the four', () => {
    for (let i = 0; i < 300; i++) {
      const q = greatestOrSmallest();
      expectWellFormed(q);
      const numbers = listed(q.prompt);
      expect(numbers).toHaveLength(4);
      expect(new Set(numbers).size).toBe(4);
      const wanted = q.prompt.includes('greatest') ? Math.max(...numbers) : Math.min(...numbers);
      expect(Number(q.correctAnswer)).toBe(wanted);
      expect(q.choices.map(Number).sort()).toEqual([...numbers].sort());
    }
  });
});

describe('rounding to the nearest ten', () => {
  it('rounds correctly and never sits on the halfway mark', () => {
    for (let i = 0; i < 300; i++) {
      const q = roundToTen(199);
      expectWellFormed(q);
      const value = Number(q.prompt.match(/What is (\d+) rounded/)![1]);
      expect(value % 10).not.toBe(5);
      expect(value % 10).not.toBe(0);
      expect(Number(q.correctAnswer)).toBe(Math.round(value / 10) * 10);
    }
  });
});

describe('the number sense pool', () => {
  it('is offered to grade 2 only, at every tier', () => {
    for (const tier of TIERS) {
      expect(numberSenseFor(2, tier).length).toBeGreaterThan(0);
      for (const grade of [1, 3, 4, 5] as const) {
        expect(numberSenseFor(grade, tier)).toHaveLength(0);
      }
    }
  });

  it('grows as the tier goes up', () => {
    expect(numberSenseFor(2, 2).length).toBeGreaterThan(numberSenseFor(2, 1).length);
    expect(numberSenseFor(2, 3).length).toBeGreaterThan(numberSenseFor(2, 2).length);
  });

  it('keeps tier 1 on two-digit numbers', () => {
    for (const gen of numberSenseFor(2, 1)) {
      for (let i = 0; i < 50; i++) {
        expect(Number(gen().correctAnswer)).toBeLessThanOrEqual(100);
      }
    }
  });

  it('builds every question in the pool soundly', () => {
    for (const tier of TIERS) {
      for (const gen of numberSenseFor(2, tier)) {
        for (let i = 0; i < 40; i++) expectWellFormed(gen());
      }
    }
  });
});
