package expo.modules.dailyreminder

import android.app.AlarmManager
import android.content.Context
import java.util.Calendar

object ReminderScheduler {
  fun schedule(context: Context, hour: Int, minute: Int) {
    val next = Calendar.getInstance().apply {
      set(Calendar.HOUR_OF_DAY, hour)
      set(Calendar.MINUTE, minute)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
      if (timeInMillis <= System.currentTimeMillis()) add(Calendar.DAY_OF_YEAR, 1)
    }
    val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarm.setInexactRepeating(
      AlarmManager.RTC_WAKEUP,
      next.timeInMillis,
      AlarmManager.INTERVAL_DAY,
      DailyReminderModule.pendingIntent(context),
    )
    context.getSharedPreferences(DailyReminderModule.PREFS, Context.MODE_PRIVATE).edit()
      .putBoolean(DailyReminderModule.ENABLED, true)
      .putInt(DailyReminderModule.HOUR, hour)
      .putInt(DailyReminderModule.MINUTE, minute)
      .apply()
  }
}
