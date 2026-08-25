import { Grade, Question, Tier } from '../contract';
import { Gen, makeQuestion, numPool, pick, randInt } from './generator';

/** Length and capacity: unit conversions and everyday measuring problems. */

const LENGTH_UNITS = [
  { from: 'cm', to: 'mm', factor: 10 },
  { from: 'm', to: 'cm', factor: 100 },
  { from: 'km', to: 'm', factor: 1000 },
];

export function lengthConversion(allowed: string[], maxValue: number): Question {
  const unit = pick(LENGTH_UNITS.filter((u) => allowed.includes(u.from)));
  const value = randInt(2, maxValue);
  const converted = value * unit.factor;
  return makeQuestion(
    `How many ${unit.to} are there in ${value} ${unit.from}?`,
    String(converted),
    // Converting the wrong way, and slipping a power of ten.
    numPool(converted, [value * (unit.factor / 10), value * unit.factor * 10, value]),
    `1 ${unit.from} = ${unit.factor} ${unit.to}, so ${value} × ${unit.factor} = ${converted} ${unit.to}`,
    'integer',
  );
}

/** Mixed units in, single unit out — "2 m 40 cm" as centimetres. */
export function mixedLengthTotal(): Question {
  const item = pick(['rope', 'ribbon', 'plank', 'garden hose', 'scarf']);
  const metres = randInt(1, 9);
  const centimetres = randInt(5, 95);
  const total = metres * 100 + centimetres;
  return makeQuestion(
    `A ${item} is ${metres} m and ${centimetres} cm long. How long is it in cm?`,
    String(total),
    // Adding the numbers as they stand, and forgetting the loose centimetres.
    numPool(total, [metres + centimetres, metres * 100, centimetres * 100]),
    `${metres} m = ${metres * 100} cm, then ${metres * 100} + ${centimetres} = ${total} cm`,
    'integer',
  );
}

/** Equal lengths laid end to end. */
export function totalLength(maxPieces: number): Question {
  const item = pick(['ribbon', 'string', 'tape', 'wire', 'paper strip']);
  const pieces = randInt(2, maxPieces);
  const each = randInt(2, 12) * 5;
  const total = pieces * each;
  return makeQuestion(
    `${pieces} pieces of ${item} are each ${each} cm long. Laid end to end, how long are they in cm?`,
    String(total),
    numPool(total, [pieces + each, total - each, total + each]),
    `${pieces} × ${each} = ${total} cm`,
    'integer',
  );
}

/** How much shorter one length is than another, across mixed units. */
export function lengthDifference(): Question {
  const tallerName = pick(['A door', 'A bookshelf', 'A fence panel', 'A ladder']);
  const metres = randInt(2, 3);
  const shorter = randInt(20, 180);
  const taller = metres * 100;
  const difference = taller - shorter;
  return makeQuestion(
    `${tallerName} is ${metres} m tall and a chair is ${shorter} cm tall. How many cm taller is it?`,
    String(difference),
    // Subtracting before converting is the classic slip.
    numPool(difference, [metres - shorter, taller + shorter, shorter]),
    `${metres} m = ${taller} cm, then ${taller} - ${shorter} = ${difference} cm`,
    'integer',
  );
}

export function litresToMillilitres(maxLitres: number): Question {
  const litres = randInt(2, maxLitres);
  const millilitres = litres * 1000;
  return makeQuestion(
    `How many millilitres are there in ${litres} litres?`,
    String(millilitres),
    numPool(millilitres, [litres * 100, litres * 10000, litres]),
    `1 litre = 1000 ml, so ${litres} × 1000 = ${millilitres} ml`,
    'integer',
  );
}

/** Filling equal containers from a bigger one. */
export function containerTotal(): Question {
  const vessel = pick([
    { name: 'bottle', plural: 'bottles' },
    { name: 'cup', plural: 'cups' },
    { name: 'glass', plural: 'glasses' },
    { name: 'carton', plural: 'cartons' },
  ]);
  const each = pick([100, 125, 200, 250, 500]);
  const count = randInt(2, 8);
  const total = each * count;
  return makeQuestion(
    `${count} ${vessel.plural} each hold ${each} ml. How many ml is that altogether?`,
    String(total),
    numPool(total, [each + count, total - each, total + each]),
    `${count} × ${each} = ${total} ml`,
    'integer',
  );
}

/** How many small containers a large one fills — division with units. */
export function howManyGlasses(): Question {
  const litres = randInt(1, 4);
  const each = pick([100, 125, 200, 250, 500]);
  const total = litres * 1000;
  const glasses = total / each;
  return makeQuestion(
    `A ${litres} litre jug of juice is poured into ${each} ml glasses. How many glasses does it fill?`,
    String(glasses),
    numPool(glasses, [litres, glasses * 2]),
    `${litres} litres = ${total} ml, then ${total} ÷ ${each} = ${glasses} glasses`,
    'integer',
  );
}

/** What's left in the container after pouring some out. */
export function liquidLeft(): Question {
  const litres = randInt(1, 3);
  const total = litres * 1000;
  const poured = randInt(1, (total - 100) / 50) * 50;
  const left = total - poured;
  return makeQuestion(
    `A jug holds ${litres} litre${litres > 1 ? 's' : ''} of juice. ${poured} ml is poured out. How many ml are left?`,
    String(left),
    // Subtracting from the number of litres rather than millilitres.
    numPool(left, [total + poured, poured, litres]),
    `${litres} litres = ${total} ml, then ${total} - ${poured} = ${left} ml`,
    'integer',
  );
}

/** Length and capacity generators for a grade at a difficulty tier. */
export function measurementFor(grade: Grade, tier: Tier): Gen[] {
  switch (grade) {
    case 1:
      // Unit conversion lands after grade 1.
      return [];
    case 2:
      return [
        () => lengthConversion(['cm'], tier === 1 ? 5 : 9),
        () => totalLength(tier === 1 ? 4 : 6),
      ];
    case 3:
      return [
        () => lengthConversion(['cm', 'm'], tier === 1 ? 5 : 9),
        () => totalLength(6),
        () => mixedLengthTotal(),
        () => litresToMillilitres(tier === 1 ? 4 : 9),
      ];
    case 4: {
      const gens: Gen[] = [
        () => lengthConversion(['cm', 'm', 'km'], 9),
        () => mixedLengthTotal(),
        () => containerTotal(),
        () => liquidLeft(),
      ];
      if (tier >= 2) gens.push(() => lengthDifference());
      return gens;
    }
    case 5:
      return [
        () => lengthConversion(['m', 'km'], 20),
        () => lengthDifference(),
        () => howManyGlasses(),
        () => liquidLeft(),
        () => containerTotal(),
      ];
  }
}
