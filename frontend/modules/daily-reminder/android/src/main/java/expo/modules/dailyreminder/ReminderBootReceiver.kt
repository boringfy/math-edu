package expo.modules.dailyreminder

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class ReminderBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action !in setOf(
        Intent.ACTION_BOOT_COMPLETED,
        Intent.ACTION_TIME_CHANGED,
        Intent.ACTION_TIMEZONE_CHANGED,
      )) return
    val prefs = context.getSharedPreferences(DailyReminderModule.PREFS, Context.MODE_PRIVATE)
    if (!prefs.getBoolean(DailyReminderModule.ENABLED, false)) return
    ReminderScheduler.schedule(
      context,
      prefs.getInt(DailyReminderModule.HOUR, 17),
      prefs.getInt(DailyReminderModule.MINUTE, 0),
    )
  }
}
