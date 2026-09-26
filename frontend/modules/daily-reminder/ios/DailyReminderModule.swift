import ExpoModulesCore
import UserNotifications

public final class DailyReminderModule: Module {
  private let identifier = "daily-learning-reminder"
  private let center = UNUserNotificationCenter.current()

  public func definition() -> ModuleDefinition {
    Name("DailyReminder")

    AsyncFunction("requestPermissionsAsync") { (promise: Promise) in
      center.requestAuthorization(options: [.alert, .sound]) { granted, _ in
        promise.resolve(["granted": granted, "status": granted ? "granted" : "denied"])
      }
    }

    AsyncFunction("schedule") { (hour: Int, minute: Int, promise: Promise) in
      guard (0...23).contains(hour), (0...59).contains(minute) else {
        promise.resolve(false)
        return
      }
      let content = UNMutableNotificationContent()
      content.title = "Time to learn"
      content.body = "A few minutes of math, logic, or reading keeps your quest moving."
      content.sound = .default
      var components = DateComponents()
      components.hour = hour
      components.minute = minute
      let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
      // The same identifier replaces the previous request atomically. Wait
      // for the system before telling Settings the reminder was saved.
      center.add(UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)) { error in
        promise.resolve(error == nil)
      }
    }

    Function("cancel") { () -> Bool in
      center.removePendingNotificationRequests(withIdentifiers: [identifier])
      center.removeDeliveredNotifications(withIdentifiers: [identifier])
      return true
    }
  }
}
