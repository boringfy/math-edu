/**
 * Does this engine build the questions the backend thinks it does?
 *
 * The app generates its own questions for the endless levels, from the same
 * seeded stream the bake used. That only works if Hermes and Node agree about
 * every draw — and nothing in either test suite can prove they do, because
 * vitest and jest-expo both run on V8. This is the only check that ever runs
 * on the engine that actually matters.
 *
 * It is cheap (a handful of questions, no I/O) and it runs in development
 * only. A divergence would otherwise surface as a child being marked wrong
 * for the right answer, which is both the worst outcome and the one nobody
 * would think to report as a bug.
 */

import { CATALOG } from './factories/catalog';
import { VECTORS } from './factories/vectors';
import { makeRng } from './generators/rng';

/** Replays a few recorded questions. Returns what disagreed, if anything. */
export function checkEngineAgreement(sample = 5): string[] {
  const faults: string[] = [];
  for (const vector of VECTORS.slice(0, sample)) {
    const built = CATALOG[vector.factory];
    if (!built) {
      faults.push(`${vector.factory}: no such factory`);
      continue;
    }
    const question = built.generate(vector.d, makeRng(vector.seed));
    if (question.prompt !== vector.prompt || question.correctAnswer !== vector.answer) {
      faults.push(
        `${vector.factory}@d${vector.d}: got "${question.prompt}" = ${question.correctAnswer}, ` +
          `expected "${vector.prompt}" = ${vector.answer}`,
      );
    }
  }
  return faults;
}

/**
 * Runs the check once, loudly, in development. Deliberately a console error
 * rather than a throw: a mismatch means generated levels cannot be trusted,
 * but the authored 60 lessons come from baked packs and are unaffected, so
 * there is no reason to stop a child playing those.
 */
export function runEngineSelfCheck(): void {
  if (!__DEV__) return;
  const faults = checkEngineAgreement();
  if (faults.length === 0) return;
  console.error(
    'Generated questions do not match what the backend recorded. Levels past ' +
      'the authored lessons are not safe to generate on this engine:\n' +
      faults.join('\n'),
  );
}
