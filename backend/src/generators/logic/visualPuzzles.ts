import { Question, ShapeKind, Tier, Tile } from '../../contract';
import { nextId, pick, randInt, random, shuffle } from '../generator';
import {
  asymmetricFigure,
  mirror,
  randomShapesTile,
  rotate90,
  rotate180,
  rotate270,
  sameTile,
  SHAPE_KINDS,
  shapesTile,
} from './figures';

/**
 * The drawn half of the logic map. Nothing here is written down: the pattern
 * is in the pictures, so these work the same for a child who is still a
 * shaky reader as for one who isn't.
 */

/** Choices are named rather than described — a description would give it away. */
const LABELS = ['A', 'B', 'C', 'D'];

const SHAPE_NAME: Record<ShapeKind, string> = {
  circle: 'circles',
  square: 'squares',
  triangle: 'triangles',
  diamond: 'diamonds',
};

/** Three wrong answers that differ from the right one, and from each other. */
function distinctFrom(correct: Tile, candidates: Tile[]): Tile[] {
  const kept: Tile[] = [];
  for (const tile of candidates) {
    if (kept.length === 3) break;
    if (sameTile(tile, correct) || kept.some((k) => sameTile(k, tile))) continue;
    kept.push(tile);
  }
  // Only reachable if a rule ran out of near misses; a random tile is still
  // a fair wrong answer, just an easier one to rule out.
  for (let guard = 0; kept.length < 3 && guard < 50; guard++) {
    const tile = randomShapesTile(4);
    if (!sameTile(tile, correct) && !kept.some((k) => sameTile(k, tile))) kept.push(tile);
  }
  return kept;
}

function drawnQuestion(opts: {
  prompt: string;
  stimulus: (Tile | null)[];
  columns: number;
  correct: Tile;
  distractors: Tile[];
  explanation: string;
}): Question {
  const tiles = shuffle([opts.correct, ...distinctFrom(opts.correct, opts.distractors)]);
  const options: Record<string, Tile> = {};
  tiles.forEach((tile, i) => {
    options[LABELS[i]] = tile;
  });

  return {
    id: nextId(),
    prompt: opts.prompt,
    correctAnswer: LABELS[tiles.findIndex((t) => sameTile(t, opts.correct))],
    choices: [...LABELS],
    explanation: opts.explanation,
    answerFormat: null,
    mode: 'choice',
    puzzle: { stimulus: opts.stimulus, columns: opts.columns, options },
  };
}

// ------------------------------------------------------------------ series

export function shapeSeries(tier: Tier): Question {
  const kind = pick(SHAPE_KINDS);
  const filled = random() < 0.5;

  if (tier === 1 || random() < 0.4) {
    // One more each time.
    const stimulus = [1, 2, 3].map((n) => shapesTile(kind, n, filled));
    return drawnQuestion({
      prompt: 'What comes next in the pattern?',
      stimulus: [...stimulus, null],
      columns: 4,
      correct: shapesTile(kind, 4, filled),
      distractors: [
        shapesTile(kind, 3, filled),
        shapesTile(kind, 4, !filled),
        shapesTile(kind, 2, filled),
        shapesTile(pick(SHAPE_KINDS.filter((k) => k !== kind)), 4, filled),
      ],
      explanation: `Each step adds one more ${kind}, so the next one has four.`,
    });
  }

  if (tier === 2) {
    // The shape changes, everything else holds still.
    const order = shuffle(SHAPE_KINDS);
    const count = randInt(1, 3);
    const stimulus = order.slice(0, 3).map((k) => shapesTile(k, count, filled));
    return drawnQuestion({
      prompt: 'What comes next in the pattern?',
      stimulus: [...stimulus, null],
      columns: 4,
      correct: shapesTile(order[3], count, filled),
      distractors: [
        shapesTile(order[0], count, filled),
        shapesTile(order[3], count, !filled),
        shapesTile(order[3], count + 1, filled),
        shapesTile(order[1], count, filled),
      ],
      explanation: `The shape changes each step and the rest stays the same, so the one that has not been used yet comes next.`,
    });
  }

  // Two rules at once: one more each time, and the filling flips.
  const stimulus = [1, 2, 3].map((n) => shapesTile(kind, n, n % 2 === 1 ? filled : !filled));
  return drawnQuestion({
    prompt: 'What comes next in the pattern?',
    stimulus: [...stimulus, null],
    columns: 4,
    correct: shapesTile(kind, 4, !filled),
    distractors: [
      shapesTile(kind, 4, filled),
      shapesTile(kind, 3, !filled),
      shapesTile(kind, 5, !filled),
      shapesTile(pick(SHAPE_KINDS.filter((k) => k !== kind)), 4, !filled),
    ],
    explanation:
      'Two things change together: one more shape each step, and the filling swaps every step.',
  });
}

// ------------------------------------------------------------------ matrix

export function matrixPattern(tier: Tier): Question {
  const kind = pick(SHAPE_KINDS);

  if (tier === 1) {
    // 2×2: down the rows the count grows, across the columns it fills in.
    const cell = (row: number, col: number) => shapesTile(kind, row + 1, col === 1);
    return drawnQuestion({
      prompt: 'Which tile fills the gap?',
      stimulus: [cell(0, 0), cell(0, 1), cell(1, 0), null],
      columns: 2,
      correct: cell(1, 1),
      distractors: [cell(1, 0), cell(0, 1), shapesTile(kind, 3, true), shapesTile(kind, 2, false)],
      explanation:
        'The bottom row has two shapes and the right column is filled in, so the gap is two filled shapes.',
    });
  }

  // 3×3: the shape is set by the row, the number by the column.
  const kinds = shuffle(SHAPE_KINDS).slice(0, 3);
  const filled = tier === 3;
  const cell = (row: number, col: number) => shapesTile(kinds[row], col + 1, filled);
  const grid = [0, 1, 2].flatMap((row) => [0, 1, 2].map((col) => cell(row, col)));
  const correct = cell(2, 2);

  return drawnQuestion({
    prompt: 'Which tile fills the gap?',
    stimulus: [...grid.slice(0, 8), null],
    columns: 3,
    correct,
    distractors: [
      cell(2, 1),
      cell(0, 2),
      cell(1, 2),
      shapesTile(kinds[2], 3, !filled),
    ],
    explanation:
      `Every row keeps to one shape and every column has one more than the last, ` +
      `so the gap needs three ${SHAPE_NAME[kinds[2]]}.`,
  });
}

// ------------------------------------------------------ turning and mirroring

const figureFor = (tier: Tier): Tile =>
  tier === 3 ? asymmetricFigure(4, randInt(5, 7)) : asymmetricFigure(3, randInt(3, 4));

export function rotation(tier: Tier): Question {
  const figure = figureFor(tier);
  const turns =
    tier === 1
      ? { label: 'a half turn', tile: rotate180(figure) }
      : tier === 2
        ? { label: 'a quarter turn to the right', tile: rotate90(figure) }
        : { label: 'a quarter turn to the left', tile: rotate270(figure) };

  return drawnQuestion({
    prompt: `Which one is this figure after ${turns.label}?`,
    stimulus: [figure],
    columns: 1,
    correct: turns.tile,
    distractors: [rotate90(figure), rotate180(figure), rotate270(figure), mirror(figure)],
    explanation:
      `Turn the whole figure ${turns.label} without lifting it off the page. ` +
      `The others are turned the wrong way round, or flipped over — which is not the same thing.`,
  });
}

export function mirrorImage(tier: Tier): Question {
  const figure = figureFor(tier);
  return drawnQuestion({
    prompt: 'Which one is the mirror image of this figure?',
    stimulus: [figure],
    columns: 1,
    correct: mirror(figure),
    distractors: [rotate90(figure), rotate180(figure), rotate270(figure)],
    explanation:
      'A mirror swaps left and right, so what was on the left edge ends up on the right. ' +
      'Turning the figure round can never do that.',
  });
}

// ------------------------------------------------------------- odd one out

/**
 * Four tiles where exactly one property splits them three against one. The
 * other properties are deliberately spread so they cannot be read as a rule
 * — otherwise the puzzle would have two defensible answers.
 */
export function shapeOddOneOut(tier: Tier): Question {
  const kinds = shuffle(SHAPE_KINDS);
  const rule = pick(tier === 1 ? ['fill', 'shape'] : ['fill', 'shape', 'count']);

  let tiles: Tile[];
  let odd: Tile;
  let explanation: string;

  if (rule === 'fill') {
    // Counts run 1, 2, 3 and then repeat one of them, so no count is the odd
    // one out; only the filling separates three from one.
    tiles = [
      shapesTile(kinds[0], 1, false),
      shapesTile(kinds[0], 2, false),
      shapesTile(kinds[0], 3, false),
    ];
    odd = shapesTile(kinds[0], 2, true);
    explanation = 'Three of them are hollow outlines. Only one is filled in.';
  } else if (rule === 'shape') {
    tiles = [
      shapesTile(kinds[0], 1, true),
      shapesTile(kinds[0], 2, false),
      shapesTile(kinds[0], 3, true),
    ];
    odd = shapesTile(kinds[1], 2, false);
    explanation = `Three of them are ${SHAPE_NAME[kinds[0]]}. Only one is not.`;
  } else {
    tiles = [
      shapesTile(kinds[0], 2, true),
      shapesTile(kinds[1], 2, false),
      shapesTile(kinds[2], 2, true),
    ];
    odd = shapesTile(kinds[3], 3, false);
    explanation = 'Three of them have two shapes. Only one has three.';
  }

  return drawnQuestion({
    prompt: 'Which one does not belong?',
    stimulus: [],
    columns: 4,
    correct: odd,
    distractors: tiles,
    explanation,
  });
}

/** Whether exactly one property tells one tile apart from the other three. */
export function oddOneOutIsFair(tiles: Tile[]): boolean {
  const shapes = tiles.map((t) => (t.type === 'shapes' ? t.shapes : []));
  if (shapes.some((s) => s.length === 0)) return false;

  const splits = (values: string[]) =>
    values.filter((v) => values.filter((w) => w === v).length === 1).length === 1 &&
    new Set(values).size === 2;

  const byKind = splits(shapes.map((s) => s[0].kind));
  const byFill = splits(shapes.map((s) => String(s[0].filled)));
  const byCount = splits(shapes.map((s) => String(s.length)));
  return [byKind, byFill, byCount].filter(Boolean).length === 1;
}
