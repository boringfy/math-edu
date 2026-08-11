import { StyleSheet, useWindowDimensions, View } from 'react-native';
import PuzzleTile from './PuzzleTile';
import { VisualPuzzle } from '../types';

const GAP = 10;
const MAX_TILE = 84;

interface Props {
  puzzle: VisualPuzzle;
}

/**
 * The drawn part of a puzzle: the series, the grid of tiles, or the single
 * figure to be turned. Renders nothing when the choices are the whole puzzle,
 * as in "which one does not belong?".
 */
export default function PuzzleBoard({ puzzle }: Props) {
  const { width } = useWindowDimensions();
  if (puzzle.stimulus.length === 0) return null;

  const columns = Math.max(1, puzzle.columns);
  // 40 for the screen's own padding, then whatever the gaps between tiles take.
  const size = Math.min(MAX_TILE, Math.floor((width - 40 - (columns - 1) * GAP) / columns));

  const rows = Array.from({ length: Math.ceil(puzzle.stimulus.length / columns) }, (_, r) =>
    puzzle.stimulus.slice(r * columns, r * columns + columns),
  );

  return (
    <View style={styles.board}>
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((tile, c) => (
            <PuzzleTile key={c} tile={tile} size={size} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { alignItems: 'center', gap: GAP, marginTop: 8 },
  row: { flexDirection: 'row', gap: GAP },
});
