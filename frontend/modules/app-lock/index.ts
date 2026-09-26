import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * Locking the tablet to this app, so it cannot be swapped for YouTube.
 *
 * The native half exists on Android only — see `AppLockModule.kt` for why iOS
 * cannot have one — so everything here is written to be absent. A build
 * without the module answers "not supported" rather than throwing, which is
 * also what the test runner sees.
 */
interface AppLockNative {
  isSupported(): boolean;
  isLocked(): boolean;
  lock(): boolean;
  unlock(): boolean;
  hasDeviceCredential(): boolean;
  confirmDeviceCredential(reason: string): Promise<boolean>;
}

const native = requireOptionalNativeModule<AppLockNative>('AppLock');

/** Whether this build can lock itself down at all. */
export const appLockSupported = (): boolean => native?.isSupported() ?? false;

export const deviceCredentialAvailable = (): boolean => {
  try {
    return native?.hasDeviceCredential() ?? false;
  } catch {
    return false;
  }
};

export const confirmDeviceCredential = async (reason: string): Promise<boolean> => {
  try {
    return (await native?.confirmDeviceCredential(reason)) ?? false;
  } catch {
    return false;
  }
};

/** Whether the tablet is pinned to this app right now. */
export const appLocked = (): boolean => {
  try {
    return native?.isLocked() ?? false;
  } catch {
    return false;
  }
};

/** Pins the tablet to this app. Returns whether it actually took. */
export const lockToApp = (): boolean => {
  try {
    return native?.lock() ?? false;
  } catch {
    return false;
  }
};

/** Lets the tablet out again. */
export const unlockFromApp = (): boolean => {
  try {
    return native?.unlock() ?? false;
  } catch {
    return false;
  }
};
