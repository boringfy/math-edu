package expo.modules.applock

import android.app.Activity
import android.app.ActivityManager
import android.app.KeyguardManager
import android.content.Context
import android.os.Build
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues

/**
 * Locking the tablet to this app.
 *
 * Android calls it lock task mode; the settings screen calls it screen
 * pinning. Started from inside the app rather than from the Recents gesture,
 * so a grown-up turns it on once and it comes back every launch instead of
 * being re-pinned by hand each time.
 *
 * Without a device owner this is the *pinned* flavour, which is the right one
 * here: it blocks Home, Recents and launching anything else, and it can still
 * be left by an adult holding Back and Overview. With "require unlock to
 * exit" switched on in Settings that gesture asks for the device PIN, which
 * is what makes it a lock rather than a suggestion.
 *
 * Deliberately not device-owner kiosk mode. That would make the app
 * unleaveable outright, but it has to be provisioned with no accounts on the
 * device and is painful to undo — far too much to take on for keeping a child
 * off YouTube.
 *
 * Android only. iOS has no API for this at all: the equivalent is Guided
 * Access, which a parent turns on from the system settings and no app can
 * start for itself. `isSupported` says so rather than the app pretending.
 */
class AppLockModule : Module() {
  private var credentialPromise: Promise? = null
  private val credentialRequest = 8127
  private val activity: Activity?
    get() = appContext.currentActivity

  private fun isPinned(): Boolean {
    val manager = activity?.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
      ?: return false
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      manager.lockTaskModeState != ActivityManager.LOCK_TASK_MODE_NONE
    } else {
      @Suppress("DEPRECATION")
      manager.isInLockTaskMode
    }
  }

  override fun definition() = ModuleDefinition {
    Name("AppLock")

    Function("isSupported") { true }

    Function("hasDeviceCredential") {
      val manager = activity?.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
      manager?.isDeviceSecure == true
    }

    AsyncFunction("confirmDeviceCredential") { reason: String, promise: Promise ->
      val current = activity
      val manager = current?.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
      if (current == null || manager?.isDeviceSecure != true || credentialPromise != null) {
        promise.resolve(false)
        return@AsyncFunction
      }
      val intent = manager.createConfirmDeviceCredentialIntent(reason, null)
      if (intent == null) {
        promise.resolve(false)
        return@AsyncFunction
      }
      credentialPromise = promise
      try {
        current.startActivityForResult(intent, credentialRequest)
      } catch (error: Throwable) {
        credentialPromise = null
        promise.resolve(false)
      }
    }.runOnQueue(Queues.MAIN)

    OnActivityResult { _, (requestCode, resultCode, _) ->
      if (requestCode == credentialRequest) {
        credentialPromise?.resolve(resultCode == Activity.RESULT_OK)
        credentialPromise = null
      }
    }

    Function("isLocked") { isPinned() }

    /**
     * Returns whether it took. `startLockTask` throws if the activity is not
     * resumed — during a screen rotation, or if this is called before the
     * window is ready — and a failure to pin must never take the quiz down
     * with it.
     */
    Function("lock") {
      val current = activity
      if (current == null) {
        Log.w("AppLock", "lock: no current activity")
        return@Function false
      }
      if (isPinned()) {
        Log.i("AppLock", "lock: already pinned")
        return@Function true
      }
      try {
        current.startLockTask()
        Log.i("AppLock", "lock: startLockTask returned, state=" + isPinned())
        true
      } catch (error: Throwable) {
        Log.w("AppLock", "lock: startLockTask threw", error)
        false
      }
    }

    Function("unlock") {
      val current = activity ?: return@Function false
      if (!isPinned()) return@Function true
      try {
        current.stopLockTask()
        true
      } catch (error: Throwable) {
        false
      }
    }
  }
}
