/**
 * Buying the next lesson.
 *
 * Two gates stand in front of a lesson, and they do different jobs. The star
 * gate says "you have not finished the one before this", which is about
 * order. This one says "you have not earned it yet", which is about pace —
 * it gives the coins somewhere to go, and it gives a child who is rushing a
 * reason to go back and play something properly.
 *
 * The numbers are set so that holding two stars is enough to never be
 * stopped: over a level of ten, the worst two-star run pays 191 against a
 * cost of 180. The same run at one star pays 150, so a child scraping passes
 * falls behind. Being behind is not a wall — every lesson already passed can
 * be replayed for its coins again, minus the one-off first-clear bonus, and
 * one decent replay covers a lesson.
 *
 * Nothing is ever taken away. A lesson bought stays bought, which is what
 * lets this be stored as a plain list of ids and merged between devices by
 * union, the same way stars are.
 */

import { MapStop, ProgressMap, Subject } from '../types';
import { starsOn } from './mapProgress';

/** What a lesson costs when the pack does not say. Kept in step with rules.ts. */
export const DEFAULT_UNLOCK_COST = 18;

/**
 * Which maps charge, when the pack does not say.
 *
 * Reading is not one of them, and that is about reading rather than about
 * money: a story is a thing you sit down with, and putting a price on the
 * next one turns a child who wants to read into a child who has to earn it
 * first. Sums and puzzles are practice, and practice is what coins are for.
 */
export const DEFAULT_PAID_SUBJECTS: Subject[] = ['math', 'logic'];

export const chargesForLessons = (subject: Subject, paid = DEFAULT_PAID_SUBJECTS): boolean =>
  paid.includes(subject);

/** The lesson ids bought so far, per subject. Order is not meaningful. */
export type UnlockMap = Record<string, string[]>;

export const emptyUnlocks = (): UnlockMap => ({ math: [], reading: [], logic: [] });

export const isPaid = (subject: Subject, id: string, unlocks: UnlockMap): boolean =>
  (unlocks[subject] ?? []).includes(id);

/** Buying the same lesson twice would be a bug, so this is idempotent. */
export function withPaid(subject: Subject, id: string, unlocks: UnlockMap): UnlockMap {
  if (isPaid(subject, id, unlocks)) return unlocks;
  return { ...unlocks, [subject]: [...(unlocks[subject] ?? []), id] };
}

/** Union, so a lesson bought on either device stays bought on both. */
export function mergeUnlocks(a: UnlockMap, b: UnlockMap): UnlockMap {
  const out: UnlockMap = {};
  for (const subject of new Set([...Object.keys(a), ...Object.keys(b)])) {
    out[subject] = [...new Set([...(a[subject] ?? []), ...(b[subject] ?? [])])];
  }
  return out;
}

export type StopState =
  /** Passed at least once. Free to replay, for the coins. */
  | 'cleared'
  /** Bought and waiting to be played. */
  | 'open'
  /** The one before it is done; it costs coins to open. */
  | 'forSale'
  /** The one before it is not done yet. Coins cannot help. */
  | 'locked';

/**
 * Where a lesson stands.
 *
 * The very first lesson of a map is never for sale — a child opening the app
 * for the first time has no coins, and asking them to buy their way in would
 * be a wall on the front door.
 */
export function stopState(
  subject: Subject,
  stops: MapStop[],
  stop: MapStop,
  progress: ProgressMap,
  unlocks: UnlockMap,
  charges = true,
): StopState {
  if (starsOn(stop.id, progress) > 0) return 'cleared';
  if (stop.index === 1) return 'open';
  if (isPaid(subject, stop.id, unlocks)) return 'open';

  const before = stops[stop.index - 2];
  if (!before || starsOn(before.id, progress) === 0) return 'locked';
  // On a map that does not charge, passing the one before is the whole gate.
  return charges ? 'forSale' : 'open';
}

/** A lesson can be started when it is bought, or has been passed before. */
export const isPlayable = (state: StopState): boolean =>
  state === 'cleared' || state === 'open';

/**
 * Whether a lesson can actually be bought right now.
 *
 * The map only offers a buy button on a lesson that is for sale, so this is
 * belt and braces — but it guards the one thing that must never happen by
 * accident, which is taking a child's coins for something they do not get.
 */
export function canBuy(
  subject: Subject,
  stops: MapStop[],
  stop: MapStop,
  progress: ProgressMap,
  unlocks: UnlockMap,
  coins: number,
  cost: number,
  charges = true,
): boolean {
  return (
    coins >= cost &&
    stopState(subject, stops, stop, progress, unlocks, charges) === 'forSale'
  );
}
