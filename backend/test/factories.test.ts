/**
 * The catalog's invariants.
 *
 * A factory is reached differently from a baked question. A baked question
 * was checked once, here, before it was ever served; a factory is run on a
 * child's phone, at a difficulty nobody tried in advance, from a recipe a
 * language model helped write. So the thing to establish is not "this
 * question is fine" but "this factory is fine at every difficulty anyone can
 * ask it for" — including the ones past where its ramp stops, because clamping
 * is what stops an over-eager composer becoming a blank screen.
 */

import { describe, expect, it } from 'vitest';

import {
  BY_SKILL,
  CATALOG,
  FACTORIES,
  ceilingOf,
  skillsWithHeadroom,
  slotsFor,
} from '../src/factories/catalog';
import { Skill, atD } from '../src/factories/ramp';
import { VECTORS } from '../src/factories/vectors';
import { KNOWN_ANSWER_MODES, Question, TOPIC_KEYS } from '../src/contract';
import { makeRng } from '../src/generators/rng';

const wellFormed = (q: Question): string[] => {
  const faults: string[] = [];
  if (!q.id) faults.push('no id');
  if (!q.prompt.trim()) faults.push('empty prompt');
  if (!q.explanation.trim()) faults.push('empty explanation');
  if (typeof q.correctAnswer !== 'string' || q.correctAnswer === '') faults.push('no answer');
  if (!KNOWN_ANSWER_MODES.includes(q.mode)) faults.push(`bad mode ${q.mode}`);
  if (q.mode !== 'draw') {
    if (q.choices.length !== 4) faults.push(`${q.choices.length} choices`);
    if (new Set(q.choices).size !== q.choices.length) faults.push('duplicate choices');
    if (!q.choices.includes(q.correctAnswer)) faults.push('answer not among choices');
  }
  return faults;
};

describe('the catalog is well formed', () => {
  it('every id is unique', () => {
    const ids = FACTORIES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /** Ids end up in recipes and in progress keys, so they have to be greppable. */
  it('every id is a plain identifier', () => {
    const odd = FACTORIES.filter((f) => !/^[a-z][A-Za-z0-9]*$/.test(f.id));
    expect(odd.map((f) => f.id)).toEqual([]);
  });

  /**
   * `factory()` throws on a ramp that does not ascend, so importing the
   * catalog at all is most of this check. What is left is that `dRange`
   * really is the ends of the table rather than something hand-written that
   * has since drifted away from it.
   */
  it('dRange is exactly the ends of the ramp', () => {
    for (const f of FACTORIES) {
      expect(f.dRange, f.id).toEqual([f.ramp[0].d, f.ramp[f.ramp.length - 1].d]);
      expect(f.dRange[0], f.id).toBeLessThan(f.dRange[1]);
    }
  });

  it('every row of a ramp is reachable', () => {
    for (const f of FACTORIES) {
      for (const row of f.ramp) {
        expect(atD(f.ramp, row.d), `${f.id} @ d=${row.d}`).toBe(row);
      }
    }
  });

  it('gradeHint is a real range', () => {
    const odd = FACTORIES.filter(
      (f) => f.gradeHint[0] > f.gradeHint[1] || f.gradeHint[0] < 1 || f.gradeHint[1] > 5,
    );
    expect(odd.map((f) => f.id)).toEqual([]);
  });
});

describe('every factory holds up across its whole range', () => {
  for (const f of FACTORIES) {
    // Past the ends too: clamping is the property being checked, and a
    // composer that overshoots must get a question rather than a crash.
    const from = f.dRange[0] - 2;
    const to = f.dRange[1] + 5;

    it(`${f.id} builds sound questions for d ${from}..${to}`, () => {
      const faults: string[] = [];
      for (let d = from; d <= to; d++) {
        for (let s = 0; s < 12; s++) {
          const q = f.generate(d, makeRng(`test/${f.id}:${d}#${s}`));
          for (const fault of wellFormed(q)) faults.push(`d=${d} seed=${s}: ${fault}`);
        }
      }
      expect(faults.slice(0, 5)).toEqual([]);
    });
  }
});

describe('a factory is reproducible', () => {
  it('same id, same d, same seed, same question', () => {
    for (const f of FACTORIES) {
      const once = f.generate(f.dRange[0], makeRng(`repeat/${f.id}`));
      const twice = f.generate(f.dRange[0], makeRng(`repeat/${f.id}`));
      expect(twice, f.id).toEqual(once);
    }
  });

  it('a different seed asks something different', () => {
    // Not every factory can differ on every seed — there are only so many
    // distinct "how many sides has a square" questions — so this asks that
    // the catalog as a whole varies, not that each one always does.
    const varied = FACTORIES.filter((f) => {
      const a = f.generate(f.dRange[1], makeRng(`vary-a/${f.id}`));
      const b = f.generate(f.dRange[1], makeRng(`vary-b/${f.id}`));
      return a.prompt !== b.prompt || a.correctAnswer !== b.correctAnswer;
    });
    expect(varied.length).toBeGreaterThan(FACTORIES.length * 0.9);
  });
});

describe('the recorded vectors still hold', () => {
  /**
   * The same rows the app checks, so a divergence between the two engines
   * shows up as one side failing rather than as neither noticing.
   */
  it.each(VECTORS)('$factory at d$d', ({ factory, d, seed, prompt, answer }) => {
    const q = CATALOG[factory].generate(d, makeRng(seed));
    expect(q.prompt).toBe(prompt);
    expect(q.correctAnswer).toBe(answer);
  });

  it('names only factories that still exist', () => {
    expect(VECTORS.filter((v) => !CATALOG[v.factory]).map((v) => v.factory)).toEqual([]);
  });
});

describe('the ladder has no holes', () => {
  /**
   * The coverage map. d 1..15 is the old curriculum restated on the new
   * scale, so a topic the grid taught must still be teachable at the same
   * place — otherwise a child crossing from the authored lessons into the
   * generated ones falls into a gap.
   */
  it('every topic that has factories covers a contiguous span', () => {
    const holes: string[] = [];
    for (const skill of Object.keys(BY_SKILL) as Skill[]) {
      const covered = new Set<number>();
      for (const f of BY_SKILL[skill]) {
        for (let d = f.dRange[0]; d <= f.dRange[1]; d++) covered.add(d);
      }
      const sorted = [...covered].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] !== sorted[i - 1] + 1) {
          holes.push(`${skill}: nothing at d ${sorted[i - 1] + 1}..${sorted[i] - 1}`);
        }
      }
    }
    expect(holes).toEqual([]);
  });

  it('every topic key the contract knows has at least one factory', () => {
    const missing = TOPIC_KEYS.filter((k) => (BY_SKILL[k] ?? []).length === 0);
    expect(missing).toEqual([]);
  });

  /**
   * Somewhere has to stay open, or a strong child eventually runs out of
   * everything at once and the game has nothing left to offer.
   */
  it('something still has headroom well past the old curriculum', () => {
    expect(skillsWithHeadroom(15).length).toBeGreaterThan(0);
    expect(skillsWithHeadroom(17).length).toBeGreaterThan(0);
  });
});

describe('slotsFor', () => {
  it('gives back exactly the number of slots asked for', () => {
    for (const skill of Object.keys(BY_SKILL) as Skill[]) {
      for (const d of [1, 5, 9, 13, 15, 40]) {
        expect(slotsFor(skill, d, 7).slots.length, `${skill} d=${d}`).toBe(7);
      }
    }
  });

  it('never hands back a slot outside its factory dRange', () => {
    const bad: string[] = [];
    for (const skill of Object.keys(BY_SKILL) as Skill[]) {
      for (let d = 1; d <= 40; d++) {
        for (const slot of slotsFor(skill, d, 4).slots) {
          const f = CATALOG[slot.factory];
          if (slot.d < f.dRange[0] || slot.d > f.dRange[1]) {
            bad.push(`${skill} d=${d} -> ${slot.factory}@${slot.d}`);
          }
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it('reports capped exactly when d is past the skill', () => {
    for (const skill of Object.keys(BY_SKILL) as Skill[]) {
      const top = ceilingOf(skill);
      expect(slotsFor(skill, top, 3).capped, `${skill} at ceiling`).toBe(false);
      expect(slotsFor(skill, top + 1, 3).capped, `${skill} past ceiling`).toBe(true);
    }
  });

  it('still builds real questions from a capped skill', () => {
    for (const skill of Object.keys(BY_SKILL) as Skill[]) {
      const { slots } = slotsFor(skill, ceilingOf(skill) + 9, 3);
      for (const slot of slots) {
        const q = CATALOG[slot.factory].generate(slot.d, makeRng(`capped/${slot.factory}`));
        expect(wellFormed(q), `${skill} -> ${slot.factory}`).toEqual([]);
      }
    }
  });

  it('an unknown skill asks for nothing rather than throwing', () => {
    expect(slotsFor('nonsense' as Skill, 5, 4)).toEqual({ slots: [], capped: true });
  });
});
