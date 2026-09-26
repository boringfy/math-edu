/**
 * Locking the tablet to this app.
 *
 * The native half is Android-only and absent under the test runner, so what
 * is pinned here is the behaviour when it is missing: every call has to
 * answer sensibly rather than throw. A crash in this path would take down the
 * app at launch, which is the one place it must not.
 */

import {
  appLockSupported,
  appLocked,
  lockToApp,
  unlockFromApp,
} from '../../../modules/app-lock';

describe('when the native module is absent', () => {
  it('says the feature is not supported', () => {
    expect(appLockSupported()).toBe(false);
  });

  it('reports the tablet as unlocked rather than guessing', () => {
    expect(appLocked()).toBe(false);
  });

  it('answers false instead of throwing', () => {
    expect(() => lockToApp()).not.toThrow();
    expect(lockToApp()).toBe(false);
    expect(() => unlockFromApp()).not.toThrow();
    expect(unlockFromApp()).toBe(false);
  });
});
