import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Profile, ProfileStore, canAddProfile } from '../lib/profiles';
import { colors } from '../theme';

/**
 * Who's playing.
 *
 * Faces and names, big enough to hit, with no password anywhere — a child who
 * cannot yet read reliably picks themselves out by their animal. The one
 * playing is ringed rather than ticked, because a tick reads as "done".
 */
interface Props {
  visible: boolean;
  profiles: ProfileStore;
  onPick: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onAdd: () => void;
  onClose: () => void;
}

export default function ProfilePicker({ visible, profiles, onPick, onRename, onAdd, onClose }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const close = () => {
    if (editingId) setEditingId(null);
    else onClose();
  };
  const saveName = () => {
    if (!editingId || !draftName.trim()) return;
    onRename(editingId, draftName);
    setEditingId(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.avoider} behavior="padding">
        <Pressable style={styles.backdrop} onPress={close}>
          {/* Stops a tap inside the card from closing it. */}
          <Pressable style={styles.card} onPress={() => {}}>
            {editingId ? (
              <>
                <Text style={styles.title}>Change player name</Text>
                <TextInput
                  style={styles.nameInput}
                  value={draftName}
                  onChangeText={setDraftName}
                  accessibilityLabel="Player name"
                  maxLength={12}
                  selectTextOnFocus
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={saveName}
                />
                <View style={styles.actions}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Cancel name change" onPress={() => setEditingId(null)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Save player name" disabled={!draftName.trim()} onPress={saveName}>
                    <Text style={[styles.saveText, !draftName.trim() && styles.saveDisabled]}>Save</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.title}>Who's playing?</Text>
                <View style={styles.grid}>
                  {profiles.profiles.map((profile: Profile) => {
                    const playing = profile.id === profiles.activeId;
                    return (
                      <View key={profile.id} style={styles.kidWrap}>
                        <Pressable
                          style={[styles.kid, playing && styles.kidPlaying]}
                          accessibilityRole="button"
                          accessibilityLabel={playing ? `${profile.name}, playing` : `Switch to ${profile.name}`}
                          onPress={() => onPick(profile.id)}
                        >
                          <Text style={styles.avatar}>{profile.avatar}</Text>
                          <Text style={styles.name} numberOfLines={1}>{profile.name}</Text>
                        </Pressable>
                        {playing && (
                          <Pressable
                            style={styles.editName}
                            accessibilityRole="button"
                            accessibilityLabel={`Edit ${profile.name}'s name`}
                            onPress={() => {
                              setDraftName(profile.name);
                              setEditingId(profile.id);
                            }}
                          >
                            <Text style={styles.editNameText}>✎ Edit name</Text>
                          </Pressable>
                        )}
                      </View>
                    );
                  })}
                  {canAddProfile(profiles) && (
                    <Pressable
                      style={[styles.kid, styles.add]}
                      accessibilityRole="button"
                      accessibilityLabel="Add someone"
                      onPress={onAdd}
                    >
                      <Text style={styles.avatar}>＋</Text>
                      <Text style={styles.name}>Add</Text>
                    </Pressable>
                  )}
                </View>
                <Pressable style={styles.done} accessibilityRole="button" accessibilityLabel="Close" onPress={onClose}>
                  <Text style={styles.doneText}>Done</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  avoider: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
  },
  kidWrap: { width: 104, alignItems: 'center' },
  kid: {
    width: 104,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  kidPlaying: { borderColor: colors.primary, backgroundColor: '#edf0fe' },
  add: { borderStyle: 'dashed' },
  avatar: { fontSize: 38 },
  name: { marginTop: 6, fontSize: 14, fontWeight: '700', color: colors.text },
  editName: { paddingVertical: 8, paddingHorizontal: 2 },
  editNameText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  nameInput: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    color: colors.text,
    fontSize: 18,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 24, marginTop: 20 },
  cancelText: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
  saveText: { fontSize: 16, fontWeight: '800', color: colors.primary },
  saveDisabled: { opacity: 0.4 },
  done: {
    marginTop: 22,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  doneText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
