import ExpoModulesCore
import UIKit

private final class PencilSqueezeDelegate: NSObject, UIPencilInteractionDelegate {
  var onChange: (Bool) -> Void

  init(onChange: @escaping (Bool) -> Void) {
    self.onChange = onChange
  }

  @available(iOS 17.5, *)
  func pencilInteraction(
    _ interaction: UIPencilInteraction,
    didReceiveSqueeze squeeze: UIPencilInteraction.Squeeze
  ) {
    switch squeeze.phase {
    case .began, .changed:
      onChange(true)
    case .ended, .cancelled:
      onChange(false)
    @unknown default:
      onChange(false)
    }
  }
}

/** UIKit reports Pencil Pro squeeze phases separately from pointer button bits. */
public final class PencilSqueezeModule: Module {
  private var interaction: UIPencilInteraction?
  private var squeezeDelegate: PencilSqueezeDelegate?
  private weak var hostView: UIView?

  public func definition() -> ModuleDefinition {
    Name("PencilSqueeze")
    Events("onSqueeze")

    OnStartObserving("onSqueeze") {
      DispatchQueue.main.async { self.startObserving() }
    }

    OnStopObserving("onSqueeze") {
      DispatchQueue.main.async { self.stopObserving() }
    }

    OnAppEntersBackground {
      self.sendEvent("onSqueeze", ["held": false])
    }

    OnDestroy {
      DispatchQueue.main.async { self.stopObserving() }
    }
  }

  private func startObserving() {
    guard #available(iOS 17.5, *), interaction == nil else { return }
    let window = UIApplication.shared.connectedScenes
      .compactMap { ($0 as? UIWindowScene)?.windows.first(where: { $0.isKeyWindow }) }
      .first
    guard let view = window?.rootViewController?.view else { return }

    let delegate = PencilSqueezeDelegate { [weak self] held in
      self?.sendEvent("onSqueeze", ["held": held])
    }
    let pencilInteraction = UIPencilInteraction()
    pencilInteraction.delegate = delegate
    view.addInteraction(pencilInteraction)
    squeezeDelegate = delegate
    interaction = pencilInteraction
    hostView = view
  }

  private func stopObserving() {
    if let interaction { hostView?.removeInteraction(interaction) }
    interaction = nil
    squeezeDelegate = nil
    hostView = nil
  }
}
