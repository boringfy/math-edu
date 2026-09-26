/**
 * Which celebration a correct answer earns.
 *
 * The thing worth pinning is the shape of the deal: faster is better, the
 * yardstick differs by question, two tiers pick from a pair, and a slow
 * answer gets nothing — because "nothing" has to stay ambiguous between slow
 * and wrong.
 */

import { CelebrationKind, celebrationFor, expectedMs } from '../celebrate';
import { Question } from '../../types';

const q = (over: Partial<Question> = {}): Question => ({
  id: 'q1',
  prompt: '7 × 8 = ?',
  correctAnswer: '56',
  choices: ['56', '54', '48', '64'],
  explanation: '7 × 8 = 56',
  answerFormat: 'integer',
  mode: 'choice',
  ...over,
});

/** Always takes the first of a pair, so a tier's identity is testable. */
const first = () => 0;
const last = () => 0.999;

describe('the yardstick', () => {
  it('uses a speed question’s own limit', () => {
    expect(expectedMs(q({ limitSeconds: 3 }), false)).toBe(3000);
  });

  it('allows longer for the shapes that take longer', () => {
    const tap = expectedMs(q(), false);
    expect(expectedMs(q({ mode: 'entry' }), false)).toBeGreaterThan(tap);
    expect(expectedMs(q(), true)).toBeGreaterThan(tap);
    expect(expectedMs(q({ mode: 'draw' }), false)).toBeGreaterThan(expectedMs(q(), true));
  });
});

describe('faster earns more', () => {
  const at = (ms: number, pick = first) => celebrationFor(ms, q(), false, pick);

  it('gives the top tier for an instant answer', () => {
    // 12s expected, so under 3s is the top band.
    expect(at(2000)).toBe('fireworks');
    expect(at(2000, last)).toBe('rocket');
  });

  it('gives the middle tier for a quick one', () => {
    expect(at(5000)).toBe('confetti');
    expect(at(5000, last)).toBe('stars');
  });

  it('gives the quietest for merely brisk', () => {
    expect(at(9000)).toBe('sparkle');
    // The quiet tier has no pair, so the pick cannot change it.
    expect(at(9000, last)).toBe('sparkle');
  });

  it('gives nothing for a slow answer', () => {
    expect(at(11_000)).toBeNull();
    expect(at(60_000)).toBeNull();
  });

  it('never skips a tier as the clock runs', () => {
    const order: (CelebrationKind | null)[] = [];
    for (let ms = 0; ms <= 14_000; ms += 250) order.push(at(ms));
    // Grouped into runs, the sequence must be top, middle, quiet, nothing.
    const runs = order.filter((k, i) => i === 0 || k !== order[i - 1]);
    expect(runs).toEqual(['fireworks', 'confetti', 'sparkle', null]);
  });
});

describe('it scales with the question', () => {
  it('judges a 3-second speed question on its own terms', () => {
    const speed = q({ limitSeconds: 3 });
    // 1s of a 3s budget is a third — the middle tier, not the top.
    expect(celebrationFor(1000, speed, false, first)).toBe('confetti');
    // The same 1s against a 12s question is instant.
    expect(celebrationFor(1000, q(), false, first)).toBe('fireworks');
  });

  it('gives a reading answer the room the passage needs', () => {
    // 8s is slow for a bare sum and quick when a story had to be re-read.
    expect(celebrationFor(8000, q(), false, first)).toBe('sparkle');
    expect(celebrationFor(8000, q(), true, first)).toBe('confetti');
  });
});

describe('it cannot be gamed by a bad clock', () => {
  it('gives nothing for a negative or unreal elapsed time', () => {
    expect(celebrationFor(-1, q(), false)).toBeNull();
    expect(celebrationFor(NaN, q(), false)).toBeNull();
    expect(celebrationFor(Infinity, q(), false)).toBeNull();
  });

  it('handles a pick at the very edge of its range', () => {
    // Math.random can return values arbitrarily close to 1; the index must
    // still land inside the pair.
    expect(celebrationFor(1000, q(), false, () => 0.9999999)).toBe('rocket');
  });
});
