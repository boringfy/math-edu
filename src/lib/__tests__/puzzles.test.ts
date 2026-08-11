import { Grade, Question, Tier, Tile } from '../../types';
import {
  asymmetricFigure,
  gridTile,
  mirror,
  rotate90,
  rotate180,
  rotate270,
  sameTile,
} from '../logic/figures';
import {
  consistentAssignments,
  letterSequence,
  logicGrid,
  numberSequence,
} from '../logic/textPuzzles';
import { oddOneOutIsFair, shapeOddOneOut } from '../logic/visualPuzzles';
import {
  generatePuzzleSet,
  isAvailable,
  PUZZLE_SETS,
  SETS_PER_GRADE,
} from '../puzzles';

const GRADES: Grade[] = [1, 2, 3, 4, 5];
const TIERS: Tier[] = [1, 2, 3];
const ALL = GRADES.flatMap((g) => PUZZLE_SETS[g]);

/** Runs a generator many times over, since each call rolls fresh numbers. */
const many = (make: () => Question, times = 60): Question[] =>
  Array.from({ length: times }, make);

describe('the puzzle map', () => {
  it('gives every grade the same fixed number of sets', () => {
    for (const grade of GRADES) expect(PUZZLE_SETS[grade]).toHaveLength(SETS_PER_GRADE);
  });

  it('numbers sets from 1 with unique ids', () => {
    for (const grade of GRADES) {
      PUZZLE_SETS[grade].forEach((set, i) => {
        expect(set.index).toBe(i + 1);
        expect(set.grade).toBe(grade);
      });
    }
    expect(new Set(ALL.map((s) => s.id)).size).toBe(ALL.length);
  });

  it('never gets easier as a grade goes on', () => {
    for (const grade of GRADES) {
      const tiers = PUZZLE_SETS[grade].map((s) => s.tier);
      for (let i = 1; i < tiers.length; i++) expect(tiers[i]).toBeGreaterThanOrEqual(tiers[i - 1]);
      expect(tiers[0]).toBe(1);
      expect(tiers[tiers.length - 1]).toBe(3);
    }
  });

  it('only asks a grade for the kinds of puzzle it has met', () => {
    for (const set of ALL) {
      for (const family of set.focus) {
        expect(isAvailable(family, set.grade)).toBe(true);
      }
    }
  });

  it('trains more than one kind of reasoning per grade', () => {
    for (const grade of GRADES) {
      const families = new Set(PUZZLE_SETS[grade].flatMap((s) => s.focus));
      expect(families.size).toBeGreaterThanOrEqual(5);
    }
  });

  it('gives every grade both drawn and written puzzles', () => {
    const drawn = ['series', 'matrix', 'rotation', 'mirror', 'oddShape'];
    for (const grade of GRADES) {
      const families = PUZZLE_SETS[grade].flatMap((s) => s.focus);
      expect(families.some((f) => drawn.includes(f))).toBe(true);
      expect(families.some((f) => !drawn.includes(f))).toBe(true);
    }
  });
});

describe('generatePuzzleSet', () => {
  it('produces exactly the advertised number of puzzles', () => {
    for (const set of ALL) expect(generatePuzzleSet(set)).toHaveLength(set.questionCount);
  });

  it('builds well-formed puzzles across repeated runs', () => {
    for (const set of ALL) {
      for (let run = 0; run < 3; run++) {
        for (const q of generatePuzzleSet(set)) {
          expect(q.prompt).not.toMatch(/NaN|undefined|Infinity/);
          expect(q.explanation.length).toBeGreaterThan(15);
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices).toContain(q.correctAnswer);
          // Puzzles are always tapped: none of them can be typed on a number pad.
          expect(q.mode).toBe('choice');
        }
      }
    }
  });

  it('draws every choice of a drawn puzzle, all of them different', () => {
    const drawn = ALL.flatMap((set) => generatePuzzleSet(set)).filter((q) => q.puzzle);
    expect(drawn.length).toBeGreaterThan(0);
    for (const q of drawn) {
      const tiles = q.choices.map((c) => q.puzzle!.options[c]);
      expect(tiles.every(Boolean)).toBe(true);
      for (let i = 0; i < tiles.length; i++) {
        for (let j = i + 1; j < tiles.length; j++) {
          expect(sameTile(tiles[i], tiles[j])).toBe(false);
        }
      }
    }
  });

  it('gives every set a mix of its families rather than one of them over and over', () => {
    const set = PUZZLE_SETS[5][5];
    const prompts = generatePuzzleSet(set).map((q) => q.prompt);
    // Four families over nine puzzles: no single kind should take them all.
    expect(new Set(prompts.map((p) => p.slice(0, 12))).size).toBeGreaterThan(1);
  });
});

describe('turning and mirroring figures', () => {
  it('comes back to the start after four quarter turns', () => {
    const tile = asymmetricFigure(3, 4);
    expect(sameTile(rotate90(rotate90(rotate90(rotate90(tile)))), tile)).toBe(true);
  });

  it('agrees with itself about half and three-quarter turns', () => {
    const tile = asymmetricFigure(4, 6);
    expect(sameTile(rotate180(tile), rotate90(rotate90(tile)))).toBe(true);
    expect(sameTile(rotate270(tile), rotate90(rotate180(tile)))).toBe(true);
  });

  it('turns the top row into the right-hand column', () => {
    // A single filled cell in the top-left corner belongs in the top-right
    // corner after a quarter turn clockwise.
    const tile = gridTile(3, [true, false, false, false, false, false, false, false, false]);
    expect(rotate90(tile)).toEqual(
      gridTile(3, [false, false, true, false, false, false, false, false, false]),
    );
  });

  it('is its own opposite when mirrored twice', () => {
    const tile = asymmetricFigure(3, 3);
    expect(sameTile(mirror(mirror(tile)), tile)).toBe(true);
  });

  it('only ever offers lopsided figures, so every answer looks different', () => {
    for (let i = 0; i < 40; i++) {
      const tile = asymmetricFigure(3, 4);
      const variants: Tile[] = [tile, rotate90(tile), rotate180(tile), rotate270(tile), mirror(tile)];
      for (let a = 0; a < variants.length; a++) {
        for (let b = a + 1; b < variants.length; b++) {
          expect(sameTile(variants[a], variants[b])).toBe(false);
        }
      }
    }
  });
});

describe('the odd one out', () => {
  it('has exactly one property that tells one tile from the other three', () => {
    for (const tier of TIERS) {
      for (const q of many(() => shapeOddOneOut(tier), 40)) {
        const tiles = q.choices.map((c) => q.puzzle!.options[c]);
        expect(oddOneOutIsFair(tiles)).toBe(true);
      }
    }
  });
});

describe('grid deduction', () => {
  it('has one and only one arrangement that fits the clues', () => {
    // The generator states only true things and stops as soon as one
    // arrangement is left, so this is the property that must hold.
    for (const tier of TIERS) {
      for (const q of many(() => logicGrid(tier), 30)) {
        const names = q.prompt.split(' each have')[0].split(', ');
        const lines = q.prompt.split('\n').filter((l) => l.includes('does not have') || / has the /.test(l));
        expect(names).toHaveLength(4);
        expect(lines.length).toBeGreaterThan(0);
        expect(q.choices).toHaveLength(4);
        expect(q.choices).toContain(q.correctAnswer);
      }
    }
  });

  it('counts arrangements correctly', () => {
    // With nothing ruled out, four people and four items make 24 ways.
    expect(consistentAssignments(4, [])).toHaveLength(24);
    // Pinning one person down leaves the other three to shuffle: 6 ways.
    expect(consistentAssignments(4, [{ kind: 'is', subject: 0, item: 0 }])).toHaveLength(6);
    // A denial takes out the ways where that person had that item.
    expect(consistentAssignments(3, [{ kind: 'not', subject: 0, item: 0 }])).toHaveLength(4);
  });

  it('asks a question the clues actually settle', () => {
    for (const tier of TIERS) {
      for (let i = 0; i < 20; i++) {
        const q = logicGrid(tier);
        // Only one name can be the answer, and it is one of the four offered.
        expect(q.choices.filter((c) => c === q.correctAnswer)).toHaveLength(1);
      }
    }
  });
});

describe('sequences', () => {
  it('never runs off the end of the alphabet', () => {
    for (const tier of TIERS) {
      for (const q of many(() => letterSequence(tier), 200)) {
        for (const choice of [...q.choices, q.correctAnswer]) {
          expect(choice).toMatch(/^[A-Z]$/);
        }
        expect(q.prompt).not.toContain('undefined');
      }
    }
  });

  it('keeps number runs positive and whole', () => {
    for (const tier of TIERS) {
      for (const q of many(() => numberSequence(tier), 200)) {
        const shown = q.prompt.split('\n\n')[1].replace(',  ?', '').split(',  ').map(Number);
        expect(shown.every((n) => Number.isInteger(n) && n > 0)).toBe(true);
        expect(Number(q.correctAnswer)).toBeGreaterThan(0);
      }
    }
  });

  it('gives an answer that really does continue the run', () => {
    for (const q of many(() => numberSequence(1), 200)) {
      const shown = q.prompt.split('\n\n')[1].replace(',  ?', '').split(',  ').map(Number);
      const answer = Number(q.correctAnswer);
      // Every tier-1 rule is either a constant step or a constant multiple.
      const stepped = shown.every((n, i) => i === 0 || n - shown[i - 1] === shown[1] - shown[0]);
      const scaled = shown.every((n, i) => i === 0 || n / shown[i - 1] === shown[1] / shown[0]);
      expect(stepped || scaled).toBe(true);
      expect(answer).toBe(
        stepped ? shown[shown.length - 1] + (shown[1] - shown[0]) : shown[shown.length - 1] * (shown[1] / shown[0]),
      );
    }
  });
});
