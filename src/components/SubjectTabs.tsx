import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { Subject, SUBJECTS } from '../types';

const TABS: Record<Subject, { icon: string; label: string }> = {
  math: { icon: '🧮', label: 'Math' },
  reading: { icon: '📖', label: 'Reading' },
  logic: { icon: '🧩', label: 'Logic' },
};

interface Props {
  subject: Subject;
  onSelect: (subject: Subject) => void;
}

/** Switches between the two halves of the app. Only shown on the home screens. */
export default function SubjectTabs({ subject, onSelect }: Props) {
  return (
    <View style={styles.bar}>
      {SUBJECTS.map((key) => {
        const active = key === subject;
        return (
          <Pressable key={key} style={styles.tab} onPress={() => onSelect(key)}>
            <Text style={[styles.icon, !active && styles.inactive]}>{TABS[key].icon}</Text>
            <Text style={[styles.label, active ? styles.labelActive : styles.inactive]}>
              {TABS[key].label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    paddingBottom: 6,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  icon: { fontSize: 24 },
  label: { fontSize: 12, fontWeight: '800', marginTop: 2 },
  labelActive: { color: colors.primaryDark },
  // Dimmed rather than greyed out, so both tabs stay readable to a child.
  inactive: { color: colors.textMuted, opacity: 0.6 },
});
