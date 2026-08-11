import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { ShapeKind, Tile } from '../types';

/**
 * Solid and hollow forms of each shape. Using the paired glyphs rather than
 * drawing outlines by hand keeps "filled" and "hollow" unmistakably the same
 * shape as each other, which is the whole point when the puzzle's rule is
 * about the filling.
 */
const GLYPH: Record<ShapeKind, { filled: string; hollow: string }> = {
  circle: { filled: '●', hollow: '○' },
  square: { filled: '■', hollow: '□' },
  triangle: { filled: '▲', hollow: '△' },
  diamond: { filled: '◆', hollow: '◇' },
};

interface Props {
  /** null draws the gap in a pattern, as a question mark. */
  tile: Tile | null;
  size: number;
}

export default function PuzzleTile({ tile, size }: Props) {
  const box = [styles.tile, { width: size, height: size }];

  if (tile === null) {
    return (
      <View style={[box, styles.gap]}>
        <Text style={[styles.question, { fontSize: size * 0.45 }]}>?</Text>
      </View>
    );
  }

  if (tile.type === 'shapes') {
    // More shapes in the same square means smaller ones, so a tile never
    // outgrows its box and the count stays readable at a glance.
    const fontSize = size / (tile.shapes.length <= 2 ? 2.4 : tile.shapes.length === 3 ? 3.2 : 4.4);
    return (
      <View style={box}>
        <Text style={[styles.shapes, { fontSize, lineHeight: fontSize * 1.25 }]}>
          {tile.shapes.map((s) => (s.filled ? GLYPH[s.kind].filled : GLYPH[s.kind].hollow)).join(' ')}
        </Text>
      </View>
    );
  }

  const cell = (size - 12) / tile.size;
  return (
    <View style={[box, styles.grid]}>
      {Array.from({ length: tile.size }, (_, row) => (
        <View key={row} style={styles.gridRow}>
          {Array.from({ length: tile.size }, (_, col) => (
            <View
              key={col}
              style={[
                styles.cell,
                { width: cell - 2, height: cell - 2 },
                tile.cells[row * tile.size + col] && styles.cellFilled,
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  gap: { borderStyle: 'dashed', backgroundColor: '#edf0fe' },
  question: { fontWeight: '800', color: colors.primary },
  shapes: { color: colors.text, textAlign: 'center' },
  grid: { padding: 6 },
  gridRow: { flexDirection: 'row' },
  // Empty cells stay visible but faint: without them the figure would float
  // free and there would be no way to see how far it had been turned.
  cell: { margin: 1, borderRadius: 2, backgroundColor: '#eef0f6' },
  cellFilled: { backgroundColor: colors.primary },
});
