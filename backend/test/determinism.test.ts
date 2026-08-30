/**
 * Baking twice must produce byte-identical packs.
 *
 * This is what makes a pack version mean something. Versions are derived
 * from the content hash, and the client re-downloads whenever the version
 * moves — so if the bake were nondeterministic, every run would look like
 * fresh content and every device would pull 16 packs again for nothing.
 *
 * It is also the regression test for `Math.random()` creeping back into a
 * generator, which is easy to do and silent until it reaches a phone.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { logicPools, mathPools } from '../src/bake/pools';
import { random, seed } from '../src/generators/rng';

describe('the bake is deterministic', () => {
  it('produces identical maths pools on a second run', () => {
    const first = JSON.stringify(mathPools(3));
    // Deliberately disturb the stream; each pool re-seeds from its own label.
    seed('something-else');
    const second = JSON.stringify(mathPools(3));
    expect(second).toBe(first);
  });

  it('produces identical logic pools on a second run', () => {
    const first = JSON.stringify(logicPools(4));
    seed('something-else');
    const second = JSON.stringify(logicPools(4));
    expect(second).toBe(first);
  });

  /**
   * Rotating BAKE_SEED is the intended way to refresh every pool without
   * touching a generator. It works because each pool seeds from a label the
   * bake seed is folded into, so the property to check is the stream itself:
   * same label, same questions; different label, different questions.
   */
  it('rotates the stream when the label changes', () => {
    const draw = (label: string) => {
      seed(label);
      return Array.from({ length: 16 }, () => random());
    };
    expect(draw('boring-quest-v1/math.g2:addSub:1')).toEqual(
      draw('boring-quest-v1/math.g2:addSub:1'),
    );
    expect(draw('rotated/math.g2:addSub:1')).not.toEqual(
      draw('boring-quest-v1/math.g2:addSub:1'),
    );
  });
});

describe('no generator reaches for unseeded randomness', () => {
  // `src/factories` is in here because the generators moved out from under
  // this scan once already. It also covers the app's copy transitively: the
  // drift gate proves that copy is byte-equal to what is scanned here.
  const roots = ['src/generators', 'src/factories', 'src/content'];

  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
    );

  it('never calls Math.random outside a comment', () => {
    const offenders = roots
      .flatMap(walk)
      .filter((f) => f.endsWith('.ts'))
      .flatMap((f) =>
        readFileSync(f, 'utf8')
          .split('\n')
          .map((line, i) => ({ f, i: i + 1, line }))
          .filter(({ line }) => /Math\.random\s*\(/.test(line) && !line.trim().startsWith('*'))
          .map(({ f, i }) => `${f}:${i}`),
      );
    expect(offenders).toEqual([]);
  });
});
