// GENERATED FILE — DO NOT EDIT.
// Copied from backend/src/generators by `npm run sync:shared`.
// Change the original and re-run that; edits here are overwritten.

import { Question } from '../contract';
import { Rng, makeQuestion, numPool } from './generator';

/**
 * Mass: grams and kilograms.
 *
 * `measurement.ts` covers length and capacity and had nothing at all for
 * weight, which leaves out a third of the units a primary child is taught and
 * most of the ones they meet in a kitchen.
 *
 * Shaped to match the length and capacity questions beside it — convert,
 * total, difference, and how many fit — so a child who has learned to read
 * "how much is left" for millilitres reads the same question for grams.
 */

export function kilogramsToGrams(maxKilos: number, rng: Rng): Question {
  const kilos = rng.randInt(2, maxKilos);
  const grams = kilos * 1000;
  return makeQuestion(
    rng,
    `How many grams are there in ${kilos} kilograms?`,
    String(grams),
    // Out by a factor of ten either way, and the hundreds slip.
    numPool(grams, [kilos * 100, kilos * 10_000, kilos * 10]),
    `1 kilogram is 1000 grams, so ${kilos} × 1000 = ${grams} g`,
    'integer',
  );
}

export function totalMass(maxGrams: number, rng: Rng): Question {
  const a = rng.randInt(50, maxGrams);
  const b = rng.randInt(50, maxGrams);
  return makeQuestion(
    rng,
    `A bag of flour weighs ${a} g and a bag of sugar weighs ${b} g. What do they weigh together in grams?`,
    String(a + b),
    numPool(a + b, [Math.abs(a - b), a, b]),
    `${a} + ${b} = ${a + b} g`,
    'integer',
  );
}

export function massDifference(maxGrams: number, rng: Rng): Question {
  const heavy = rng.randInt(200, maxGrams);
  const light = rng.randInt(50, heavy - 10);
  return makeQuestion(
    rng,
    `A melon weighs ${heavy} g and an apple weighs ${light} g. How much heavier is the melon in grams?`,
    String(heavy - light),
    numPool(heavy - light, [heavy + light, heavy, light]),
    `${heavy} − ${light} = ${heavy - light} g`,
    'integer',
  );
}

/** A kilogram total given in grams — the conversion has to happen first. */
export function mixedMassTotal(maxGrams: number, rng: Rng): Question {
  const kilos = rng.randInt(1, 4);
  const grams = rng.randInt(50, maxGrams);
  const total = kilos * 1000 + grams;
  return makeQuestion(
    rng,
    `A parcel weighs ${kilos} kg and ${grams} g. What is that in grams altogether?`,
    String(total),
    // Adding the numbers as they stand, and the ten-times slip.
    numPool(total, [kilos + grams, kilos * 100 + grams, total - 1000]),
    `${kilos} kg is ${kilos * 1000} g, and ${kilos * 1000} + ${grams} = ${total} g`,
    'integer',
  );
}

export function howManyPacks(maxTotal: number, rng: Rng): Question {
  const pack = rng.pick([100, 200, 250, 500]);
  const packs = rng.randInt(2, Math.max(2, Math.floor((maxTotal * 1000) / pack)));
  const total = pack * packs;
  return makeQuestion(
    rng,
    `Flour comes in ${pack} g bags. How many bags make ${total} g?`,
    String(packs),
    numPool(packs, [packs + 1, Math.max(1, packs - 1), total / 100]),
    `${total} ÷ ${pack} = ${packs} bags`,
    'integer',
  );
}
