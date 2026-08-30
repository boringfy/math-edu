/**
 * Progress backup and cross-device sync.
 *
 * The device is always the source of truth for play; the server holds a
 * revisioned copy so a new device can pick the same account up. Everything
 * here is fire-and-forget: a failed push just stays dirty for next time, a
 * conflict is merged field by field and pushed again, and nothing a child is
 * doing ever waits on a request.
 *
 * The merge rules are the heart of it, and they are all "nobody loses
 * anything a child earned": stars and coins merge by max, histories by
 * union, unlocked question types by union; only preferences (settings,
 * grades, tiers) go to whichever side changed most recently.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LinkGoogleResponse, Profile, ProfileEnvelope } from '../content/contract';
import { PROFILE_SCHEMA_VERSION } from '../content/contract';
import {
  DailyState,
  Grade,
  ProgressMap,
  QuizResult,
  Settings,
  StopProgress,
  Subject,
  Tier,
} from '../types';
import { AdaptiveStore } from './adaptive';
import { Profile as Kid, ProfileStore, emptyProfiles, settle } from './profiles';
import { UnlockMap, emptyUnlocks, mergeUnlocks } from './unlocks';
import {
  Identity,
  SYNC_URL,
  authHeader,
  ensureRegistered,
  fetchWithTimeout,
  saveIdentity,
  syncAvailable,
} from './identity';
import {
  currentProfile,
  loadAdaptive,
  loadProfiles,
  loadUnlocks,
  loadCoins,
  loadDaily,
  loadGrades,
  loadHistory,
  loadProgress,
  loadSettings,
  loadTier,
  saveAdaptive,
  saveProfiles,
  saveUnlocks,
  useProfile,
  saveCoins,
  saveDaily,
  saveGrades,
  saveHistoryList,
  saveProgressMap,
  saveSettings,
  saveTier,
} from './storage';

const GRADES: Grade[] = [1, 2, 3, 4, 5];

/** Everything that travels. Cursors stay home — pool positions are per-device. */
export interface ProfileData {
  grades: Record<Subject, Grade>;
  tiers: Record<Grade, Tier>;
  coins: number;
  progress: Record<Subject, ProgressMap>;
  history: QuizResult[];
  daily: DailyState | null;
  settings: Settings;
  adaptive: AdaptiveStore;
  /**
   * Lessons bought, so a restored device does not have to buy them twice.
   * Optional: a blob written before lessons had a price does not carry it.
   */
  unlocks?: UnlockMap;
}

/* -------------------------------------------------------------- snapshot -- */

/**
 * Everything on this device, for every child.
 *
 * The blob used to be one child's world, which was fine when a device held
 * one. It cannot stay that way: a push made while Theo is playing would
 * replace Mia's backup with his, and the next device to pull would find her
 * year of stars gone. So the wire carries all of them, keyed by profile.
 */
export interface DeviceData {
  profiles: ProfileStore;
  kids: Record<string, ProfileData>;
}

/**
 * Reads a blob off the wire as a device.
 *
 * A blob written before children had profiles is one child's data with no
 * `kids` in it. Rather than drop it — which would be somebody's whole
 * history — it is treated as belonging to whoever is playing here, which is
 * exactly who it was written by.
 */
export function asDevice(raw: unknown, forProfile = currentProfile()): DeviceData {
  const blob = raw as Partial<DeviceData> & Partial<ProfileData>;
  if (blob && typeof blob === 'object' && blob.kids) {
    return {
      profiles: blob.profiles ?? emptyProfiles(),
      kids: blob.kids,
    };
  }
  return {
    profiles: emptyProfiles(),
    kids: forProfile ? { [forProfile]: raw as ProfileData } : {},
  };
}

export async function snapshotDevice(): Promise<DeviceData> {
  const store = await loadProfiles();
  const playing = currentProfile();

  // A device that has not been through the migration yet has no profiles at
  // all, and its data sits on the un-prefixed keys. Snapshotting nothing
  // would push an empty backup over a real one, so it is read as the one
  // nameless child it effectively is.
  const ids = store.profiles.length > 0 ? store.profiles.map((p) => p.id) : [playing];

  const kids: Record<string, ProfileData> = {};
  try {
    for (const id of ids) {
      useProfile(id);
      kids[id] = await snapshotProfile();
    }
  } finally {
    // Whatever happens, storage is left pointing where it was found.
    useProfile(playing);
  }
  return { profiles: store, kids };
}

export async function applyDevice(data: DeviceData): Promise<void> {
  const playing = currentProfile();
  try {
    for (const [id, kid] of Object.entries(data.kids ?? {})) {
      useProfile(id);
      await applyProfile(kid);
    }
  } finally {
    useProfile(playing);
  }
  if (data.profiles?.profiles?.length) await saveProfiles(settle(data.profiles));
}

/**
 * Merges two devices, child by child.
 *
 * A child either side has met is kept — a profile is never deleted by a sync,
 * because the alternative is one device quietly undoing a family's setup. The
 * data for a child both have seen merges by the same rules as ever.
 */
export function mergeDevices(
  local: { updatedAt: string; data: DeviceData },
  remote: { updatedAt: string; data: DeviceData },
): DeviceData {
  const ids = new Set([
    ...Object.keys(local.data.kids ?? {}),
    ...Object.keys(remote.data.kids ?? {}),
  ]);

  const kids: Record<string, ProfileData> = {};
  for (const id of ids) {
    const mine = local.data.kids?.[id];
    const theirs = remote.data.kids?.[id];
    if (mine && theirs) {
      kids[id] = mergeProfiles({ ...local, data: mine }, { ...remote, data: theirs });
    } else {
      kids[id] = (mine ?? theirs) as ProfileData;
    }
  }

  const byId = new Map<string, Kid>();
  for (const profile of [
    ...(remote.data.profiles?.profiles ?? []),
    ...(local.data.profiles?.profiles ?? []),
  ]) {
    byId.set(profile.id, profile);
  }
  // Whoever is playing here stays playing here; a sync is not a hand-over.
  const activeId = local.data.profiles?.activeId ?? remote.data.profiles?.activeId ?? '';

  return { profiles: settle({ profiles: [...byId.values()], activeId }), kids };
}

export async function snapshotProfile(): Promise<ProfileData> {
  const tiers = await Promise.all(GRADES.map((g) => loadTier(g)));
  return {
    grades: await loadGrades(),
    tiers: { 1: tiers[0], 2: tiers[1], 3: tiers[2], 4: tiers[3], 5: tiers[4] },
    coins: await loadCoins(),
    progress: {
      math: await loadProgress('math'),
      reading: await loadProgress('reading'),
      logic: await loadProgress('logic'),
    },
    history: await loadHistory(),
    daily: await loadDaily(),
    settings: await loadSettings(),
    adaptive: await loadAdaptive(),
    unlocks: await loadUnlocks(),
  };
}

export async function applyProfile(data: ProfileData): Promise<void> {
  await saveGrades(data.grades);
  for (const grade of GRADES) await saveTier(grade, data.tiers[grade]);
  await saveCoins(data.coins);
  for (const subject of ['math', 'reading', 'logic'] as Subject[]) {
    await saveProgressMap(subject, data.progress[subject]);
  }
  await saveHistoryList(data.history);
  if (data.daily) await saveDaily(data.daily);
  await saveSettings(data.settings);
  await saveAdaptive(data.adaptive);
  await saveUnlocks(data.unlocks ?? emptyUnlocks());
}

/* ----------------------------------------------------------------- merge -- */

const mergeStop = (a: StopProgress, b: StopProgress): StopProgress => ({
  stars: Math.max(a.stars, b.stars) as StopProgress['stars'],
  bestPercent: Math.max(a.bestPercent, b.bestPercent),
  // The first clear is the fact worth keeping; later clears change nothing.
  clearedAt: a.clearedAt <= b.clearedAt ? a.clearedAt : b.clearedAt,
});

function mergeMaps(a: ProgressMap, b: ProgressMap): ProgressMap {
  const merged: ProgressMap = { ...a };
  for (const [stopId, stop] of Object.entries(b)) {
    merged[stopId] = merged[stopId] ? mergeStop(merged[stopId], stop) : stop;
  }
  return merged;
}

/**
 * Two devices' profiles into one. `updatedAt` on each side is when that side
 * last changed anything, and settles only the preference-shaped fields;
 * everything earned merges so that neither side's work is lost.
 */
export function mergeProfiles(
  local: { updatedAt: string; data: ProfileData },
  remote: { updatedAt: string; data: ProfileData },
): ProfileData {
  const newer = Date.parse(local.updatedAt) >= Date.parse(remote.updatedAt) ? local.data : remote.data;

  const history = [...local.data.history];
  const seen = new Set(history.map((r) => r.id));
  for (const result of remote.data.history) {
    if (!seen.has(result.id)) history.push(result);
  }
  history.sort((a, b) => (a.date < b.date ? 1 : -1));

  const adaptive: AdaptiveStore = { ...remote.data.adaptive };
  for (const [key, state] of Object.entries(local.data.adaptive)) {
    const other = adaptive[key];
    if (!other) {
      adaptive[key] = state;
      continue;
    }
    const winner = Date.parse(state.updatedAt) >= Date.parse(other.updatedAt) ? state : other;
    const loser = winner === state ? other : state;
    adaptive[key] = {
      ...winner,
      // A type unlocked anywhere stays unlocked everywhere.
      unlocked: [...winner.unlocked, ...loser.unlocked.filter((t) => !winner.unlocked.includes(t))],
      topics: { ...loser.topics, ...winner.topics },
    };
  }

  const dailyNewer =
    !local.data.daily || (remote.data.daily && remote.data.daily.date > local.data.daily.date)
      ? remote.data.daily
      : local.data.daily && remote.data.daily && local.data.daily.date === remote.data.daily.date
        ? newer.daily
        : local.data.daily;

  return {
    grades: newer.grades,
    tiers: newer.tiers,
    coins: Math.max(local.data.coins, remote.data.coins),
    progress: {
      math: mergeMaps(local.data.progress.math, remote.data.progress.math),
      reading: mergeMaps(local.data.progress.reading, remote.data.progress.reading),
      logic: mergeMaps(local.data.progress.logic, remote.data.progress.logic),
    },
    history: history.slice(0, 50),
    daily: dailyNewer ?? null,
    settings: newer.settings,
    adaptive,
    // Union, like stars: a purchase on either device is a purchase.
    unlocks: mergeUnlocks(local.data.unlocks ?? emptyUnlocks(), remote.data.unlocks ?? emptyUnlocks()),
  };
}

/* ------------------------------------------------------------------ meta -- */

const META_KEY = 'mathquiz:syncmeta';

export interface SyncMeta {
  dirty: boolean;
  /** The server revision this device last saw; 0 before the first sync. */
  lastRevision: number;
  lastSyncedAt: string | null;
  /** When this device last changed anything, for the merge's latest-wins. */
  changedAt: string | null;
}

const FRESH_META: SyncMeta = { dirty: false, lastRevision: 0, lastSyncedAt: null, changedAt: null };

export async function loadSyncMeta(): Promise<SyncMeta> {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    return raw ? { ...FRESH_META, ...(JSON.parse(raw) as Partial<SyncMeta>) } : FRESH_META;
  } catch {
    return FRESH_META;
  }
}

async function saveSyncMeta(meta: SyncMeta): Promise<void> {
  try {
    await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // Sync state is reconstructible; losing it costs one extra round trip.
  }
}

/* ------------------------------------------------------------------ push -- */

const PUSH_DELAY_MS = 5_000;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

/** Records that there is something new to back up, and when it happened. */
export async function markDirtyNow(): Promise<void> {
  const meta = await loadSyncMeta();
  await saveSyncMeta({ ...meta, dirty: true, changedAt: new Date().toISOString() });
}

/**
 * Notes that something worth backing up changed, and schedules a push a few
 * quiet seconds later. Safe to call as often as saving happens — a burst of
 * saves at the end of a round collapses into one upload.
 */
export function markDirty(): void {
  if (!syncAvailable()) return;
  void markDirtyNow();
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushNow();
  }, PUSH_DELAY_MS);
}

/** Drops a scheduled push. For teardown — the app itself never cancels one. */
export function cancelScheduledPush(): void {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
}

const wrap = (data: DeviceData, updatedAt: string): Profile => ({
  schemaVersion: PROFILE_SCHEMA_VERSION,
  updatedAt,
  data: data as unknown as Record<string, unknown>,
});

async function putProfile(
  identity: Identity,
  baseRevision: number,
  profile: Profile,
): Promise<Response> {
  return fetchWithTimeout(`${SYNC_URL}/v1/profile`, {
    method: 'PUT',
    headers: { authorization: authHeader(identity), 'content-type': 'application/json' },
    body: JSON.stringify({ baseRevision, profile }),
  });
}

/**
 * Pushes the current state, merging first if another device wrote in the
 * meantime. Every failure path simply leaves the profile dirty.
 */
export async function pushNow(): Promise<boolean> {
  const identity = await ensureRegistered();
  if (!identity) return false;

  try {
    const meta = await loadSyncMeta();
    const changedAt = meta.changedAt ?? new Date().toISOString();
    const local = await snapshotDevice();

    let response = await putProfile(identity, meta.lastRevision, wrap(local, changedAt));

    if (response.status === 409) {
      const server = (await response.json()) as { revision: number; profile: Profile | null };
      const merged = server.profile
        ? mergeDevices(
            { updatedAt: changedAt, data: local },
            { updatedAt: server.profile.updatedAt, data: asDevice(server.profile.data) },
          )
        : local;
      await applyDevice(merged);
      response = await putProfile(identity, server.revision, wrap(merged, new Date().toISOString()));
    }

    if (!response.ok) return false;
    const body = (await response.json()) as { revision: number };
    await saveSyncMeta({
      dirty: false,
      lastRevision: body.revision,
      lastSyncedAt: new Date().toISOString(),
      changedAt: meta.changedAt,
    });
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ link -- */

/**
 * Finishes an account link, given the ID token a Google sign-in produced.
 *
 * The server answers with the canonical identity for that Google account —
 * this device's own when it linked first, another device's when it did not —
 * plus that identity's stored profile. Either way the identity is replaced,
 * the profiles are merged so nothing either device earned is lost, and the
 * result is pushed as the account's new copy.
 */
export async function linkWithGoogle(
  idToken: string,
): Promise<{ status: 'linked' | 'merged'; profile: ProfileData } | { status: 'failed' }> {
  const identity = await ensureRegistered();
  if (!identity) return { status: 'failed' };

  try {
    const response = await fetchWithTimeout(`${SYNC_URL}/v1/link/google`, {
      method: 'POST',
      headers: { authorization: authHeader(identity), 'content-type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!response.ok) return { status: 'failed' };
    const body = (await response.json()) as LinkGoogleResponse;

    await saveIdentity({
      userId: body.userId,
      secret: body.secret,
      provider: 'google',
      linkedAt: new Date().toISOString(),
    });

    const meta = await loadSyncMeta();
    const local = await snapshotDevice();
    const merged = body.serverProfile
      ? mergeDevices(
          { updatedAt: meta.changedAt ?? '1970-01-01T00:00:00.000Z', data: local },
          {
            updatedAt: body.serverProfile.profile.updatedAt,
            data: asDevice(body.serverProfile.profile.data),
          },
        )
      : local;

    await applyDevice(merged);
    await saveSyncMeta({
      dirty: true,
      lastRevision: body.serverProfile?.revision ?? 0,
      lastSyncedAt: meta.lastSyncedAt,
      changedAt: new Date().toISOString(),
    });
    void pushNow();
    return {
      status: body.alreadyLinked ? 'merged' : 'linked',
      profile: merged.kids[currentProfile()] ?? null,
    };
  } catch {
    return { status: 'failed' };
  }
}

/* ------------------------------------------------------------------ pull -- */

/**
 * Launch-time sync: fetches the server copy, merges it into what this device
 * has, stores the result, and hands it back for the app's state. Null means
 * nothing changed locally — offline, sync off, or no server copy yet.
 */
export async function pullAndMerge(): Promise<ProfileData | null> {
  const identity = await ensureRegistered();
  if (!identity) return null;

  try {
    const response = await fetchWithTimeout(`${SYNC_URL}/v1/profile`, {
      headers: { authorization: authHeader(identity) },
    });

    if (response.status === 404) {
      // Never backed up: this device's state is the account's first copy.
      void pushNow();
      return null;
    }
    if (!response.ok) return null;

    const server = (await response.json()) as ProfileEnvelope;
    const meta = await loadSyncMeta();
    const local = await snapshotDevice();
    const merged = mergeDevices(
      { updatedAt: meta.changedAt ?? '1970-01-01T00:00:00.000Z', data: local },
      { updatedAt: server.profile.updatedAt, data: asDevice(server.profile.data) },
    );

    await applyDevice(merged);
    await saveSyncMeta({ ...meta, lastRevision: server.revision });
    // Whatever this device had that the server did not, it should now learn.
    void pushNow();
    // The app only wants the child in front of it.
    return merged.kids[currentProfile()] ?? null;
  } catch {
    return null;
  }
}
