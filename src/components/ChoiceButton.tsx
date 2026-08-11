import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { Tile } from '../types';
import PuzzleTile from './PuzzleTile';

export type ChoiceState = 'idle' | 'selected' | 'correct' | 'wrong';

interface Props {
  label: string;
  /** Set on a drawn puzzle: the answer is the picture, the label just names it. */
  tile?: Tile;
  state?: ChoiceState;
  disabled?: boolean;
  onPress: () => void;
}

export default function ChoiceButton({ label, tile, state = 'idle', disabled, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        tile !== undefined && styles.tileButton,
        state === 'selected' && styles.selected,
        state === 'correct' && styles.correct,
        state === 'wrong' && styles.wrong,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {tile !== undefined && (
        <View style={styles.tile}>
          <PuzzleTile tile={tile} size={78} />
        </View>
      )}
      <Text
        style={[
          styles.label,
          tile !== undefined && styles.tileLabel,
          state === 'selected' && styles.selectedLabel,
          state === 'correct' && styles.correctLabel,
          state === 'wrong' && styles.wrongLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginVertical: 6,
  },
  // A drawn answer is its own label, so the button shrinks to the picture and
  // the letter underneath is only there to be named in the results.
  tileButton: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8 },
  tile: { marginBottom: 6 },
  tileLabel: { fontSize: 15, fontWeight: '800', color: colors.textMuted },
  pressed: {
    opacity: 0.7,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: '#edf0fe',
  },
  correct: {
    borderColor: colors.correct,
    backgroundColor: colors.correctBg,
  },
  wrong: {
    borderColor: colors.wrong,
    backgroundColor: colors.wrongBg,
  },
  label: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  selectedLabel: { color: colors.primaryDark },
  correctLabel: { color: colors.correct },
  wrongLabel: { color: colors.wrong },
});
