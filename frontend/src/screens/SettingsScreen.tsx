import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { colors } from '../theme';
import { Settings } from '../types';

interface Props {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onBack: () => void;
}

interface RowProps {
  label: string;
  detail: string;
  value: boolean;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
}

/** One switch and the sentence that says what it does. */
function Row({ label, detail, value, disabled, onValueChange }: RowProps) {
  return (
    <View style={[styles.row, disabled && styles.rowOff]}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
      <Switch
        value={value}
        disabled={disabled}
        accessibilityLabel={label}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
      />
    </View>
  );
}

/**
 * The one page meant for a grown-up rather than a child: what the quiz
 * offers, rather than anything about how well it is going. Every change is
 * saved as it is made, so there is nothing to confirm on the way out.
 */
export default function SettingsScreen({ settings, onChange, onBack }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.section}>Scratch paper</Text>
        <Row
          label="Scratch paper"
          detail="A sheet of scrap paper above maths questions, for working an answer out by hand."
          value={settings.scratchPaper}
          onValueChange={(scratchPaper) => onChange({ ...settings, scratchPaper })}
        />
        <Row
          label="Pen only"
          detail="Only a stylus draws. A hand resting on the screen is ignored, so writing with a pen doesn't scrawl across the working."
          value={settings.penOnly}
          disabled={!settings.scratchPaper}
          onValueChange={(penOnly) => onChange({ ...settings, penOnly })}
        />
        <Text style={styles.note}>
          Turn this off on a tablet with no pen, or the paper won't take a fingertip either.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 24, fontWeight: '800', color: colors.text, lineHeight: 28 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  scroll: { flex: 1 },
  content: { paddingTop: 20, paddingBottom: 24 },
  section: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 10,
  },
  rowOff: { opacity: 0.5 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 18, fontWeight: '800', color: colors.text },
  rowDetail: { fontSize: 14, color: colors.textMuted, marginTop: 4, lineHeight: 20 },
  note: { fontSize: 13, color: colors.textMuted, lineHeight: 19, paddingHorizontal: 4 },
});
