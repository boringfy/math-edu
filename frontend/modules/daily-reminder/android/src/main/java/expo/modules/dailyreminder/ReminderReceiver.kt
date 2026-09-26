package expo.modules.dailyreminder

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat

class ReminderReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val channelId = "daily-learning"
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(channelId, "Daily learning reminder", NotificationManager.IMPORTANCE_DEFAULT),
      )
    }
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
    val pending = launch?.let {
      android.app.PendingIntent.getActivity(
        context, 0, it, android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE,
      )
    }
    val notification = NotificationCompat.Builder(context, channelId)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle("Time to learn")
      .setContentText("A few minutes of math, logic, or reading keeps your quest moving.")
      .setAutoCancel(true)
      .setContentIntent(pending)
      .build()
    manager.notify(DailyReminderModule.REQUEST, notification)
  }
}
