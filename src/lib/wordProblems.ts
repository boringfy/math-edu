import { Grade, Question, Tier } from '../types';
import { Gen, makeQuestion, numPool, pick, randInt, shuffle } from './generator';

/**
 * Real-world story problems. Each builder turns a small random scenario into
 * a Question, so the same shape shows up with different numbers, names and
 * objects every time.
 *
 * Builders take explicit caps rather than reading the grade, so a caller can
 * keep the arithmetic inside whatever range the grade/tier allows.
 */

const NAMES = ['Mia', 'Leo', 'Ava', 'Noah', 'Zoe', 'Omar', 'Lily', 'Sam', 'Ivy', 'Max'];

const ITEMS = [
  'stickers',
  'marbles',
  'crayons',
  'apples',
  'cookies',
  'pencils',
  'shells',
  'buttons',
  'grapes',
  'blocks',
];

interface Creature {
  singular: string;
  plural: string;
  legs: number;
  /** What the legs are called for this animal. */
  part: string;
  where: string;
}

const CREATURES: Creature[] = [
  { singular: 'bird', plural: 'birds', legs: 2, part: 'feet', where: 'in a tree' },
  { singular: 'duck', plural: 'ducks', legs: 2, part: 'feet', where: 'on the pond' },
  { singular: 'chicken', plural: 'chickens', legs: 2, part: 'feet', where: 'in the yard' },
  { singular: 'dog', plural: 'dogs', legs: 4, part: 'legs', where: 'at the park' },
  { singular: 'cat', plural: 'cats', legs: 4, part: 'legs', where: 'on the porch' },
  { singular: 'horse', plural: 'horses', legs: 4, part: 'legs', where: 'in the field' },
  { singular: 'cow', plural: 'cows', legs: 4, part: 'legs', where: 'on the farm' },
  { singular: 'ant', plural: 'ants', legs: 6, part: 'legs', where: 'on a leaf' },
  { singular: 'beetle', plural: 'beetles', legs: 6, part: 'legs', where: 'in the garden' },
  { singular: 'spider', plural: 'spiders', legs: 8, part: 'legs', where: 'in the shed' },
  { singular: 'octopus', plural: 'octopuses', legs: 8, part: 'arms', where: 'in the tank' },
];

const VEHICLES = [
  { singular: 'bicycle', plural: 'bicycles', wheels: 2 },
  { singular: 'tricycle', plural: 'tricycles', wheels: 3 },
  { singular: 'car', plural: 'cars', wheels: 4 },
  { singular: 'wagon', plural: 'wagons', wheels: 4 },
  { singular: 'truck', plural: 'trucks', wheels: 6 },
];

const CONTAINERS = [
  { singular: 'box', plural: 'boxes' },
  { singular: 'pack', plural: 'packs' },
  { singular: 'bag', plural: 'bags' },
  { singular: 'basket', plural: 'baskets' },
  { singular: 'tray', plural: 'trays' },
];

/** Two distinct names, so "X gives Y" never reads as "Mia gives Mia". */
function twoNames(): [string, string] {
  const a = pick(NAMES);
  let b = pick(NAMES);
  while (b === a) b = pick(NAMES);
  return [a, b];
}

/** "There are 6 birds in a tree. How many feet do they have in total?" */
export function legsProblem(maxAnswer: number): Question {
  // Only animals we can ask about at least twice while staying under the cap.
  const usable = CREATURES.filter((c) => c.legs * 2 <= maxAnswer);
  const c = pick(usable.length > 0 ? usable : CREATURES.filter((x) => x.legs === 2));
  const n = randInt(2, Math.max(2, Math.floor(maxAnswer / c.legs)));
  const total = n * c.legs;
  return makeQuestion(
    `There are ${n} ${c.plural} ${c.where}. How many ${c.part} do they have in total?`,
    String(total),
    // Forgetting to multiply, and one animal too many or too few.
    numPool(total, [n, c.legs, total + c.legs, total - c.legs, n + c.legs]),
    `Each ${c.singular} has ${c.legs} ${c.part}, so ${n} × ${c.legs} = ${total}`,
    'integer',
  );
}

/** "A bike rack holds 7 bicycles. How many wheels is that?" */
export function wheelsProblem(maxAnswer: number): Question {
  const usable = VEHICLES.filter((v) => v.wheels * 2 <= maxAnswer);
  const v = pick(usable.length > 0 ? usable : VEHICLES.filter((x) => x.wheels === 2));
  const n = randInt(2, Math.max(2, Math.floor(maxAnswer / v.wheels)));
  const total = n * v.wheels;
  return makeQuestion(
    `${n} ${v.plural} are parked outside. How many wheels are there in total?`,
    String(total),
    numPool(total, [n, v.wheels, total + v.wheels, total - v.wheels]),
    `Each ${v.singular} has ${v.wheels} wheels, so ${n} × ${v.wheels} = ${total}`,
    'integer',
  );
}

/** Addition story: someone is given more of something. */
export function joinStory(maxTotal: number): Question {
  const [name, friend] = twoNames();
  const item = pick(ITEMS);
  const a = randInt(1, maxTotal - 1);
  const b = randInt(1, maxTotal - a);
  const total = a + b;
  return makeQuestion(
    `${name} has ${a} ${item}. ${friend} gives ${name} ${b} more. How many ${item} does ${name} have now?`,
    String(total),
    // Subtracting instead of adding is the classic slip here.
    numPool(total, [Math.abs(a - b), a, b]),
    `${a} + ${b} = ${total}`,
    'integer',
  );
}

/** Subtraction story: someone gives part of a collection away. */
export function takeAwayStory(maxStart: number): Question {
  const [name, friend] = twoNames();
  const item = pick(ITEMS);
  const a = randInt(2, maxStart);
  const b = randInt(1, a - 1);
  const left = a - b;
  return makeQuestion(
    `${name} has ${a} ${item} and gives ${b} of them to ${friend}. How many ${item} does ${name} have left?`,
    String(left),
    numPool(left, [a + b, b, a]),
    `${a} - ${b} = ${left}`,
    'integer',
  );
}

/**
 * Missing-operand story: you know the start and the end, and have to work
 * out what was taken away. "Joe has 10 apples, gives Paul some, and now has
 * 4 — how many did he give away?"
 */
export function gaveSomeAwayStory(maxStart: number): Question {
  const [name, friend] = twoNames();
  const item = pick(ITEMS);
  const start = randInt(3, maxStart);
  const left = randInt(1, start - 1);
  const given = start - left;
  return makeQuestion(
    `${name} has ${start} ${item}. ${name} gives some to ${friend}, and now has ${left} ${item} left. How many ${item} did ${name} give away?`,
    String(given),
    // Adding the two known numbers, or answering with one of them.
    numPool(given, [start + left, left, start]),
    `${start} - ${left} = ${given}`,
    'integer',
  );
}

/** The same shape the other way round: how many were received? */
export function receivedSomeStory(maxTotal: number): Question {
  const [name, friend] = twoNames();
  const item = pick(ITEMS);
  const total = randInt(3, maxTotal);
  const start = randInt(1, total - 1);
  const received = total - start;
  return makeQuestion(
    `${name} had ${start} ${item}. ${friend} gave ${name} some more, and now ${name} has ${total}. How many ${item} did ${friend} give?`,
    String(received),
    numPool(received, [start + total, start, total]),
    `${total} - ${start} = ${received}`,
    'integer',
  );
}

/** How many more are needed to reach a target. */
export function howManyMoreNeeded(maxTarget: number): Question {
  const name = pick(NAMES);
  const item = pick(ITEMS);
  const target = randInt(3, maxTarget);
  const has = randInt(1, target - 1);
  const needed = target - has;
  return makeQuestion(
    `${name} has ${has} ${item} and wants ${target} altogether. How many more ${item} does ${name} need?`,
    String(needed),
    numPool(needed, [has + target, has, target]),
    `${target} - ${has} = ${needed}`,
    'integer',
  );
}

/** Multiplication story: equal groups in containers. */
export function packsProblem(maxGroups: number, perGroup: number[]): Question {
  const box = pick(CONTAINERS);
  const item = pick(ITEMS);
  const k = pick(perGroup);
  const n = randInt(2, maxGroups);
  const total = n * k;
  return makeQuestion(
    `Each ${box.singular} holds ${k} ${item}. How many ${item} are in ${n} ${box.plural}?`,
    String(total),
    // Adding the two numbers instead of multiplying, plus adjacent multiples.
    numPool(total, [n + k, total + k, total - k]),
    `${n} ${box.plural} × ${k} ${item} = ${total}`,
    'integer',
  );
}

/** Division story: a pile shared out evenly. */
export function shareEquallyProblem(maxGroups: number, maxEach: number): Question {
  const item = pick(ITEMS);
  const groups = randInt(2, maxGroups);
  const each = randInt(2, maxEach);
  const total = groups * each;
  return makeQuestion(
    `${total} ${item} are shared equally among ${groups} friends. How many ${item} does each friend get?`,
    String(each),
    numPool(each, [groups, total - groups]),
    `${total} ÷ ${groups} = ${each}`,
    'integer',
  );
}

/** Days in a number of weeks — a unit-conversion story. */
export function weekDaysProblem(maxWeeks: number): Question {
  const name = pick(NAMES);
  const weeks = randInt(2, maxWeeks);
  const days = weeks * 7;
  return makeQuestion(
    `${name}'s summer camp lasts ${weeks} weeks. There are 7 days in a week. How many days is that?`,
    String(days),
    numPool(days, [weeks + 7, days + 7, days - 7]),
    `${weeks} × 7 = ${days}`,
    'integer',
  );
}

/** Money in whole cents, so the answer stays an integer. */
export function coinsProblem(maxPrice: number, maxCount: number): Question {
  const name = pick(NAMES);
  const item = pick(['pencil', 'eraser', 'sticker', 'balloon', 'marble']);
  const price = randInt(2, maxPrice);
  const count = randInt(2, maxCount);
  const total = price * count;
  return makeQuestion(
    `One ${item} costs ${price} cents. ${name} buys ${count} of them. How many cents does ${name} pay?`,
    String(total),
    numPool(total, [price + count, total + price, total - price]),
    `${count} × ${price} = ${total} cents`,
    'integer',
  );
}

/** Two-step: multiply out a cost, then subtract from what was handed over. */
export function changeProblem(maxPrice: number, maxCount: number): Question {
  const name = pick(NAMES);
  const item = pick(['notebook', 'comic book', 'water bottle', 'keychain', 'plant']);
  const price = randInt(2, maxPrice);
  const count = randInt(2, maxCount);
  const cost = price * count;
  // Round the payment up to a believable note that still leaves change.
  const paid = Math.ceil((cost + 1) / 5) * 5;
  const change = paid - cost;
  return makeQuestion(
    `A ${item} costs $${price}. ${name} buys ${count} of them and pays with $${paid}. How many dollars change does ${name} get?`,
    String(change),
    // Stopping after the first step, or buying one item too few.
    numPool(change, [cost, paid - price, cost - price]),
    `${count} × $${price} = $${cost}, then $${paid} - $${cost} = $${change}`,
    'integer',
  );
}

/** Division that has to round *up* — you can't send a fraction of a bus. */
export function busesProblem(): Question {
  const capacity = pick([20, 25, 30, 40, 50]);
  const buses = randInt(2, 6);
  // Deliberately leave a remainder so the last bus is only partly full.
  const students = capacity * (buses - 1) + randInt(1, capacity - 1);
  return makeQuestion(
    `${students} students are going on a trip. Each bus holds ${capacity} students. How many buses are needed?`,
    String(buses),
    // Rounding down is the whole point of the question, so keep the
    // distractors tight around the answer rather than using numPool's
    // wide spread.
    [buses - 1, buses + 1, buses + 2].filter((n) => n > 0).map(String),
    `${students} ÷ ${capacity} is ${buses - 1} full buses with students left over, so ${buses} buses are needed`,
    'integer',
  );
}

/** Area or perimeter of a rectangular garden. */
export function rectangleProblem(kind: 'area' | 'perimeter', maxSide: number): Question {
  const place = pick(['garden', 'rug', 'vegetable patch', 'sandpit', 'playground']);
  const w = randInt(2, maxSide);
  const l = randInt(2, maxSide);
  if (kind === 'area') {
    const area = w * l;
    return makeQuestion(
      `A rectangular ${place} is ${w} m wide and ${l} m long. What is its area in square metres?`,
      String(area),
      // Confusing area with perimeter is the classic mix-up.
      numPool(area, [2 * (w + l), w + l]),
      `Area = ${w} × ${l} = ${area} square metres`,
      'integer',
    );
  }
  const perimeter = 2 * (w + l);
  return makeQuestion(
    `A rectangular ${place} is ${w} m wide and ${l} m long. What is its perimeter in metres?`,
    String(perimeter),
    numPool(perimeter, [w * l, w + l]),
    `Perimeter = 2 × (${w} + ${l}) = ${perimeter} metres`,
    'integer',
  );
}

/** What fraction of a set has some property. */
export function fractionOfSetProblem(): Question {
  const item = pick(['marbles', 'balloons', 'pencils', 'beads', 'socks']);
  const colour = pick(['blue', 'red', 'green', 'yellow']);
  const total = randInt(4, 12);
  const part = randInt(1, total - 1);
  return makeQuestion(
    `A jar holds ${total} ${item}, and ${part} of them are ${colour}. What fraction of the ${item} are ${colour}?`,
    `${part}/${total}`,
    // Flipping the fraction, and counting the wrong group.
    [`${total}/${part}`, `${part}/${total - part}`, `${total - part}/${total}`, `${part + 1}/${total}`],
    `${part} out of ${total} are ${colour}, so the fraction is ${part}/${total}`,
    'fraction',
  );
}

/** Shopping with dollars and cents — the answer has two decimal places. */
export function moneyDecimalProblem(): Question {
  const name = pick(NAMES);
  const item = pick(['juice box', 'muffin', 'notebook', 'sticker pack', 'apple']);
  const price = randInt(105, 899) / 100;
  const count = randInt(2, 6);
  const total = Math.round(price * count * 100) / 100;
  const fmt = (n: number) => n.toFixed(2);
  return makeQuestion(
    `One ${item} costs $${fmt(price)}. ${name} buys ${count} of them. How many dollars does ${name} pay?`,
    fmt(total),
    // A misplaced decimal point, and one item too many or too few.
    [fmt(total * 10), fmt(total / 10), fmt(total + price), fmt(total - price)],
    `${count} × $${fmt(price)} = $${fmt(total)}`,
    'decimal',
  );
}

/** A friendly percentage of a whole number. */
export function percentProblem(): Question {
  const pct = pick([10, 20, 25, 50, 75]);
  const setting = pick([
    { place: 'theatre', unit: 'seats', verb: 'are taken' },
    { place: 'school', unit: 'students', verb: 'walk to school' },
    { place: 'car park', unit: 'spaces', verb: 'are full' },
    { place: 'library shelf', unit: 'books', verb: 'are picture books' },
  ]);
  // Keep the total a multiple of 4 and 10 so every pct lands on a whole number.
  const total = randInt(1, 10) * 20;
  const answer = (total * pct) / 100;
  return makeQuestion(
    `A ${setting.place} has ${total} ${setting.unit}. ${pct}% of them ${setting.verb}. How many ${setting.unit} is that?`,
    String(answer),
    // The complement (the other side of the split) is the usual wrong pick.
    numPool(answer, [total - answer, pct, total / 2]),
    `${pct}% of ${total} = ${total} × ${pct} ÷ 100 = ${answer}`,
    'integer',
  );
}

/** Mean of three whole numbers, chosen so the average is whole too. */
export function averageProblem(): Question {
  const name = pick(NAMES);
  // The verb travels with the noun so the sentence reads naturally —
  // you score points, but you collect shells.
  const activity = pick([
    { verb: 'scored', what: 'points', where: 'three basketball games' },
    { verb: 'read', what: 'pages', where: 'three evenings' },
    { verb: 'collected', what: 'shells', where: 'three trips to the beach' },
    { verb: 'scored', what: 'goals', where: 'three football matches' },
  ]);
  const mean = randInt(4, 30);
  // Spread two values either side of the mean so the third balances it out.
  const spread = randInt(1, Math.min(3, mean - 1));
  const a = mean - spread;
  const b = mean + spread;
  const c = mean;
  const values = shuffle([a, b, c]);
  return makeQuestion(
    `${name} ${activity.verb} ${values[0]}, ${values[1]} and ${values[2]} ${activity.what} in ${activity.where}. What was the average?`,
    String(mean),
    // Reporting the total instead of the mean is the classic error.
    numPool(mean, [a + b + c, Math.round((a + b + c) / 2)]),
    `${a} + ${b} + ${c} = ${a + b + c}, then ${a + b + c} ÷ 3 = ${mean}`,
    'integer',
  );
}

/** Story problems suitable for a grade at a difficulty tier. */
export function wordProblemsFor(grade: Grade, tier: Tier): Gen[] {
  switch (grade) {
    case 1: {
      const limit = tier === 1 ? 10 : 20;
      const gens: Gen[] = [
        () => joinStory(limit),
        () => takeAwayStory(limit),
        () => legsProblem(limit),
        () => gaveSomeAwayStory(limit),
        () => receivedSomeStory(limit),
      ];
      if (tier >= 2) gens.push(() => wheelsProblem(limit));
      return gens;
    }
    case 2: {
      const limit = tier === 1 ? 50 : tier === 2 ? 100 : 200;
      const groupSizes = tier === 1 ? [2, 5, 10] : tier === 2 ? [2, 3, 4, 5, 10] : [2, 3, 4, 5, 6, 10];
      return [
        () => joinStory(limit),
        () => takeAwayStory(limit),
        () => legsProblem(tier === 1 ? 24 : 48),
        () => wheelsProblem(tier === 1 ? 24 : 48),
        () => packsProblem(tier === 1 ? 5 : 10, groupSizes),
        () => gaveSomeAwayStory(limit),
        () => howManyMoreNeeded(limit),
      ];
    }
    case 3: {
      const maxFactor = tier === 1 ? 5 : tier === 2 ? 10 : 12;
      return [
        () => shareEquallyProblem(maxFactor, maxFactor),
        () => packsProblem(maxFactor, [2, 3, 4, 5, 6, 10]),
        () => coinsProblem(tier === 1 ? 9 : 25, maxFactor),
        () => legsProblem(tier === 1 ? 48 : 96),
        () => weekDaysProblem(tier === 1 ? 5 : 12),
        () => howManyMoreNeeded(tier === 1 ? 50 : 200),
      ];
    }
    case 4: {
      const gens: Gen[] = [
        () => busesProblem(),
        () => changeProblem(tier === 1 ? 5 : 12, tier === 1 ? 4 : 8),
        () => rectangleProblem('area', tier === 1 ? 9 : 20),
        () => rectangleProblem('perimeter', tier === 1 ? 9 : 20),
      ];
      if (tier >= 2) gens.push(() => fractionOfSetProblem());
      return gens;
    }
    case 5: {
      const gens: Gen[] = [
        () => moneyDecimalProblem(),
        () => percentProblem(),
        () => averageProblem(),
      ];
      if (tier >= 2) gens.push(() => changeProblem(20, 9), () => fractionOfSetProblem());
      return gens;
    }
  }
}
