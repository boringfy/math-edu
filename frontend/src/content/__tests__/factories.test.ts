/**
 * The app builds its own questions again.
 *
 * For the authored 60 lessons it still just draws from a baked pool, but
 * everything past them is generated on the device from a level recipe: a
 * factory id, a difficulty and a seed. So the app has to agree with the
 * backend about what those three mean, right down to the digits — a child who
 * types the right answer and is marked wrong would have no way to tell anyone
 * what went wrong.
 *
 * The catalog itself is exercised properly in `backend/test/factories.test.ts`
 * against the same files. What is worth checking on this side is that the
 * copy is intact, reachable through the app's module resolution, and produces
 * the same questions the backend recorded.
 */

import { CATALOG, FACTORIES, slotsFor } from '../factories/catalog';
import { VECTORS } from '../factories/vectors';
import { makeRng } from '../generators/rng';

describe('the shared catalog arrived intact', () => {
  it('has factories, keyed by id', () => {
    expect(FACTORIES.length).toBeGreaterThan(50);
    for (const f of FACTORIES) expect(CATALOG[f.id]).toBe(f);
  });

  it('covers the skills a generated lesson can ask for', () => {
    for (const skill of ['addSub', 'mulDiv', 'word', 'geometry', 'place'] as const) {
      expect(slotsFor(skill, 6, 4).slots).toHaveLength(4);
    }
  });
});

describe('this engine agrees with the one that baked the packs', () => {
  it.each(VECTORS)('$factory at d$d', ({ factory, d, seed, prompt, answer }) => {
    const question = CATALOG[factory].generate(d, makeRng(seed));
    expect(question.prompt).toBe(prompt);
    expect(question.correctAnswer).toBe(answer);
  });

  it('builds the same question twice from the same seed', () => {
    for (const f of FACTORIES) {
      const once = f.generate(f.dRange[0], makeRng(`app-repeat/${f.id}`));
      const twice = f.generate(f.dRange[0], makeRng(`app-repeat/${f.id}`));
      expect(twice).toEqual(once);
    }
  });
});
