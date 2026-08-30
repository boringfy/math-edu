import { useRef } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { currentStop, isUnlocked, starsOn } from '../lib/mapProgress';
import { UnlockMap, isPlayable, stopState } from '../lib/unlocks';
import { colors } from '../theme';
import { MapStop, ProgressMap, Subject } from '../types';

/**
 * Horizontal nudges that turn the column of stops into a winding trail.
 * The cycle is four long so the path sweeps right, back, left and back again.
 */
const OFFSETS = [0, 58, 0, -58];
const offsetOf = (index: number) => OFFSETS[index % OFFSETS.length];

interface Props<T extends MapStop> {
  /** The stops to draw — one level's worth, not the whole map. */
  stops: T[];
  /**
   * Every stop up to and including those, when `stops` is only a window.
   *
   * Unlocking looks at the stop before, and the first stop of a level sits
   * behind the last stop of the one before it — which is not in the window.
   * Defaults to the window, which is right when the whole map is shown.
   */
  allStops?: T[];
  progress: ProgressMap;
  /** The two small lines under each title, e.g. topics and question count. */
  meta: (stop: T) => [string, string];
  onStart: (stop: T) => void;
  /**
   * Buying the next lesson. Omitted on maps that are not for sale, in which
   * case the star gate alone decides what can be played.
   */
  unlocks?: UnlockMap;
  subject?: Subject;
  coins?: number;
  unlockCost?: number;
  /** False on a map whose lessons are free, such as reading. */
  charges?: boolean;
  onUnlock?: (stop: T) => void;
  /**
   * Where the current stop sits, measured from the top of the trail's own
   * parent, so the screen around it can scroll straight to it.
   */
  onCurrentOffset?: (y: number) => void;
}

/** A grade's map as a trail: cleared stops, then the current one, then locked. */
export default function MapTrail<T extends MapStop>({
  stops,
  allStops,
  progress,
  meta,
  onStart,
  unlocks,
  subject,
  coins = 0,
  unlockCost = 0,
  charges = true,
  onUnlock,
  onCurrentOffset,
}: Props<T>) {
  const scope = allStops ?? stops;
  const current = currentStop(scope, progress);
  const forSale = unlocks !== undefined && subject !== undefined && onUnlock !== undefined;

  // The trail's own offset and the current stop's offset within it arrive in
  // separate layout events, so both are kept until the pair can be added up.
  const trailY = useRef<number | null>(null);
  const stopY = useRef<number | null>(null);
  const report = () => {
    if (onCurrentOffset && trailY.current !== null && stopY.current !== null) {
      onCurrentOffset(trailY.current + stopY.current);
    }
  };
  const onTrailLayout = (e: LayoutChangeEvent) => {
    trailY.current = e.nativeEvent.layout.y;
    report();
  };
  const onStopLayout = (e: LayoutChangeEvent) => {
    stopY.current = e.nativeEvent.layout.y;
    report();
  };

  return (
    <View style={styles.map} onLayout={onTrailLayout}>
      {stops.map((stop, i) => {
        const state = forSale
          ? stopState(subject, scope, stop, progress, unlocks, charges)
          : isUnlocked(scope, stop, progress)
            ? 'open'
            : 'locked';
        const unlocked = isPlayable(state);
        const sale = state === 'forSale';
        const affordable = coins >= unlockCost;
        const stars = starsOn(stop.id, progress);
        // A lesson waiting to be bought is still where the child is up to, so
        // it keeps the ring and the scroll-to — it just shows a price instead
        // of a START. Without this the map has no focus point at all whenever
        // the purse is the thing standing in the way.
        const isCurrent = stop.id === current.id && (unlocked || sale);
        // Wound from the stop's place on the whole map, so a level does not
        // restart the sweep and the trail reads as one continuous path.
        const offset = offsetOf(stop.index - 1);
        const [topLine, bottomLine] = meta(stop);

        return (
          <View key={stop.id} onLayout={isCurrent ? onStopLayout : undefined}>
            {i > 0 && (
              <View
                style={[
                  styles.connector,
                  { transform: [{ translateX: (offsetOf(stop.index - 2) + offset) / 2 }] },
                ]}
              >
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={styles.dot} />
              </View>
            )}

            <Pressable
              disabled={!unlocked && !sale}
              accessibilityRole="button"
              accessibilityLabel={
                sale
                  ? `Unlock ${stop.title} for ${unlockCost} coins`
                  : unlocked
                    ? `Play ${stop.title}`
                    : `${stop.title}, locked`
              }
              onPress={() => (sale ? onUnlock?.(stop) : onStart(stop))}
              style={[styles.row, { transform: [{ translateX: offset }] }]}
            >
              <View
                style={[
                  styles.node,
                  stars > 0 && styles.nodeCleared,
                  isCurrent && styles.nodeCurrent,
                  !unlocked && styles.nodeLocked,
                  sale && affordable && styles.nodeForSale,
                ]}
              >
                <Text style={[styles.icon, !unlocked && !sale && styles.lockedText]}>
                  {unlocked ? stop.icon : sale ? '🪙' : '🔒'}
                </Text>
                <View style={styles.numberBadge}>
                  <Text style={styles.numberBadgeText}>{stop.index}</Text>
                </View>
              </View>

              <Text
                style={[styles.title, !unlocked && !sale && styles.lockedText]}
                numberOfLines={2}
              >
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
              ) : sale ? (
                /*
                  The price is shown whether or not it can be paid. A child
                  who is short should be able to see what they are aiming
                  for — hiding it would just read as another locked door.
                */
                <View style={[styles.buyPill, !affordable && styles.buyPillShort]}>
                  <Text style={[styles.buyPillText, !affordable && styles.buyPillTextShort]}>
                    🪙 {unlockCost}
                  </Text>
                </View>
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
  // For sale and affordable: warm rather than grey, so it reads as a thing
  // to reach for rather than a thing that is shut.
  nodeForSale: { backgroundColor: '#fff8e1', borderColor: '#f5b700' },
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
  buyPill: {
    marginTop: 6,
    backgroundColor: '#f5b700',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  buyPillText: { color: '#4a3600', fontSize: 12, fontWeight: '800' },
  buyPillShort: { backgroundColor: '#eef0f6' },
  buyPillTextShort: { color: colors.textMuted },
});
