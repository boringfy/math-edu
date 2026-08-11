import { MapStop, ProgressMap, Stars } from '../types';

/**
 * Progress along a map, shared by the math lessons and the reading stories.
 * A map is an ordered list of stops; passing one opens the next.
 */

export const starsOn = (stopId: string, progress: ProgressMap): Stars =>
  progress[stopId]?.stars ?? 0;

/**
 * Stars for a first-pass score. One star is a pass, which is what unlocks the
 * next stop — deliberately gentle, so a wobbly run still moves the map on.
 */
export function starsFor(correctCount: number, total: number): Stars {
  if (total === 0) return 0;
  const percent = (correctCount / total) * 100;
  if (percent >= 100) return 3;
  if (percent >= 80) return 2;
  if (percent >= 50) return 1;
  return 0;
}

/** A stop is open once the one before it has been passed. */
export function isUnlocked(stops: MapStop[], stop: MapStop, progress: ProgressMap): boolean {
  if (stop.index === 1) return true;
  return starsOn(stops[stop.index - 2].id, progress) > 0;
}

/** The furthest stop the player can actually play, for the "Start" marker. */
export function currentStop(stops: MapStop[], progress: ProgressMap): MapStop {
  return (
    stops.find((s) => starsOn(s.id, progress) === 0 && isUnlocked(stops, s, progress)) ??
    stops[stops.length - 1]
  );
}

export function starsEarned(stops: MapStop[], progress: ProgressMap): number {
  return stops.reduce((sum, s) => sum + starsOn(s.id, progress), 0);
}
