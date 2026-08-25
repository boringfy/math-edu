import { Grade, PuzzleFamily, PuzzleSet, Question, Tier } from '../contract';
import {
  matrixPattern,
  mirrorImage,
  rotation,
  shapeOddOneOut,
  shapeSeries,
} from '../generators/logic/visualPuzzles';
import {
  analogy,
  balanceScale,
  letterSequence,
  logicGrid,
  numberSequence,
  oddNumberOut,
  oddWordOut,
  syllogism,
} from '../generators/logic/textPuzzles';

export const FAMILY_LABEL: Record<PuzzleFamily, string> = {
  sequence: 'numbers',
  letters: 'letters',
  oddWord: 'odd one out',
  oddNumber: 'number rules',
  analogy: 'word links',
  syllogism: 'reasoning',
  balance: 'balance',
  grid: 'deduction',
  series: 'patterns',
  matrix: 'grids',
  rotation: 'turning',
  mirror: 'mirrors',
  oddShape: 'shapes',
};

export const GENERATORS: Record<PuzzleFamily, (tier: Tier) => Question> = {
  sequence: numberSequence,
  letters: letterSequence,
  oddWord: () => oddWordOut(),
  oddNumber: oddNumberOut,
  analogy: () => analogy(),
  syllogism,
  balance: balanceScale,
  grid: logicGrid,
  series: shapeSeries,
  matrix: matrixPattern,
  rotation,
  mirror: mirrorImage,
  oddShape: shapeOddOneOut,
};

/**
 * What each grade has met. A family appears once a child can be expected to
 * hold the idea in their head: drawn patterns from the start, because they
 * need no reading at all; word links once vocabulary is wide enough;
 * deduction and formal reasoning last.
 */
export const AVAILABLE: Record<Grade, PuzzleFamily[]> = {
  1: ['series', 'oddShape', 'matrix', 'rotation', 'sequence', 'oddWord'],
  2: ['series', 'oddShape', 'matrix', 'rotation', 'sequence', 'oddWord', 'letters', 'analogy', 'mirror'],
  3: ['series', 'oddShape', 'matrix', 'rotation', 'sequence', 'oddWord', 'letters', 'analogy', 'mirror', 'balance', 'oddNumber'],
  4: ['series', 'oddShape', 'matrix', 'rotation', 'sequence', 'oddWord', 'letters', 'analogy', 'mirror', 'balance', 'oddNumber', 'grid'],
  5: ['series', 'oddShape', 'matrix', 'rotation', 'sequence', 'oddWord', 'letters', 'analogy', 'mirror', 'balance', 'oddNumber', 'grid', 'syllogism'],
};

export const isAvailable = (family: PuzzleFamily, grade: Grade): boolean =>
  AVAILABLE[grade].includes(family);

interface PuzzleSpec {
  title: string;
  icon: string;
  focus: PuzzleFamily[];
  questionCount: number;
}

/**
 * A set's tier comes from where it sits on the map rather than from the spec,
 * so the map re-bands itself when sets are added and can never dip backwards.
 *
 * Positions are fixed on purpose — progress is stored against the id, so a
 * set can be retitled but never renumbered or reordered. The six that opened
 * each grade therefore stay first in it.
 */
const OPENING: Record<Grade, PuzzleSpec[]> = {
  1: [
    { title: 'Pattern Party', icon: '🔷', focus: ['series'], questionCount: 6 },
    { title: 'Spot the Stranger', icon: '🎨', focus: ['oddShape', 'oddWord'], questionCount: 6 },
    { title: 'Next Number', icon: '🔢', focus: ['sequence'], questionCount: 6 },
    { title: 'Turn It Round', icon: '🔄', focus: ['rotation'], questionCount: 6 },
    { title: 'Fill the Gap', icon: '🧩', focus: ['matrix'], questionCount: 6 },
    { title: 'Brain Boss', icon: '🧠', focus: ['series', 'oddShape', 'sequence', 'matrix'], questionCount: 8 },
  ],
  2: [
    { title: 'Number Trails', icon: '🔢', focus: ['sequence'], questionCount: 6 },
    { title: 'Letter Trails', icon: '🔤', focus: ['letters'], questionCount: 6 },
    { title: 'Shape Patterns', icon: '🔷', focus: ['series', 'matrix'], questionCount: 7 },
    { title: 'Word Links', icon: '🔗', focus: ['analogy'], questionCount: 6 },
    { title: 'Mirror, Mirror', icon: '🪞', focus: ['mirror', 'rotation'], questionCount: 7 },
    { title: 'Brain Boss', icon: '🧠', focus: ['sequence', 'letters', 'analogy', 'matrix'], questionCount: 8 },
  ],
  3: [
    { title: 'Sequences', icon: '🔢', focus: ['sequence', 'letters'], questionCount: 6 },
    { title: 'Odd One Out', icon: '🎨', focus: ['oddWord', 'oddNumber', 'oddShape'], questionCount: 7 },
    { title: 'Balance Puzzles', icon: '⚖️', focus: ['balance'], questionCount: 6 },
    { title: 'Grid Patterns', icon: '🧩', focus: ['matrix', 'series'], questionCount: 7 },
    { title: 'Turning Shapes', icon: '🔄', focus: ['rotation', 'mirror'], questionCount: 7 },
    { title: 'Brain Boss', icon: '🧠', focus: ['sequence', 'analogy', 'balance', 'matrix'], questionCount: 8 },
  ],
  4: [
    { title: 'Tricky Sequences', icon: '🔢', focus: ['sequence', 'letters'], questionCount: 7 },
    { title: 'Word Links', icon: '🔗', focus: ['analogy', 'oddWord'], questionCount: 7 },
    { title: 'Who Has What?', icon: '🕵️', focus: ['grid'], questionCount: 6 },
    { title: 'Shape Logic', icon: '🧩', focus: ['matrix', 'series', 'oddShape'], questionCount: 7 },
    { title: 'Turn and Flip', icon: '🔄', focus: ['rotation', 'mirror'], questionCount: 7 },
    { title: 'Brain Boss', icon: '🧠', focus: ['sequence', 'grid', 'matrix', 'analogy'], questionCount: 9 },
  ],
  5: [
    { title: 'Hard Sequences', icon: '🔢', focus: ['sequence', 'letters'], questionCount: 7 },
    { title: 'All Are, So…?', icon: '🧾', focus: ['syllogism'], questionCount: 6 },
    { title: 'Detective Grid', icon: '🕵️', focus: ['grid'], questionCount: 6 },
    { title: 'Rules and Balances', icon: '⚖️', focus: ['balance', 'oddNumber'], questionCount: 7 },
    { title: 'Shape Reasoning', icon: '🧩', focus: ['matrix', 'rotation', 'mirror'], questionCount: 8 },
    { title: 'Brain Boss', icon: '🧠', focus: ['syllogism', 'grid', 'matrix', 'sequence'], questionCount: 9 },
  ],
};

/** How many puzzle sets each grade offers, openers included. */
const SETS_PER_GRADE_TARGET = 60;

/** What a set of one family is called, cycled so a grade doesn't repeat. */
const SET_TITLES: Record<PuzzleFamily, string[]> = {
  sequence: ['Number Trails', 'What Comes Next', 'Number Rules', 'Counting On'],
  letters: ['Letter Trails', 'Alphabet Steps', 'Letter Rules', 'Letter Jumps'],
  oddWord: ['Odd Word Out', 'Spot the Stranger', 'One Is Different', 'Word Sorting'],
  oddNumber: ['Odd Number Out', 'Number Sorting', 'Break the Rule', 'Which Is Different'],
  analogy: ['Word Links', 'This Is To That', 'Pairs and Pairs', 'Matching Ideas'],
  syllogism: ['Follow the Logic', 'Therefore', 'True or Not', 'Reasoning Drill'],
  balance: ['Balance the Scales', 'Weighing Up', 'Heavier or Lighter', 'Scale Puzzles'],
  grid: ['Who Has What', 'Deduction Grid', 'Work It Out', 'Rule Them Out'],
  series: ['Pattern Party', 'Shape Trails', 'What Comes Next', 'Pattern Rules'],
  matrix: ['Fill the Gap', 'Grid Puzzles', 'The Missing Square', 'Complete the Grid'],
  rotation: ['Turn It Round', 'Which Way Round', 'Turning Shapes', 'Quarter Turns'],
  mirror: ['Mirror, Mirror', 'Reflections', 'Flip It Over', 'Mirror Match'],
  oddShape: ['Odd Shape Out', 'Spot the Odd One', 'Shape Sorting', 'One Is Wrong'],
};

const SET_ICONS: Record<PuzzleFamily, string> = {
  sequence: '🔢',
  letters: '🔤',
  oddWord: '🎨',
  oddNumber: '🔍',
  analogy: '🔗',
  syllogism: '🧠',
  balance: '⚖️',
  grid: '🗂️',
  series: '🔷',
  matrix: '🧩',
  rotation: '🔄',
  mirror: '🪞',
  oddShape: '⬛',
};

const ROMAN = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII'];

/** "Numbers, Mirrors & Deduction" rather than three ampersands in a row. */
const listTitle = (parts: string[]): string => {
  const titled = parts.map((p) => p.replace(/\b\w/g, (c) => c.toUpperCase()));
  return titled.length < 2
    ? titled.join('')
    : `${titled.slice(0, -1).join(', ')} & ${titled[titled.length - 1]}`;
};

/**
 * Fills a grade's logic map out to its full length.
 *
 * Every puzzle is generated at play time, so a stop is only a choice of which
 * families it draws on and how many it asks. Sets widen as the map goes on:
 * one family at a time to begin with, so a child can settle into a kind of
 * thinking, then pairs and finally mixtures where the first job is working
 * out what sort of puzzle you are looking at.
 */
function fillOut(grade: Grade, openers: PuzzleSpec[]): PuzzleSpec[] {
  const families = AVAILABLE[grade];
  const sets: PuzzleSpec[] = [];
  const used = new Map<string, number>();

  const name = (base: string): string => {
    const seen = (used.get(base) ?? 0) + 1;
    used.set(base, seen);
    return `${base}${ROMAN[Math.min(seen - 1, ROMAN.length - 1)]}`;
  };

  for (const spec of openers) name(spec.title);

  for (let i = openers.length; i < SETS_PER_GRADE_TARGET - 1; i++) {
    const share = i / SETS_PER_GRADE_TARGET;
    const first = families[i % families.length];
    const width = share < 0.4 ? 1 : share < 0.75 ? 2 : 3;
    const focus = Array.from(
      { length: width },
      (_, k) => families[(i + k * (1 + (i % 4))) % families.length],
    ).filter((f, k, all) => all.indexOf(f) === k);

    const titles = SET_TITLES[first];
    const base =
      focus.length === 1
        ? titles[Math.floor(i / families.length) % titles.length]
        : listTitle(focus.map((f) => FAMILY_LABEL[f]));

    sets.push({
      title: name(base),
      icon: SET_ICONS[first],
      focus,
      questionCount: 6 + Math.floor(share * 4),
    });
  }

  sets.push({
    title: `Grade ${grade} Brain Boss`,
    icon: '🧠',
    focus: families.slice(0, 5),
    questionCount: 10,
  });
  return sets;
}

const CURRICULUM: Record<Grade, PuzzleSpec[]> = {
  1: [...OPENING[1], ...fillOut(1, OPENING[1])],
  2: [...OPENING[2], ...fillOut(2, OPENING[2])],
  3: [...OPENING[3], ...fillOut(3, OPENING[3])],
  4: [...OPENING[4], ...fillOut(4, OPENING[4])],
  5: [...OPENING[5], ...fillOut(5, OPENING[5])],
};

/** Each grade's map is split into three difficulty bands of equal length. */
const tierForIndex = (i: number, count: number): Tier =>
  i < Math.ceil(count / 3) ? 1 : i < Math.ceil((count * 2) / 3) ? 2 : 3;

const build = (grade: Grade, spec: PuzzleSpec, i: number, count: number): PuzzleSet => ({
  id: `g${grade}-p${i + 1}`,
  grade,
  index: i + 1,
  title: spec.title,
  icon: spec.icon,
  tier: tierForIndex(i, count),
  focus: spec.focus,
  questionCount: spec.questionCount,
});

const shelve = (grade: Grade): PuzzleSet[] =>
  CURRICULUM[grade].map((s, i) => build(grade, s, i, CURRICULUM[grade].length));

export const PUZZLE_SETS: Record<Grade, PuzzleSet[]> = {
  1: shelve(1),
  2: shelve(2),
  3: shelve(3),
  4: shelve(4),
  5: shelve(5),
};

export const SETS_PER_GRADE = PUZZLE_SETS[1].length;
