/**
 * Making a child's progress small enough to back up for ever.
 *
 * The server takes one JSON blob per account and refuses anything over
 * 256 KiB. That was fine when a map was sixty lessons; it is not fine now
 * that levels do not stop. Measured, with the plain shape: two children at
 * level 50 come to 227 KiB and two at level 100 come to 429 KiB — at which
 * point every backup silently stops working and nobody is told.
 *
 * Two things were paying for that, and neither had to.
 *
 * A composed lesson stored a full record — `{stars, bestPercent, clearedAt}`
 * under a fifteen-character id — about 82 bytes for what is really a number
 * from 0 to 3. `bestPercent` and `clearedAt` are written by the app and read
 * by nothing: no screen shows either. So on the wire the composed half of the
 * map becomes one digit per lesson, ten to a level.
 *
 * And every lesson ever bought stayed in the purchase list for good, though
 * `stopState` checks "already passed" before it checks "already bought" — so
 * a purchase for a lesson with a star on it can never be consulted again.
 * Only the frontier is worth keeping.
 *
 * The authored sixty keep their full records. They are bounded, they are what
 * a child has had since the beginning, and there is no reason to degrade them
 * to save bytes that are not growing.
 *
 * None of this touches what is stored on the device, which has no such cap.
 * It is a wire format, applied on the way out and undone on the way in.
 */

import { parseComposedId } from './endless';
import { ProgressMap, Stars, StopProgress, Subject } from '../types';
import { UnlockMap } from './unlocks';

/**
 * Composed stars, packed: `{ "math.g2": { "7": "2310231023" } }` — one digit
 * per lesson, in map order, ten to a level. A lesson not played is a zero,
 * which is also what "no stars" means, so nothing needs a gap marker.
 */
export type PackedProgress = Record<string, Record<string, string>>;

const LESSONS_PER_LEVEL = 10;

/** Stars a packed digit stands for. Anything unreadable counts as unplayed. */
const starsOf = (digit: string): Stars => {
  const n = Number(digit);
  return n === 1 || n === 2 || n === 3 ? (n as Stars) : 0;
};

/**
 * The percentage a star rating implies, for the record rebuilt on the way
 * back in. It is not the score the child actually got — that was not kept,
 * because nothing reads it — but it is consistent with the stars, which is
 * what any later merge compares.
 */
const percentFor = (stars: Stars): number => (stars === 3 ? 100 : stars === 2 ? 80 : stars === 1 ? 50 : 0);

export interface EncodedProgress {
  /** The authored lessons, unchanged. */
  progress: ProgressMap;
  /** Everything past them, as digits. */
  packed: PackedProgress;
}

/** Splits a map's progress into the part that is bounded and the part that is not. */
export function packProgress(progress: ProgressMap): EncodedProgress {
  const authored: ProgressMap = {};
  const levels = new Map<string, Map<number, Stars[]>>();

  for (const [id, stop] of Object.entries(progress)) {
    const parsed = parseComposedId(id);
    if (!parsed) {
      authored[id] = stop;
      continue;
    }
    const group = `${parsed.subject}.g${parsed.grade}`;
    const byLevel = levels.get(group) ?? new Map<number, Stars[]>();
    const row = byLevel.get(parsed.level) ?? Array.from({ length: LESSONS_PER_LEVEL }, () => 0 as Stars);
    // Positions are 1-based and a level is always ten, so a lesson outside
    // that is not one this format can describe — better dropped than wrong.
    if (parsed.position >= 1 && parsed.position <= LESSONS_PER_LEVEL) {
      row[parsed.position - 1] = stop.stars;
    }
    byLevel.set(parsed.level, row);
    levels.set(group, byLevel);
  }

  const packed: PackedProgress = {};
  for (const [group, byLevel] of levels) {
    const rows: Record<string, string> = {};
    for (const [level, row] of byLevel) {
      const digits = row.join('');
      // A level nobody has scored on says nothing worth sending.
      if (digits !== '0'.repeat(LESSONS_PER_LEVEL)) rows[String(level)] = digits;
    }
    if (Object.keys(rows).length > 0) packed[group] = rows;
  }

  return { progress: authored, packed };
}

/** Puts the digits back, so the rest of the app never sees this format. */
export function unpackProgress(
  progress: ProgressMap,
  packed: PackedProgress | undefined,
  subject: Subject,
): ProgressMap {
  const out: ProgressMap = { ...progress };
  if (!packed) return out;

  for (const [group, rows] of Object.entries(packed)) {
    if (!group.startsWith(`${subject}.`)) continue;
    for (const [level, digits] of Object.entries(rows)) {
      if (typeof digits !== 'string') continue;
      for (let i = 0; i < Math.min(digits.length, LESSONS_PER_LEVEL); i++) {
        const stars = starsOf(digits[i]);
        if (stars === 0) continue;
        const id = `${group}.L${level}.l${i + 1}`;
        const rebuilt: StopProgress = {
          stars,
          bestPercent: percentFor(stars),
          clearedAt: '',
        };
        // Anything already here came off this device and knows more.
        out[id] = out[id] ?? rebuilt;
      }
    }
  }
  return out;
}

/**
 * The purchases still worth remembering.
 *
 * `stopState` returns 'cleared' before it ever looks at the purchase list, so
 * a lesson with a star on it can never consult it again. What is left is the
 * frontier: bought, not yet passed — usually one lesson, occasionally a few.
 */
export function pruneUnlocks(
  unlocks: UnlockMap,
  progress: Record<Subject, ProgressMap>,
): UnlockMap {
  const out: UnlockMap = {};
  for (const [subject, ids] of Object.entries(unlocks)) {
    const done = progress[subject as Subject] ?? {};
    out[subject] = (ids ?? []).filter((id) => (done[id]?.stars ?? 0) === 0);
  }
  return out;
}
