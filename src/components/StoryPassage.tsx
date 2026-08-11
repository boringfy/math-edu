import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { Passage } from '../types';

interface Props {
  passage: Passage;
  /**
   * Reading isn't a memory test, so the story stays open by default and can
   * only be folded away to make room for a long question.
   */
  startOpen?: boolean;
}

export default function StoryPassage({ passage, startOpen = true }: Props) {
  const [open, setOpen] = useState(startOpen);

  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={() => setOpen(!open)}>
        <Text style={styles.title} numberOfLines={1}>
          {passage.icon} {passage.title}
        </Text>
        <Text style={styles.toggle}>{open ? 'Hide ▴' : 'Read again ▾'}</Text>
      </Pressable>
      {open && <Text style={styles.text}>{passage.text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '800', color: colors.text, flexShrink: 1 },
  toggle: { fontSize: 13, fontWeight: '700', color: colors.primary, marginLeft: 10 },
  // Generous line height: young readers lose their place in tight text.
  text: { fontSize: 17, lineHeight: 27, color: colors.text, marginTop: 10 },
});
