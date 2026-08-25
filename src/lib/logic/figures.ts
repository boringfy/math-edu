import { PuzzleShape, ShapeKind, Tile } from '../../types';
import { pick, randInt, shuffle } from '../generator';

/** The shapes a tile can be built from, in a fixed order for the rules below. */
export const SHAPE_KINDS: ShapeKind[] = ['circle', 'square', 'triangle', 'diamond'];

export const shapesTile = (kind: ShapeKind, count: number, filled: boolean): Tile => ({
  type: 'shapes',
  shapes: Array.from({ length: count }, (): PuzzleShape => ({ kind, filled })),
});

export const gridTile = (size: number, cells: boolean[]): Tile => ({ type: 'grid', size, cells });

/** Cell at (row, col) of a row-major grid. */
const at = (cells: boolean[], size: number, row: number, col: number) => cells[row * size + col];

/** A quarter turn clockwise: the top row becomes the right-hand column. */
export function rotate90(tile: Tile): Tile {
  if (tile.type !== 'grid') return tile;
  const { size, cells } = tile;
  const next = Array.from({ length: size * size }, (_, i) => {
    const row = Math.floor(i / size);
    const col = i % size;
    return at(cells, size, size - 1 - col, row);
  });
  return gridTile(size, next);
}

export const rotate180 = (tile: Tile): Tile => rotate90(rotate90(tile));
export const rotate270 = (tile: Tile): Tile => rotate90(rotate180(tile));

/** Reflected left to right, as in a mirror standing beside the figure. */
export function mirror(tile: Tile): Tile {
  if (tile.type !== 'grid') return tile;
  const { size, cells } = tile;
  const next = Array.from({ length: size * size }, (_, i) => {
    const row = Math.floor(i / size);
    const col = i % size;
    return at(cells, size, row, size - 1 - col);
  });
  return gridTile(size, next);
}

export const sameTile = (a: Tile, b: Tile): boolean => {
  if (a.type !== b.type) return false;
  if (a.type === 'grid' && b.type === 'grid') {
    return a.size === b.size && a.cells.every((c, i) => c === b.cells[i]);
  }
  if (a.type === 'clock' && b.type === 'clock') {
    return a.hour === b.hour && a.minute === b.minute;
  }
  if (a.type === 'shapes' && b.type === 'shapes') {
    return (
      a.shapes.length === b.shapes.length &&
      a.shapes.every((s, i) => s.kind === b.shapes[i].kind && s.filled === b.shapes[i].filled)
    );
  }
  return false;
};

/**
 * A lopsided figure on a `size` grid. Turning or mirroring a symmetrical
 * figure changes nothing on screen, which would leave a rotation puzzle with
 * no single right answer — so this keeps drawing until every turn and the
 * mirror give a different picture.
 */
export function asymmetricFigure(size: number, filledCells: number): Tile {
  for (let attempt = 0; attempt < 200; attempt++) {
    const cells = Array<boolean>(size * size).fill(false);
    for (const i of shuffle(cells.map((_, i) => i)).slice(0, filledCells)) cells[i] = true;
    const tile = gridTile(size, cells);
    const variants = [rotate90(tile), rotate180(tile), rotate270(tile), mirror(tile)];
    const distinct = variants.every((v) => !sameTile(v, tile));
    const spread = variants.every((v, i) => variants.every((w, j) => i === j || !sameTile(v, w)));
    if (distinct && spread) return tile;
  }
  // Unreachable for the sizes used here, but a lopsided L is a safe fallback.
  const cells = Array<boolean>(size * size).fill(false);
  cells[0] = cells[size] = cells[size + 1] = true;
  return gridTile(size, cells);
}

/** A random shapes tile, for filling out a set of choices. */
export const randomShapesTile = (maxCount: number): Tile =>
  shapesTile(pick(SHAPE_KINDS), randInt(1, maxCount), Math.random() < 0.5);
