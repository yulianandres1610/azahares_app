import ExpoModulesCore
import INSCameraServiceSDK

// Puente Expo ↔ INSCameraSDK de Insta360.
//
// Flujo: connect() abre el socket WiFi y espera a que la cámara quede
// `Connected`; capture360() dispara una foto 360, la descarga al disco local y
// devuelve su file:// (equirectangular) para subirla y explorarla en la app.
public class Insta360Module: Module {
  private var pollTimer: Timer?
  private var connectResolve: ((Any?) -> Void)?
  private var connectReject: ((String, String) -> Void)?

  public func definition() -> ModuleDefinition {
    Name("Insta360")

    Events("stateChange")

    // Estado actual de la conexión con la cámara.
    Function("getState") { () -> String in
      return self.stateString(INSCameraManager.socketManager().cameraState)
    }

    Function("getCameraName") { () -> String? in
      // El SDK no expone un nombre estable por API pública; devolvemos el serial
      // si está disponible, o nil (la UI muestra "Cámara conectada").
      let cam = INSCameraManager.socketManager().currentCamera
      return (cam as AnyObject).value(forKey: "serial") as? String
    }

    // Conecta por WiFi (hotspot de la cámara) y espera a Connected (timeout 30s).
    AsyncFunction("connect") { (promise: Promise) in
      DispatchQueue.main.async {
        let mgr = INSCameraManager.socketManager()
        if mgr.cameraState == .connected {
          promise.resolve(nil)
          return
        }
        mgr.setup()
        self.connectResolve = { _ in promise.resolve(nil) }
        self.connectReject = { code, msg in promise.reject(code, msg) }
        self.startPolling(timeoutSeconds: 30)
      }
    }

    AsyncFunction("disconnect") { (promise: Promise) in
      DispatchQueue.main.async {
        self.stopPolling()
        INSCameraManager.socketManager().shutdown()
        self.sendEvent("stateChange", ["state": "disconnected"])
        promise.resolve(nil)
      }
    }

    // Toma UNA foto 360 y la descarga al disco local. Resuelve con file://.
    AsyncFunction("capture360") { (promise: Promise) in
      DispatchQueue.main.async {
        let mgr = INSCameraManager.socketManager()
        guard mgr.cameraState == .connected else {
          promise.reject("NOT_CONNECTED", "La cámara no está conectada.")
          return
        }
        self.sendEvent("stateChange", ["state": "capturing"])
        let cmd = mgr.commandsImpl
        let options = INSTakePictureOptions()
        cmd.takePicture(withOptions: options) { error, photoInfo in
          if let error = error {
            promise.reject("CAPTURE_FAILED", error.localizedDescription)
            return
          }
          guard let uri = photoInfo?.uri, !uri.isEmpty else {
            promise.reject("NO_URI", "La cámara no devolvió la foto.")
            return
          }
          // Descarga la foto 360 al disco local (transferencia rápida por WiFi).
          let dir = FileManager.default.temporaryDirectory
          let dest = dir.appendingPathComponent("insta360-\(Int(Date().timeIntervalSince1970)).jpg")
          _ = cmd.fetchResource(
            withURI: uri,
            toLocalFile: dest,
            progress: { _ in },
            completion: { err in
              if let err = err {
                promise.reject("DOWNLOAD_FAILED", err.localizedDescription)
              } else {
                self.sendEvent("stateChange", ["state": "connected"])
                promise.resolve(["uri": dest.absoluteString])
              }
            }
          )
        }
      }
    }

    OnDestroy {
      self.stopPolling()
    }
  }

  // MARK: - Helpers

  private func stateString(_ s: INSCameraState) -> String {
    switch s {
    case .connected: return "connected"
    case .found, .synchronized: return "connecting"
    default: return "disconnected"
    }
  }

  private func startPolling(timeoutSeconds: Int) {
    stopPolling()
    var elapsed = 0.0
    let interval = 0.3
    sendEvent("stateChange", ["state": "connecting"])
    pollTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in
      guard let self = self else { return }
      let state = INSCameraManager.socketManager().cameraState
      self.sendEvent("stateChange", ["state": self.stateString(state)])
      if state == .connected {
        self.stopPolling()
        self.connectResolve?(nil)
        self.connectResolve = nil
        self.connectReject = nil
        return
      }
      if state == .connectFailed {
        self.stopPolling()
        self.connectReject?("CONNECT_FAILED", "No se pudo conectar a la cámara.")
        self.connectResolve = nil
        self.connectReject = nil
        return
      }
      elapsed += interval
      if elapsed >= Double(timeoutSeconds) {
        self.stopPolling()
        self.connectReject?("TIMEOUT", "Tiempo de espera agotado. Verificá el WiFi de la cámara.")
        self.connectResolve = nil
        self.connectReject = nil
      }
    }
  }

  private func stopPolling() {
    pollTimer?.invalidate()
    pollTimer = nil
  }
}
