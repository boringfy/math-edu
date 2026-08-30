import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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
  onAdd: () => void;
  onClose: () => void;
}

export default function ProfilePicker({ visible, profiles, onPick, onAdd, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Stops a tap inside the card from closing it. */}
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Who's playing?</Text>

          <View style={styles.grid}>
            {profiles.profiles.map((profile: Profile) => {
              const playing = profile.id === profiles.activeId;
              return (
                <Pressable
                  key={profile.id}
                  style={[styles.kid, playing && styles.kidPlaying]}
                  accessibilityRole="button"
                  accessibilityLabel={playing ? `${profile.name}, playing` : `Switch to ${profile.name}`}
                  onPress={() => onPick(profile.id)}
                >
                  <Text style={styles.avatar}>{profile.avatar}</Text>
                  <Text style={styles.name} numberOfLines={1}>
                    {profile.name}
                  </Text>
                </Pressable>
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

          <Pressable
            style={styles.done}
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
          >
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  done: {
    marginTop: 22,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  doneText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
