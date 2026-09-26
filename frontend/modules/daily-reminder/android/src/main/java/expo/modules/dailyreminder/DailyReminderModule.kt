package expo.modules.dailyreminder

import android.Manifest
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DailyReminderModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("DailyReminder")

    AsyncFunction("requestPermissionsAsync") { promise: Promise ->
      Permissions.askForPermissionsWithPermissionsManager(
        appContext.permissions,
        promise,
        Manifest.permission.POST_NOTIFICATIONS,
      )
    }

    Function("schedule") { hour: Int, minute: Int ->
      ReminderScheduler.schedule(context, hour, minute)
      true
    }

    Function("cancel") {
      val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      alarm.cancel(pendingIntent(context))
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(ENABLED, false).apply()
      true
    }
  }

  companion object {
    const val PREFS = "daily-reminder"
    const val ENABLED = "enabled"
    const val HOUR = "hour"
    const val MINUTE = "minute"
    const val REQUEST = 3017

    fun pendingIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(
      context,
      REQUEST,
      Intent(context, ReminderReceiver::class.java),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }
}
