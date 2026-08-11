import { Pressable, StyleSheet, Text, View } from 'react-native';
import { currentStop, isUnlocked, starsOn } from '../lib/mapProgress';
import { colors } from '../theme';
import { MapStop, ProgressMap } from '../types';

/**
 * Horizontal nudges that turn the column of stops into a winding trail.
 * The cycle is four long so the path sweeps right, back, left and back again.
 */
const OFFSETS = [0, 58, 0, -58];
const offsetOf = (index: number) => OFFSETS[index % OFFSETS.length];

interface Props<T extends MapStop> {
  stops: T[];
  progress: ProgressMap;
  /** The two small lines under each title, e.g. topics and question count. */
  meta: (stop: T) => [string, string];
  onStart: (stop: T) => void;
}

/** A grade's map as a trail: cleared stops, then the current one, then locked. */
export default function MapTrail<T extends MapStop>({ stops, progress, meta, onStart }: Props<T>) {
  const current = currentStop(stops, progress);

  return (
    <View style={styles.map}>
      {stops.map((stop, i) => {
        const unlocked = isUnlocked(stops, stop, progress);
        const stars = starsOn(stop.id, progress);
        const isCurrent = stop.id === current.id && unlocked;
        const offset = offsetOf(i);
        const [topLine, bottomLine] = meta(stop);

        return (
          <View key={stop.id}>
            {i > 0 && (
              <View
                style={[
                  styles.connector,
                  { transform: [{ translateX: (offsetOf(i - 1) + offset) / 2 }] },
                ]}
              >
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={styles.dot} />
              </View>
            )}

            <Pressable
              disabled={!unlocked}
              onPress={() => onStart(stop)}
              style={[styles.row, { transform: [{ translateX: offset }] }]}
            >
              <View
                style={[
                  styles.node,
                  stars > 0 && styles.nodeCleared,
                  isCurrent && styles.nodeCurrent,
                  !unlocked && styles.nodeLocked,
                ]}
              >
                <Text style={[styles.icon, !unlocked && styles.lockedText]}>
                  {unlocked ? stop.icon : '🔒'}
                </Text>
                <View style={styles.numberBadge}>
                  <Text style={styles.numberBadgeText}>{stop.index}</Text>
                </View>
              </View>

              <Text style={[styles.title, !unlocked && styles.lockedText]} numberOfLines={2}>
                {stop.title}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {topLine}
              </Text>
              <Text style={styles.meta}>{bottomLine}</Text>

              {stars > 0 ? (
                <Text style={styles.stars}>
                  {'★'.repeat(stars)}
                  <Text style={styles.starsEmpty}>{'★'.repeat(3 - stars)}</Text>
                </Text>
              ) : isCurrent ? (
                <View style={styles.startPill}>
                  <Text style={styles.startPillText}>START</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { alignItems: 'center', marginTop: 8 },
  connector: { alignItems: 'center', gap: 5, paddingVertical: 8 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.border },
  row: { alignItems: 'center', width: 170 },
  node: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.card,
    borderWidth: 3,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCleared: { borderColor: colors.correct, backgroundColor: colors.correctBg },
  // The one to play next: a filled ring so it reads as the target at a glance.
  nodeCurrent: {
    borderColor: colors.primary,
    backgroundColor: '#edf0fe',
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  nodeLocked: { backgroundColor: '#eef0f6', borderColor: colors.border },
  icon: { fontSize: 30 },
  numberBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  title: { fontSize: 14, fontWeight: '700', color: colors.text, textAlign: 'center', marginTop: 8 },
  meta: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 2 },
  lockedText: { color: colors.textMuted, opacity: 0.7 },
  stars: { fontSize: 18, color: '#f5b700', marginTop: 4, letterSpacing: 1 },
  starsEmpty: { color: colors.border },
  startPill: {
    marginTop: 6,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  startPillText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
});
