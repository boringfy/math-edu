/**
 * Where downloaded content lives on the device, and when it is allowed to
 * change.
 *
 * Two fixed slots and a pointer saying which one is live:
 *
 *   slots/a/       one complete set of packs, plus its index
 *   slots/b/       the other
 *   pointer.json   { "active": "a" }
 *
 * Downloads always write to the slot that is NOT live, so the running app
 * reads a set nothing is touching. Promotion is a single small write to
 * `pointer.json` — no directory is moved, renamed or deleted underneath a
 * reader, and a crash half way through an update leaves the pointer still
 * naming the old slot, which is still complete.
 *
 * The flip only ever happens at cold start. A download that finishes
 * mid-quiz waits, so content cannot change under a child part-way through a
 * lesson, and there is no moment where the app holds half of two versions.
 *
 * Every pack is checked against the SHA-256 from the manifest before it is
 * written, so a truncated download or a mangled proxy response is caught
 * here rather than three screens later.
 */

import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

import { CacheIndex, PackDescriptor } from './contract';

const ROOT = 'content';
const INDEX = 'index.json';
const POINTER = 'pointer.json';

export type Slot = 'a' | 'b';

const root = (): Directory => new Directory(Paths.document, ROOT);
const slotDir = (slot: Slot): Directory => new Directory(Paths.document, ROOT, 'slots', slot);

function ensure(d: Directory): Directory {
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  return d;
}

function readJson<T>(file: File): T | null {
  try {
    return file.exists ? (JSON.parse(file.textSync()) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(file: File, value: unknown): void {
  file.create({ intermediates: true, overwrite: true });
  file.write(JSON.stringify(value));
}

export const sha256 = (text: string): Promise<string> =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);

/* -------------------------------------------------------------- pointer -- */

const pointerFile = (): File => new File(root(), POINTER);

export function activeSlot(): Slot {
  const p = readJson<{ active: Slot }>(pointerFile());
  return p?.active === 'b' ? 'b' : 'a';
}

/** The slot downloads go into: whichever one is not being read. */
export const stagingSlot = (): Slot => (activeSlot() === 'a' ? 'b' : 'a');

function setActive(slot: Slot): void {
  ensure(root());
  writeJson(pointerFile(), { active: slot });
}

/* ---------------------------------------------------------------- packs -- */

const indexFile = (slot: Slot): File => new File(slotDir(slot), INDEX);

export const readIndex = (slot: Slot): CacheIndex | null =>
  readJson<CacheIndex>(indexFile(slot));

export function writeIndex(slot: Slot, index: CacheIndex): void {
  ensure(slotDir(slot));
  writeJson(indexFile(slot), index);
}

/** Reads one cached pack body. Null if this slot never stored it. */
export const readPack = (slot: Slot, id: string): unknown | null =>
  readJson<unknown>(new File(slotDir(slot), `${id}.json`));

export const hasPack = (slot: Slot, id: string): boolean =>
  new File(slotDir(slot), `${id}.json`).exists;

/**
 * Verifies and stores one downloaded pack in the staging slot.
 *
 * The hash covers exactly the text that will later be parsed, so a pack that
 * survives this is one the app can trust — there is no separate "was it the
 * right file?" question left to ask.
 */
export async function stagePack(
  slot: Slot,
  descriptor: PackDescriptor,
  body: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const digest = await sha256(body);
  if (digest !== descriptor.sha256) {
    return { ok: false, reason: `sha256 mismatch (got ${digest.slice(0, 12)})` };
  }
  try {
    JSON.parse(body);
  } catch {
    return { ok: false, reason: 'not valid JSON' };
  }

  ensure(slotDir(slot));
  const file = new File(slotDir(slot), `${descriptor.id}.json`);
  file.create({ intermediates: true, overwrite: true });
  file.write(body);
  return { ok: true };
}

/**
 * Copies across whatever the staging slot is missing, so it holds a complete
 * set rather than only the packs that changed this time.
 */
export function carryOver(from: Slot, to: Slot, wanted: PackDescriptor[]): void {
  ensure(slotDir(to));
  if (!slotDir(from).exists) return;

  for (const descriptor of wanted) {
    const name = `${descriptor.id}.json`;
    if (new File(slotDir(to), name).exists) continue;
    const source = new File(slotDir(from), name);
    if (source.exists) source.copy(new File(slotDir(to), name), { overwrite: true });
  }
}

/**
 * Flips to the staged slot if it holds a complete, newer set. Cold start
 * only. Returns the slot now live.
 *
 * Most launches have nothing waiting and this is a couple of stat calls.
 */
export function promoteIfReady(): { promoted: boolean; slot: Slot } {
  const live = activeSlot();
  const staged = stagingSlot();

  const pending = readIndex(staged);
  if (!pending) return { promoted: false, slot: live };

  const current = readIndex(live);
  if (current && pending.manifestVersion <= current.manifestVersion) {
    return { promoted: false, slot: live };
  }

  // Refuse to activate a set with a hole in it.
  const missing = Object.values(pending.packs ?? {}).filter((d) => !hasPack(staged, d.id));
  if (missing.length > 0) return { promoted: false, slot: live };

  setActive(staged);
  return { promoted: true, slot: staged };
}

/** Throws away a partial staging slot, e.g. after a failed update. */
export function discardStaged(): void {
  const staged = slotDir(stagingSlot());
  if (staged.exists) staged.delete();
}
