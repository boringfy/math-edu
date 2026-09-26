import ExpoModulesCore
import Foundation

/** A deliberately small bridge over Apple's cross-device key-value store. */
public final class ICloudStoreModule: Module {
  private let store = NSUbiquitousKeyValueStore.default

  public func definition() -> ModuleDefinition {
    Name("ICloudStore")

    Function("isAvailable") {
      // Writes made before iCloud sign-in are uploaded when an account is added.
      return true
    }

    Function("getString") { (key: String) -> String? in
      return store.string(forKey: key)
    }

    Function("setString") { (key: String, value: String) -> Bool in
      store.set(value, forKey: key)
      // synchronize() only asks the system to begin an immediate transfer;
      // its return value is not a durable-write result.
      _ = store.synchronize()
      return true
    }

    Function("synchronize") {
      return store.synchronize()
    }
  }
}
