import { Question, Tier } from '../../contract';
import { makeQuestion, pick, randInt, random, shuffle } from '../generator';

/**
 * The written half of the logic map: puzzles whose whole content is a
 * sentence or a row of numbers. Every one of them is generated rather than
 * written out, so a set never repeats, and every one explains its rule —
 * the point is to teach the pattern, not to score the child.
 */

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// ---------------------------------------------------------------- sequences

interface Rule {
  /** The terms shown, plus the answer as the final entry. */
  terms: number[];
  explanation: string;
}

function numberRuleFor(tier: Tier): Rule {
  const length = 5;
  const kinds =
    tier === 1
      ? (['add', 'add', 'double'] as const)
      : tier === 2
        ? (['add', 'multiply', 'growing', 'double'] as const)
        : (['growing', 'multiply', 'squares', 'fibonacci', 'shrinking'] as const);

  switch (pick([...kinds])) {
    case 'add': {
      const start = randInt(1, 9);
      const step = randInt(2, tier === 1 ? 5 : 9);
      return {
        terms: Array.from({ length }, (_, i) => start + i * step),
        explanation: `Each number is ${step} more than the one before it.`,
      };
    }
    case 'shrinking': {
      const step = randInt(3, 9);
      const start = step * length + randInt(1, 20);
      return {
        terms: Array.from({ length }, (_, i) => start - i * step),
        explanation: `Each number is ${step} less than the one before it.`,
      };
    }
    case 'double': {
      const start = randInt(1, 5);
      return {
        terms: Array.from({ length }, (_, i) => start * 2 ** i),
        explanation: 'Each number is double the one before it.',
      };
    }
    case 'multiply': {
      const factor = randInt(2, 3);
      const start = randInt(1, 4);
      return {
        terms: Array.from({ length }, (_, i) => start * factor ** i),
        explanation: `Each number is the one before it multiplied by ${factor}.`,
      };
    }
    case 'growing': {
      // Steps that themselves grow: +2, +3, +4, … which is what makes this
      // harder than a plain jump — the gap is the thing that has a pattern.
      const start = randInt(1, 6);
      const firstStep = randInt(1, 3);
      const terms = [start];
      for (let i = 0; i < length - 1; i++) terms.push(terms[i] + firstStep + i);
      return {
        terms,
        explanation: `The gaps grow by one each time: +${firstStep}, +${firstStep + 1}, +${firstStep + 2}, and so on.`,
      };
    }
    case 'squares': {
      const start = randInt(1, 4);
      return {
        terms: Array.from({ length }, (_, i) => (start + i) ** 2),
        explanation: `These are square numbers: ${start}×${start}, ${start + 1}×${start + 1}, and so on.`,
      };
    }
    default: {
      const a = randInt(1, 4);
      const b = randInt(a + 1, 8);
      const terms = [a, b];
      for (let i = 2; i < length; i++) terms.push(terms[i - 2] + terms[i - 1]);
      return {
        terms,
        explanation: 'Each number is the two before it added together.',
      };
    }
  }
}

export function numberSequence(tier: Tier): Question {
  const { terms, explanation } = numberRuleFor(tier);
  const answer = terms[terms.length - 1];
  const shown = terms.slice(0, -1);
  const gap = answer - shown[shown.length - 1];
  return makeQuestion(
    `What comes next?\n\n${shown.join(',  ')},  ?`,
    String(answer),
    // Near misses a child would actually reach: repeating the last gap the
    // wrong way, or stopping one short.
    [answer + 1, answer - 1, answer + gap, shown[shown.length - 1] + 1]
      .filter((n) => n !== answer && n > 0)
      .map(String),
    explanation,
    null,
  );
}

export function letterSequence(tier: Tier): Question {
  const growing = tier > 1 && random() < 0.5;
  const step = randInt(1, growing ? 2 : 4);
  // Four jumps from the first letter to the answer, so the whole run has to
  // fit inside the alphabet — the start is chosen last, once its size is known.
  const jumps = Array.from({ length: 4 }, (_, i) => (growing ? step + i : step));
  const span = jumps.reduce((sum, j) => sum + j, 0);
  const start = randInt(0, LETTERS.length - 1 - span);

  const indexes = [start];
  for (const jump of jumps) indexes.push(indexes[indexes.length - 1] + jump);
  const answerIndex = indexes.pop()!;

  // Reaching in both directions guarantees three neighbours even when the
  // answer sits hard against A or Z.
  const near = [-3, -2, -1, 1, 2, 3]
    .map((offset) => answerIndex + offset)
    .filter((i) => i >= 0 && i < LETTERS.length)
    .map((i) => LETTERS[i]);

  return makeQuestion(
    `Which letter comes next?\n\n${indexes.map((i) => LETTERS[i]).join(',  ')},  ?`,
    LETTERS[answerIndex],
    shuffle(near).slice(0, 3),
    growing
      ? `The jumps grow each time: ${step}, then ${step + 1}, then ${step + 2} letters along.`
      : `Each letter is ${step} along the alphabet from the one before.`,
    null,
  );
}

// -------------------------------------------------------------- odd one out

const CATEGORIES: { name: string; words: string[] }[] = [
  { name: 'animals', words: ['cat', 'dog', 'horse', 'cow', 'sheep', 'goat', 'pig', 'duck'] },
  { name: 'things you travel in', words: ['bus', 'car', 'train', 'truck', 'boat', 'plane'] },
  { name: 'fruit', words: ['apple', 'pear', 'banana', 'plum', 'peach', 'mango'] },
  { name: 'colours', words: ['red', 'blue', 'green', 'yellow', 'purple'] },
  { name: 'furniture', words: ['chair', 'table', 'bed', 'desk', 'shelf'] },
  { name: 'parts of the body', words: ['arm', 'leg', 'hand', 'foot', 'ear', 'nose'] },
  { name: 'clothes', words: ['hat', 'coat', 'sock', 'shoe', 'scarf'] },
  { name: 'kinds of weather', words: ['rain', 'snow', 'fog', 'wind', 'hail'] },
  { name: 'tools', words: ['hammer', 'saw', 'drill', 'spade'] },
  { name: 'things in the sky', words: ['star', 'moon', 'cloud', 'comet'] },
];

export function oddWordOut(): Question {
  const [home, away] = shuffle(CATEGORIES).slice(0, 2);
  const family = shuffle(home.words).slice(0, 3);
  const stranger = pick(away.words);
  return makeQuestion(
    `Which word does not belong?\n\n${shuffle([...family, stranger]).join(',  ')}`,
    stranger,
    family,
    `The other three are all ${home.name}.`,
    null,
  );
}

export function oddNumberOut(tier: Tier): Question {
  const base = randInt(3, tier === 3 ? 9 : 5);
  const multiples = shuffle(Array.from({ length: 12 }, (_, i) => (i + 2) * base)).slice(0, 3);
  // An intruder that is close to the others but misses the rule.
  let stranger = pick(multiples) + pick([1, -1, 2, -2]);
  while (stranger % base === 0 || stranger <= 0 || multiples.includes(stranger)) stranger += 1;

  return makeQuestion(
    `Which number does not belong?\n\n${shuffle([...multiples, stranger]).join(',  ')}`,
    String(stranger),
    multiples.map(String),
    `The other three all divide exactly by ${base}. ${stranger} does not.`,
    null,
  );
}

// ---------------------------------------------------------------- analogies

const RELATIONS: { name: string; pairs: [string, string][] }[] = [
  {
    name: 'what you wear on it',
    pairs: [
      ['hand', 'glove'],
      ['foot', 'sock'],
      ['head', 'hat'],
      ['neck', 'scarf'],
    ],
  },
  {
    name: 'its young',
    pairs: [
      ['dog', 'puppy'],
      ['cat', 'kitten'],
      ['cow', 'calf'],
      ['sheep', 'lamb'],
      ['horse', 'foal'],
    ],
  },
  {
    name: 'where it lives',
    pairs: [
      ['bird', 'nest'],
      ['bee', 'hive'],
      ['spider', 'web'],
      ['rabbit', 'burrow'],
    ],
  },
  {
    name: 'its opposite',
    pairs: [
      ['hot', 'cold'],
      ['big', 'small'],
      ['day', 'night'],
      ['wet', 'dry'],
      ['fast', 'slow'],
    ],
  },
  {
    name: 'what it is part of',
    pairs: [
      ['page', 'book'],
      ['petal', 'flower'],
      ['wheel', 'car'],
      ['finger', 'hand'],
      ['leaf', 'tree'],
    ],
  },
  {
    name: 'who uses it',
    pairs: [
      ['brush', 'painter'],
      ['hammer', 'builder'],
      ['chalk', 'teacher'],
      ['whistle', 'referee'],
    ],
  },
];

export function analogy(): Question {
  const relation = pick(RELATIONS);
  const [example, target] = shuffle(relation.pairs).slice(0, 2);
  const others = shuffle(RELATIONS.filter((r) => r !== relation));
  const distractors = [
    // The other half of the example, which is the trap: the right kind of
    // word, but the answer to the wrong half of the question.
    example[1],
    ...relation.pairs.filter((p) => p !== example && p !== target).map((p) => p[1]),
    ...others.slice(0, 2).map((r) => pick(r.pairs)[1]),
  ].filter((w) => w !== target[1]);

  return makeQuestion(
    `${example[0]} is to ${example[1]} as ${target[0]} is to …?`,
    target[1],
    distractors,
    `In each pair the second word is ${relation.name}: ` +
      `${example[0]} → ${example[1]}, so ${target[0]} → ${target[1]}.`,
    null,
  );
}

// -------------------------------------------------------------- syllogisms

/**
 * Invented words on purpose. With real ones a child can answer from what
 * they already know about cats and animals; with nonsense the only way
 * through is to follow the two sentences.
 */
const NONSENSE = ['bloops', 'razzies', 'lazzies', 'wugs', 'doops', 'fims', 'tazzes', 'grints'];

export function syllogism(tier: Tier): Question {
  const [a, b, c] = shuffle(NONSENSE).slice(0, 3);

  // The harder form shares a category rather than chaining through one, so
  // nothing at all follows — which is the thing worth learning.
  if (tier === 3 && random() < 0.5) {
    return makeQuestion(
      `All ${a} are ${b}.\nAll ${c} are ${b}.\n\nWhich of these must be true?`,
      'None of these has to be true',
      [`All ${a} are ${c}`, `All ${c} are ${a}`, `No ${a} are ${c}`],
      `Both live inside ${b}, but that says nothing about whether they overlap — some ${a} might be ${c}, or none might be.`,
      null,
    );
  }

  return makeQuestion(
    `All ${a} are ${b}.\nAll ${b} are ${c}.\n\nWhich of these must be true?`,
    `All ${a} are ${c}`,
    [`All ${c} are ${a}`, `No ${a} are ${c}`, `Some ${b} are not ${c}`],
    `Every ${a.slice(0, -1)} is inside ${b}, and all of ${b} is inside ${c} — so all ${a} are ${c} too. It does not work backwards.`,
    null,
  );
}

// ------------------------------------------------------------- balance sums

const BALANCE_ITEMS = ['🍎', '🍌', '🍉', '🍐', '🍇', '🥕'];

export function balanceScale(tier: Tier): Question {
  const [small, middle, big] = shuffle(BALANCE_ITEMS).slice(0, 3);
  const first = randInt(2, tier === 1 ? 3 : 4);
  const second = randInt(2, tier === 3 ? 5 : 3);
  const answer = first * second;

  return makeQuestion(
    `${first} ${small} weigh the same as 1 ${middle}.\n` +
      `${second} ${middle} weigh the same as 1 ${big}.\n\n` +
      `How many ${small} weigh the same as 1 ${big}?`,
    String(answer),
    [first + second, answer + first, answer - first, second].filter((n) => n !== answer).map(String),
    `One ${big} is ${second} lots of ${middle}, and each ${middle} is ${first} ${small} — so ${second} × ${first} = ${answer}.`,
    null,
  );
}

// ------------------------------------------------------------ grid deduction

export type Clue = { kind: 'is' | 'not'; subject: number; item: number };

/** Every way of handing the items out that breaks none of the clues. */
export function consistentAssignments(size: number, clues: Clue[]): number[][] {
  const results: number[][] = [];
  const walk = (taken: number[]) => {
    if (taken.length === size) {
      results.push([...taken]);
      return;
    }
    const subject = taken.length;
    for (let item = 0; item < size; item++) {
      if (taken.includes(item)) continue;
      const ok = clues.every((c) =>
        c.subject !== subject
          ? true
          : c.kind === 'is'
            ? c.item === item
            : c.item !== item,
      );
      if (ok) walk([...taken, item]);
    }
  };
  walk([]);
  return results;
}

const PEOPLE = ['Ada', 'Ben', 'Cleo', 'Dev', 'Elsa', 'Finn', 'Gita', 'Hugo'];
const SETS: { noun: string; items: string[] }[] = [
  { noun: 'pet', items: ['cat', 'dog', 'fish', 'rabbit'] },
  { noun: 'fruit', items: ['apple', 'banana', 'pear', 'plum'] },
  { noun: 'hat', items: ['red hat', 'blue hat', 'green hat', 'yellow hat'] },
  { noun: 'instrument', items: ['drum', 'flute', 'violin', 'piano'] },
];

/**
 * Builds a small who-has-what puzzle by choosing the answer first and then
 * adding true clues until only one arrangement survives — so the puzzle is
 * solvable by reasoning alone, never by guessing.
 */
export function logicGrid(tier: Tier): Question {
  // Always four, so the four names are exactly the four choices. Difficulty
  // is how much is given away outright rather than how big the grid is.
  const size = 4;
  const names = shuffle(PEOPLE).slice(0, size);
  const set = pick(SETS);
  const items = shuffle(set.items).slice(0, size);
  const solution = shuffle(items.map((_, i) => i));

  const clues: Clue[] = [];
  const giveaways = tier === 1 ? 2 : tier === 2 ? 1 : 0;
  for (const subject of shuffle(names.map((_, i) => i)).slice(0, giveaways)) {
    clues.push({ kind: 'is', subject, item: solution[subject] });
  }

  // Then deny things that are genuinely not so, one at a time, until a single
  // arrangement is left. Denying every false pairing would pin it down on its
  // own, so this always finishes — usually long before running out.
  const denials = shuffle(
    names.flatMap((_, subject) =>
      items
        .map((_, item) => ({ kind: 'not' as const, subject, item }))
        .filter((c) => solution[c.subject] !== c.item),
    ),
  );
  for (const denial of denials) {
    if (consistentAssignments(size, clues).length === 1) break;
    clues.push(denial);
  }

  // A clue added early can be made redundant by a later one — "Finn does not
  // have the drum" says nothing once "Finn has the piano" is on the list. Drop
  // any line the rest of them already cover, so nothing is read for nothing.
  const dropped = new Set<number>();
  const needed = clues.filter((_clue, i) => {
    const without = clues.filter((_, j) => j !== i && !dropped.has(j));
    if (consistentAssignments(size, without).length === 1) {
      dropped.add(i);
      return false;
    }
    return true;
  });

  const asked = randInt(0, size - 1);
  const owner = names[solution.indexOf(asked)];
  const lines = shuffle(needed).map((c) =>
    c.kind === 'is'
      ? `${names[c.subject]} has the ${items[c.item]}.`
      : `${names[c.subject]} does not have the ${items[c.item]}.`,
  );

  return makeQuestion(
    `${names.join(', ')} each have one ${set.noun}: ` +
      `${items.join(', ')}.\n\n${lines.join('\n')}\n\nWho has the ${items[asked]}?`,
    owner,
    names.filter((n) => n !== owner),
    `Cross off every ${set.noun} the clues rule out and only one name is left beside the ${items[asked]}.`,
    null,
  );
}
