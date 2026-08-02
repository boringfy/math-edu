import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

export type ChoiceState = 'idle' | 'selected' | 'correct' | 'wrong';

interface Props {
  label: string;
  state?: ChoiceState;
  disabled?: boolean;
  onPress: () => void;
}

export default function ChoiceButton({ label, state = 'idle', disabled, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        state === 'selected' && styles.selected,
        state === 'correct' && styles.correct,
        state === 'wrong' && styles.wrong,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.label,
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
