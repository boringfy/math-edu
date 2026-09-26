/**
 * Asking for the grown-up before something a child should not do alone.
 *
 * The lock-to-this-app switch had a hole in it that the gesture guard did
 * nothing about. Pinning stops Home, Recents and every other app, and leaving
 * by holding Back and Home asks for the tablet's PIN — but the switch that
 * turns pinning *off* sits in this app's own settings, which the child is
 * already inside. They never needed the gesture: tap the gear, flip the
 * switch, walk out. The lock only ever guarded the door it was standing at.
 *
 * So turning it off now asks for the same PIN the gesture does. Deliberately
 * the *device* credential rather than a passcode of our own: a second secret
 * is a second thing to forget, it would have to be stored somewhere, and a
 * parent who has already set a screen lock has said what their password is.
 *
 * A device with no PIN enrolled cannot be asked. There the gate opens — which
 * sounds wrong until you notice that such a tablet has nothing to ask for,
 * and refusing would lock the parent out of their own setting with no way
 * back. The settings screen says as much, and says to set a screen lock.
 */

import { confirmDeviceCredential, deviceCredentialAvailable } from '../../modules/app-lock';

export type GateResult =
  /** They proved who they were, or there was nothing to prove. */
  | { allowed: true; asked: boolean }
  /** They failed or cancelled. Nothing should change. */
  | { allowed: false };

/** Whether this tablet has a PIN, pattern or password to ask for. */
export async function gateAvailable(): Promise<boolean> {
  return deviceCredentialAvailable();
}

/**
 * Asks for the tablet's PIN.
 *
 * This uses the device-credential prompt only. It does not request Face ID,
 * fingerprints, or any other biometric authentication.
 */
export async function askGrownUp(reason: string): Promise<GateResult> {
  if (!(await gateAvailable())) return { allowed: true, asked: false };

  try {
    const allowed = await confirmDeviceCredential(reason);
    return allowed ? { allowed: true, asked: true } : { allowed: false };
  } catch {
    // A prompt that cannot be shown must not become a way through: this gate
    // exists precisely for the case where somebody is trying to get past it.
    return { allowed: false };
  }
}
