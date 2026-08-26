/**
 * Booting the content layer, and keeping it fed.
 *
 * The shape of a launch:
 *
 *   1. promote whatever finished downloading last time  (a pointer write)
 *   2. build a library over the now-live slot           (nothing parsed yet)
 *   3. render                                            <- the app is usable here
 *   4. later, in the background, ask if anything moved
 *
 * Step 3 does not wait for step 4, and step 4 cannot affect step 3. That is
 * the whole design: the app opens from disk at disk speed, and the network
 * is something that happens to the *next* launch.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { PackId } from './contract';
import { Slot, activeSlot, promoteIfReady, readIndex, readPack, updateWaiting } from './cache';
import { Library } from './library';
import { SEED_PACKS } from './seed';
import { UpdateOutcome, UpdaterConfig, checkForUpdate } from './updater';

export * from './library';
export { CHECK_INTERVAL_MS } from './updater';
export type { UpdateOutcome } from './updater';

/**
 * Where content is served from. Set `EXPO_PUBLIC_CONTENT_URL` at build time;
 * with it unset the app runs entirely on the packs in the binary, which is
 * what the test suite and a first offline launch both do.
 */
export const CONTENT_URL = process.env.EXPO_PUBLIC_CONTENT_URL ?? '';

/** Remembered from boot, so the settings page can show what went wrong. */
let lastBootError: string | null = null;
let lastBootSlot = '?';
let lastBootPromoted = false;

const APP_VERSION = process.env.EXPO_PUBLIC_APP_VERSION ?? '1.0.0';

export const updaterConfig = (): UpdaterConfig => ({
  baseUrl: CONTENT_URL,
  appVersion: APP_VERSION,
  platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
});

export interface Boot {
  library: Library;
  slot: Slot;
  /** True when a staged update was activated by this launch. */
  promoted: boolean;
  /**
   * Why promotion failed, if it did.
   *
   * Swallowing this was a mistake once already: an update downloaded, staged
   * and verified, then silently failed to activate, and from the outside that
   * was indistinguishable from no update existing.
   */
  error: string | null;
}

/**
 * Cold start. Cheap by construction: a pointer read, maybe a pointer write,
 * and a Library that has not opened a single pack yet.
 */
export function boot(): Boot {
  let promoted = false;
  let error: string | null = null;
  let slot: Slot;
  try {
    const result = promoteIfReady();
    promoted = result.promoted;
    slot = result.slot;
  } catch (caught) {
    // A damaged cache must not stop the app booting on bundled content — but
    // it must not do so quietly either.
    promoted = false;
    error = String(caught);
    slot = activeSlot();
  }

  const fromDisk = (id: PackId): unknown | null => {
    try {
      return readPack(slot, id);
    } catch {
      return null;
    }
  };
  const fromBinary = (id: PackId): unknown | null => SEED_PACKS[id] ?? null;

  lastBootError = error;
  lastBootSlot = slot;
  lastBootPromoted = promoted;
  return { library: new Library(fromDisk, fromBinary), slot, promoted, error };
}

/** What the app can say about the content it is running on. */
export interface ContentStatus {
  /** The content server, or '' when the app runs on its bundled copy alone. */
  source: string;
  /** 0 means nothing has ever been downloaded. */
  manifestVersion: number;
  packs: number;
  /** ISO 8601 of the last successful check, or null if there has not been one. */
  checkedAt: string | null;
  /** An update is downloaded and complete, waiting for the next launch. */
  updateWaiting: boolean;
  /** Set when the last launch failed to activate a staged update. */
  error: string | null;
  /** Which slot is live, and whether this launch activated an update. */
  slot: string;
  promotedThisLaunch: boolean;
}

/**
 * What is on disk right now.
 *
 * Read fresh rather than remembered, so the settings page shows the state
 * after a check rather than the state at launch. An app that updates itself
 * silently needs somewhere a grown-up can see whether it is actually
 * working — otherwise a server that has been unreachable for a month looks
 * exactly like one with nothing new to say.
 */
export function contentStatus(bootError: string | null = lastBootError): ContentStatus {
  const live = readIndex(activeSlot());

  return {
    source: CONTENT_URL,
    manifestVersion: live?.manifestVersion ?? 0,
    packs: live ? Object.keys(live.packs ?? {}).length : 0,
    checkedAt: live?.checkedAt ?? null,
    updateWaiting: updateWaiting(),
    error: bootError,
    slot: lastBootSlot,
    promotedThisLaunch: lastBootPromoted,
  };
}

/** Checks now, ignoring the throttle. For the button on the settings page. */
export const checkNow = (): Promise<UpdateOutcome> =>
  checkForUpdate(updaterConfig(), { force: true });

/**
 * The content library for this launch, plus a background update check.
 *
 * The library is built once and deliberately never replaced — swapping it
 * mid-session is exactly what the staging slot exists to avoid.
 */
export function useContent(): {
  library: Library;
  promoted: boolean;
  lastUpdate: UpdateOutcome | null;
} {
  const [boot0] = useState(boot);
  const [lastUpdate, setLastUpdate] = useState<UpdateOutcome | null>(null);
  const running = useRef(false);

  const config = useMemo(updaterConfig, []);

  useEffect(() => {
    if (!config.baseUrl) return;

    const run = async () => {
      if (running.current) return;
      running.current = true;
      try {
        setLastUpdate(await checkForUpdate(config));
      } finally {
        running.current = false;
      }
    };

    // Once on launch, and again whenever the app comes back to the
    // foreground. Both are throttled, so a user flicking in and out of the
    // app does not talk to the server more than once every few hours.
    void run();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void run();
    });
    return () => sub.remove();
  }, [config]);

  return { library: boot0.library, promoted: boot0.promoted, lastUpdate };
}
