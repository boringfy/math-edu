/**
 * Nothing in a question a child reads may be a JavaScript accident.
 *
 * This exists because of a real one. `PLACES` had three names in it while
 * `digitPlace` and `placeParts` were both ramped to five-digit numbers, so
 * every place-value question at that depth read
 *
 *     What number is 9 undefined, 4 hundreds, 7 tens and 3 ones?
 *
 * An out-of-range index rendered straight into the prompt. Every existing
 * test passed: the question had four choices, one correct answer, an
 * explanation and a valid shape. It was well formed and unreadable.
 *
 * So the check here is on the *text* rather than the structure, and it runs
 * over the whole catalog rather than the one factory that happened to break —
 * a template hole is a mistake any generator can make, and the ones with a
 * lookup table in them can all make exactly this one.
 */

import { describe, expect, it } from 'vitest';

import { CATALOG, FACTORIES } from '../src/factories/catalog';
import { makeRng } from '../src/generators/rng';

/** What a template hole looks like once it has been interpolated. */
const ACCIDENTS = ['undefined', 'null', 'NaN', 'Infinity', '[object Object]', '{}'];

/** Every string a child could read on a question. */
const textOf = (q: {
  prompt: string;
  correctAnswer: string;
  choices: string[];
  explanation: string;
}): string => [q.prompt, q.correctAnswer, ...q.choices, q.explanation].join(' | ');

describe('no question ever shows a template hole', () => {
  it('holds across every factory, at every difficulty it offers', () => {
    const broken: string[] = [];

    for (const f of FACTORIES) {
      for (let d = f.dRange[0]; d <= f.dRange[1]; d++) {
        // A few seeds per step: a hole often needs a particular branch, and
        // one draw per difficulty would walk straight past it.
        for (let seed = 0; seed < 6; seed++) {
          const text = textOf(f.generate(d, makeRng(`${f.id}:${d}:${seed}`)));
          for (const accident of ACCIDENTS) {
            if (text.includes(accident)) {
              broken.push(`${f.id} at d${d}: ${text.slice(0, 90)}`);
            }
          }
        }
      }
    }

    expect(broken).toEqual([]);
  });

  /**
   * The other shape the same mistake takes: an interpolation that produced an
   * empty string rather than the word "undefined", which leaves a gap instead
   * of a giveaway.
   *
   * Deliberately not a doubled-space check. Several generators space their
   * output on purpose — a number sequence reads "9,  12,  15,  18,  ?" — and
   * a rule that flagged seventy-seven correct questions would be muted the
   * first time somebody hit it, which is worse than not having it.
   */
  it('never leaves a field empty', () => {
    const broken: string[] = [];
    for (const f of FACTORIES) {
      for (let d = f.dRange[0]; d <= f.dRange[1]; d++) {
        const q = f.generate(d, makeRng(`gap:${f.id}:${d}`));
        if (q.prompt.trim() === '') broken.push(`${f.id} at d${d}: empty prompt`);
        if (q.correctAnswer.trim() === '') broken.push(`${f.id} at d${d}: empty answer`);
        if (q.explanation.trim() === '') broken.push(`${f.id} at d${d}: empty explanation`);
        if (q.choices.some((c) => c.trim() === '')) {
          broken.push(`${f.id} at d${d}: a blank choice`);
        }
      }
    }
    expect(broken).toEqual([]);
  });
});

describe('place value names, at every depth its ramp reaches', () => {
  /** The bug, named directly, so a regression says what it is. */
  it('names the thousands and ten thousands columns', () => {
    const parts = CATALOG['placeParts'];
    const seen = new Set<string>();
    for (let d = parts.dRange[0]; d <= parts.dRange[1]; d++) {
      for (let seed = 0; seed < 8; seed++) {
        seen.add(parts.generate(d, makeRng(`p:${d}:${seed}`)).prompt);
      }
    }
    const all = [...seen].join('\n');
    expect(all).not.toContain('undefined');
    // The deep ramps are the ones that used to break, so check they are
    // actually being reached rather than trivially passing.
    expect(all).toContain('thousands');
  });

  it('asks for a named place, never an unnamed one', () => {
    const digit = CATALOG['digitPlace'];
    const broken: string[] = [];
    for (let d = digit.dRange[0]; d <= digit.dRange[1]; d++) {
      for (let seed = 0; seed < 8; seed++) {
        const prompt = digit.generate(d, makeRng(`dp:${d}:${seed}`)).prompt;
        if (!/in the [a-z ]+ place of/.test(prompt)) broken.push(`d${d}: ${prompt}`);
      }
    }
    expect(broken).toEqual([]);
  });
});

/**
 * A question must have exactly one right answer.
 *
 * The `undefined` bug was a template hole; this is its sibling — a question
 * that is structurally perfect and semantically ambiguous. Both are invisible
 * to a test that only counts choices and checks the answer is among them.
 *
 * Two real ones were found this way. `averageOfSet` planted a repeated value
 * for the mode but let the *other* values collide with each other, so a
 * second number could tie and a child answering correctly would be marked
 * wrong. And `chartDifference` could deal every bar the same height, asking
 * how many more the best day had than the worst when the answer was nought.
 */
describe('exactly one answer is right', () => {
  it('gives the mode question a single winner', () => {
    const avg = CATALOG['averageOfSet'];
    const bad: string[] = [];

    for (let d = avg.dRange[0]; d <= avg.dRange[1]; d++) {
      for (let seed = 0; seed < 60; seed++) {
        const q = avg.generate(d, makeRng(`mode:${d}:${seed}`));
        if (!/appears most often/.test(q.prompt)) continue;

        const values = (q.prompt.match(/\n([\d, ]+)\n/)?.[1] ?? '')
          .split(',')
          .map((n) => Number(n.trim()));
        const counts = new Map<number, number>();
        for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);

        const top = Math.max(...counts.values());
        const winners = [...counts].filter(([, c]) => c === top).map(([v]) => v);

        if (winners.length !== 1) bad.push(`d${d}: [${values}] ties between ${winners}`);
        else if (String(winners[0]) !== q.correctAnswer) {
          bad.push(`d${d}: [${values}] mode is ${winners[0]}, answer says ${q.correctAnswer}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('never asks for a difference that is nought', () => {
    const chart = CATALOG['chartDifference'];
    const bad: string[] = [];
    for (let d = chart.dRange[0]; d <= chart.dRange[1]; d++) {
      for (let seed = 0; seed < 40; seed++) {
        const q = chart.generate(d, makeRng(`gap:${d}:${seed}`));
        if (Number(q.correctAnswer) === 0) bad.push(`d${d}: ${q.prompt.replace(/\n/g, " ")}`);
      }
    }
    expect(bad).toEqual([]);
  });

  /**
   * The general form, over the whole catalog: no distractor may equal the
   * right answer once both are read as numbers. "6" and "6.0" are the same
   * answer offered twice, and a child picking either is right.
   */
  it('offers no distractor that is also correct', () => {
    const bad: string[] = [];
    for (const f of FACTORIES) {
      for (let d = f.dRange[0]; d <= f.dRange[1]; d++) {
        for (let seed = 0; seed < 6; seed++) {
          const q = f.generate(d, makeRng(`dup:${f.id}:${d}:${seed}`));
          const answer = Number(q.correctAnswer);
          if (!Number.isFinite(answer)) continue;
          for (const choice of q.choices) {
            if (choice === q.correctAnswer) continue;
            if (Number.isFinite(Number(choice)) && Number(choice) === answer) {
              bad.push(`${f.id}@d${d}: "${choice}" equals the answer "${q.correctAnswer}"`);
            }
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

/**
 * A question that asks for the biggest or the smallest must have exactly one.
 *
 * The third instance of the same class, and the one a child would notice
 * first. `chartReadOff` dealt every value independently, so about one table
 * in six tied at the top — "Ella 8, Sam 9, Ravi 9, Mia 4" with the answer
 * given as Sam. A child who read it correctly and picked Ravi was told they
 * were wrong.
 */
describe('superlative questions have a single answer', () => {
  /** Values presented as "Name 7, Name 3" in the prompt. */
  const labelled = (prompt: string): { label: string; value: number }[] =>
    [...prompt.matchAll(/([A-Za-z]+) (\d+)/g)].map((m) => ({ label: m[1], value: Number(m[2]) }));

  it('gives the chart a winner nobody matches', () => {
    const chart = CATALOG['chartReadOff'];
    const bad: string[] = [];

    for (let d = chart.dRange[0]; d <= chart.dRange[1]; d++) {
      for (let seed = 0; seed < 80; seed++) {
        const q = chart.generate(d, makeRng(`most:${d}:${seed}`));
        const rows = labelled(q.prompt);
        if (rows.length < 2) continue;

        const most = Math.max(...rows.map((r) => r.value));
        const winners = rows.filter((r) => r.value === most);

        if (winners.length > 1) {
          bad.push(`d${d}: ${rows.map((r) => `${r.label} ${r.value}`).join(', ')} — tied on ${most}`);
        } else if (winners[0].label !== q.correctAnswer) {
          bad.push(`d${d}: winner is ${winners[0].label}, answer says ${q.correctAnswer}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  /**
   * The general net. Any prompt that asks for an extreme and lists its values
   * as "Label N" pairs must not tie on the value being asked for — so a new
   * factory phrased this way is covered without anyone remembering to add it.
   */
  it('holds for every factory that asks for one', () => {
    const asksMost = /\b(most|greatest|largest|biggest|highest|heaviest|longest)\b/i;
    const asksLeast = /\b(least|fewest|smallest|lowest|lightest|shortest)\b/i;
    const bad: string[] = [];

    for (const f of FACTORIES) {
      for (let d = f.dRange[0]; d <= f.dRange[1]; d++) {
        for (let seed = 0; seed < 5; seed++) {
          const q = f.generate(d, makeRng(`sup:${f.id}:${d}:${seed}`));
          const rows = labelled(q.prompt);
          // Only the shape this net can read: named rows with a number each.
          if (rows.length < 2) continue;

          const wantsMost = asksMost.test(q.prompt);
          const wantsLeast = asksLeast.test(q.prompt);
          if (!wantsMost && !wantsLeast) continue;

          const target = wantsMost
            ? Math.max(...rows.map((r) => r.value))
            : Math.min(...rows.map((r) => r.value));
          if (rows.filter((r) => r.value === target).length > 1) {
            bad.push(`${f.id}@d${d}: ties on ${target} — "${q.prompt.replace(/\n/g, " ").slice(0, 70)}"`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
