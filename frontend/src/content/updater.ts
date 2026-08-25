/**
 * Deciding what to fetch, and fetching it.
 *
 * The rule this file exists to keep: a launch should cost nothing. Content
 * is already on the device, so the app opens from disk and only then asks
 * the server whether anything moved — behind a throttle, with an ETag, so
 * the usual answer is a 304 with an empty body.
 *
 * Nothing downloaded here is used by the running app. It goes into the
 * staging slot and waits for the next cold start.
 */

import {
  CacheIndex,
  Manifest,
  PackDescriptor,
  SCHEMA_VERSION,
} from './contract';
import {
  Slot,
  activeSlot,
  carryOver,
  discardStaged,
  readIndex,
  stagePack,
  stagingSlot,
  writeIndex,
} from './cache';

/** How long to leave the server alone after a successful check. */
export const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

const REQUEST_TIMEOUT_MS = 15_000;

export interface UpdaterConfig {
  /** Content host, e.g. "https://content.example.com". Empty disables updates. */
  baseUrl: string;
  /** This build's version, checked against each pack's minAppVersion. */
  appVersion: string;
  platform: 'android' | 'ios' | 'web';
}

/** "1.2.10" >= "1.2.9" — numeric per segment, not lexicographic. */
export function meetsVersion(app: string, required: string): boolean {
  const a = app.split('.').map((n) => parseInt(n, 10) || 0);
  const b = required.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const left = a[i] ?? 0;
    const right = b[i] ?? 0;
    if (left !== right) return left > right;
  }
  return true;
}

/**
 * Which packs are worth downloading.
 *
 * A pack is skipped when this build could not render it — either the schema
 * moved on, or the pack asks for an app newer than this one. That is the
 * mechanism that lets the server ship content for a newer client without
 * breaking an older one: the old app simply keeps what it has.
 */
export function packsToFetch(
  manifest: Manifest,
  have: CacheIndex | null,
  appVersion: string,
): PackDescriptor[] {
  return manifest.packs.filter((pack) => {
    if (pack.schemaVersion !== SCHEMA_VERSION) return false;
    if (!meetsVersion(appVersion, pack.minAppVersion)) return false;
    const current = have?.packs?.[pack.id];
    return !current || current.version < pack.version || current.sha256 !== pack.sha256;
  });
}

export const isThrottled = (index: CacheIndex | null, now: number): boolean => {
  if (!index?.checkedAt) return false;
  const last = Date.parse(index.checkedAt);
  return Number.isFinite(last) && now - last < CHECK_INTERVAL_MS;
};

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export type UpdateOutcome =
  | { status: 'disabled' }
  | { status: 'throttled' }
  | { status: 'unchanged' }
  | { status: 'failed'; reason: string }
  | { status: 'staged'; packs: number; slot: Slot; manifestVersion: number };

/**
 * Checks for new content and stages whatever is worth having.
 *
 * Never throws: an update is a nice-to-have, and a child with no signal must
 * still get the app they had yesterday. Every failure path leaves the active
 * slot exactly as it was.
 */
export async function checkForUpdate(
  config: UpdaterConfig,
  options: { force?: boolean; now?: number } = {},
): Promise<UpdateOutcome> {
  if (!config.baseUrl) return { status: 'disabled' };

  const live = activeSlot();
  const index = readIndex(live);
  const now = options.now ?? Date.now();
  if (!options.force && isThrottled(index, now)) return { status: 'throttled' };

  let manifest: Manifest;
  let etag: string | undefined;
  try {
    const url =
      `${config.baseUrl}/v1/manifest` +
      `?platform=${encodeURIComponent(config.platform)}` +
      `&appVersion=${encodeURIComponent(config.appVersion)}`;
    const response = await fetchWithTimeout(url, {
      headers: index?.etag ? { 'If-None-Match': index.etag } : undefined,
    });

    if (response.status === 304) {
      touch(live, index ?? emptyIndex(), now);
      return { status: 'unchanged' };
    }
    if (!response.ok) return { status: 'failed', reason: `manifest HTTP ${response.status}` };

    etag = response.headers.get('etag') ?? undefined;
    manifest = (await response.json()) as Manifest;
  } catch (error) {
    return { status: 'failed', reason: `manifest unreachable: ${String(error)}` };
  }

  const wanted = packsToFetch(manifest, index, config.appVersion);
  if (wanted.length === 0) {
    touch(live, { ...(index ?? emptyIndex()), etag }, now);
    return { status: 'unchanged' };
  }

  const staged = stagingSlot();
  // A previous half-finished attempt would otherwise be mistaken for part of
  // this one, and could promote a mix of two manifests.
  discardStaged();

  const stagedPacks: Record<string, PackDescriptor> = {};
  for (const pack of wanted) {
    try {
      const response = await fetchWithTimeout(`${config.baseUrl}${pack.url}`);
      if (!response.ok) {
        return { status: 'failed', reason: `${pack.id}: HTTP ${response.status}` };
      }
      const body = await response.text();
      const result = await stagePack(staged, pack, body);
      if (!result.ok) {
        discardStaged();
        return { status: 'failed', reason: `${pack.id}: ${result.reason}` };
      }
      stagedPacks[pack.id] = pack;
    } catch (error) {
      discardStaged();
      return { status: 'failed', reason: `${pack.id}: ${String(error)}` };
    }
  }

  // Everything this manifest names, whether it changed or not — the staging
  // slot has to be a complete set before it can ever be promoted.
  const keep = manifest.packs.filter(
    (p) => p.schemaVersion === SCHEMA_VERSION && meetsVersion(config.appVersion, p.minAppVersion),
  );
  carryOver(live, staged, keep);

  const carried: Record<string, PackDescriptor> = {};
  for (const pack of keep) {
    carried[pack.id] = stagedPacks[pack.id] ?? index?.packs?.[pack.id] ?? pack;
  }

  writeIndex(staged, {
    manifestVersion: manifest.manifestVersion,
    packs: carried,
    checkedAt: new Date(now).toISOString(),
    etag,
  });
  // The live slot records the check too, so a restart before promotion does
  // not immediately ask again.
  touch(live, { ...(index ?? emptyIndex()), etag }, now);

  return {
    status: 'staged',
    packs: wanted.length,
    slot: staged,
    manifestVersion: manifest.manifestVersion,
  };
}

const emptyIndex = (): CacheIndex => ({
  manifestVersion: 0,
  packs: {},
  checkedAt: new Date(0).toISOString(),
});

function touch(slot: Slot, index: CacheIndex, now: number): void {
  writeIndex(slot, { ...index, checkedAt: new Date(now).toISOString() });
}
