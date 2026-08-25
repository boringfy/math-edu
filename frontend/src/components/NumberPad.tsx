import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { AnswerFormat } from '../types';

const MAX_LENGTH = 6;

const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

/** The extra key on the bottom row, if this answer format needs one. */
const extraKeyFor = (format: AnswerFormat): string | null =>
  format === 'decimal' ? '.' : format === 'fraction' ? '/' : null;

/** Applies one key press to the current entry, ignoring illegal presses. */
export function applyKey(value: string, key: string, format: AnswerFormat): string {
  if (key === 'del') return value.slice(0, -1);
  if (value.length >= MAX_LENGTH) return value;
  if (key === '.') {
    if (format !== 'decimal' || value === '' || value.includes('.')) return value;
    return `${value}.`;
  }
  if (key === '/') {
    if (format !== 'fraction' || value === '' || value.includes('/')) return value;
    return `${value}/`;
  }
  // A leading 0 is only meaningful in front of a decimal point.
  if (value === '0') return key;
  return value + key;
}

/** A half-typed answer like "3." or "1/" isn't ready to be graded. */
export const canSubmit = (value: string): boolean =>
  value !== '' && !value.endsWith('.') && !value.endsWith('/');

interface Props {
  value: string;
  format: AnswerFormat;
  /** Colours the answer box once the answer has been graded. */
  state?: 'idle' | 'correct' | 'wrong';
  disabled?: boolean;
  submitLabel?: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
}

export default function NumberPad({
  value,
  format,
  state = 'idle',
  disabled,
  submitLabel = 'Check answer',
  onChange,
  onSubmit,
}: Props) {
  const extraKey = extraKeyFor(format);
  const press = (key: string) => onChange(applyKey(value, key, format));
  const ready = canSubmit(value) && !disabled;

  const renderKey = (key: string | null, label?: string) => {
    if (key === null) return <View key="spacer" style={styles.keySpacer} />;
    return (
      <Pressable
        key={key}
        onPress={() => press(key)}
        disabled={disabled}
        style={({ pressed }) => [styles.key, pressed && !disabled && styles.keyPressed]}
      >
        <Text style={styles.keyLabel}>{label ?? key}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.answerBox,
          state === 'correct' && styles.answerBoxCorrect,
          state === 'wrong' && styles.answerBoxWrong,
        ]}
      >
        <Text
          style={[
            styles.answerText,
            value === '' && styles.answerPlaceholder,
            state === 'correct' && styles.answerTextCorrect,
            state === 'wrong' && styles.answerTextWrong,
          ]}
        >
          {value === '' ? 'Type your answer' : value}
        </Text>
      </View>

      {DIGIT_ROWS.map((row) => (
        <View key={row[0]} style={styles.row}>
          {row.map((key) => renderKey(key))}
        </View>
      ))}
      <View style={styles.row}>
        {renderKey(extraKey)}
        {renderKey('0')}
        {renderKey('del', '⌫')}
      </View>

      <Pressable
        onPress={onSubmit}
        disabled={!ready}
        style={({ pressed }) => [
          styles.submit,
          !ready && styles.submitDisabled,
          pressed && ready && styles.keyPressed,
        ]}
      >
        <Text style={styles.submitLabel}>{submitLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%', maxWidth: 380, alignSelf: 'center', gap: 10 },
  answerBox: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 4,
  },
  answerBoxCorrect: { borderColor: colors.correct, backgroundColor: colors.correctBg },
  answerBoxWrong: { borderColor: colors.wrong, backgroundColor: colors.wrongBg },
  answerText: { fontSize: 30, fontWeight: '800', color: colors.text },
  answerPlaceholder: { fontSize: 18, fontWeight: '600', color: colors.textMuted },
  answerTextCorrect: { color: colors.correct },
  answerTextWrong: { color: colors.wrong },
  row: { flexDirection: 'row', gap: 10 },
  key: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keySpacer: { flex: 1, height: 56 },
  keyPressed: { opacity: 0.6 },
  keyLabel: { fontSize: 24, fontWeight: '700', color: colors.text },
  submit: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  submitDisabled: { backgroundColor: '#aeb5cc' },
  submitLabel: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
