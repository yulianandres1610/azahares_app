import ExpoModulesCore
import INSCameraServiceSDK
import INSCameraSDK
import INSCoreMedia

// Puente Expo ↔ INSCameraSDK de Insta360.
//
// Flujo: connect() abre el socket WiFi y espera a que la cámara quede
// `Connected`; capture360() dispara una foto 360, la descarga al disco local y
// devuelve su file:// (equirectangular) para subirla y explorarla en la app.
public class Insta360Module: Module {
  private var pollTimer: Timer?
  private var heartbeatTimer: Timer?
  private var connectResolve: ((Any?) -> Void)?
  private var connectReject: ((String, String) -> Void)?

  public func definition() -> ModuleDefinition {
    Name("Insta360")

    Events("stateChange")

    // Estado actual de la conexión con la cámara.
    Function("getState") { () -> String in
      return self.stateString(INSCameraManager.socket().cameraState)
    }

    Function("getCameraName") { () -> String? in
      // Seguro ante cámara desconectada: currentCamera puede ser nil y KVC sobre
      // una key inexistente lanza NSException. Usamos responds(to:) primero.
      guard let cam = INSCameraManager.socket().currentCamera as? NSObject else {
        return nil
      }
      for key in ["serialNumber", "name"] {
        if cam.responds(to: NSSelectorFromString(key)),
           let value = cam.value(forKey: key) as? String, !value.isEmpty {
          return value
        }
      }
      return nil
    }

    // Conecta por WiFi (hotspot de la cámara) y espera a Connected (timeout 30s).
    AsyncFunction("connect") { (promise: Promise) in
      DispatchQueue.main.async {
        let mgr = INSCameraManager.socket()
        if mgr.cameraState == .connected {
          promise.resolve(nil)
          return
        }
        NSLog("[Insta360] connect(): socket setup, estado inicial=\(mgr.cameraState.rawValue)")
        mgr.setup()
        self.connectResolve = { _ in promise.resolve(nil) }
        self.connectReject = { code, msg in promise.reject(code, msg) }
        self.startPolling(timeoutSeconds: 30)
      }
    }

    AsyncFunction("disconnect") { (promise: Promise) in
      DispatchQueue.main.async {
        self.stopPolling()
        self.stopHeartbeat()
        INSCameraManager.socket().shutdown()
        self.sendEvent("stateChange", ["state": "disconnected"])
        promise.resolve(nil)
      }
    }

    // Toma UNA foto 360 y la descarga al disco local. Resuelve con file://.
    AsyncFunction("capture360") { (promise: Promise) in
      DispatchQueue.main.async {
        let mgr = INSCameraManager.socket()
        guard mgr.cameraState == .connected else {
          promise.reject("NOT_CONNECTED", "La cámara no está conectada.")
          return
        }
        self.sendEvent("stateChange", ["state": "capturing"])
        let cmd = mgr.commandManager
        let options = INSTakePictureOptions()
        NSLog("[Insta360] capture360: llamando takePicture…")
        cmd.takePicture(with: options) { error, photoInfo in
          if let error = error {
            NSLog("[Insta360] takePicture ERROR: \(error.localizedDescription)")
            self.sendEvent("stateChange", ["state": "connected"])
            promise.reject("CAPTURE_FAILED", error.localizedDescription)
            return
          }
          let uri = photoInfo?.uri ?? ""
          NSLog("[Insta360] takePicture OK, uri='\(uri)'")
          guard !uri.isEmpty else {
            self.sendEvent("stateChange", ["state": "connected"])
            promise.reject("NO_URI", "La cámara no devolvió la foto.")
            return
          }
          // Descarga la foto 360 al disco local (transferencia rápida por WiFi).
          self.sendEvent("stateChange", ["state": "downloading"])
          let dir = FileManager.default.temporaryDirectory
          let dest = dir.appendingPathComponent("insta360-\(Int(Date().timeIntervalSince1970)).jpg")
          NSLog("[Insta360] fetchResource → \(dest.path)")
          _ = cmd.fetchResource(
            withURI: uri,
            toLocalFile: dest,
            progress: { p in
              NSLog("[Insta360] download progress: \(p?.fractionCompleted ?? 0)")
            },
            completion: { err in
              if let err = err {
                NSLog("[Insta360] fetchResource ERROR: \(err.localizedDescription)")
                self.sendEvent("stateChange", ["state": "connected"])
                promise.reject("DOWNLOAD_FAILED", err.localizedDescription)
              } else {
                NSLog("[Insta360] fetchResource OK")
                self.sendEvent("stateChange", ["state": "connected"])
                promise.resolve(["uri": dest.absoluteString])
              }
            }
          )
        }
      }
    }

    // Vista de preview en vivo (para encuadrar la toma desde el teléfono).
    View(Insta360PreviewView.self) {}

    OnDestroy {
      self.stopPolling()
      self.stopHeartbeat()
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
      let state = INSCameraManager.socket().cameraState
      NSLog("[Insta360] poll: cameraState=\(state.rawValue) (\(self.stateString(state)))")
      self.sendEvent("stateChange", ["state": self.stateString(state)])
      if state == .connected {
        self.stopPolling()
        self.startHeartbeat()  // sin heartbeat la cámara se desconecta a los 30s
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

  private func startHeartbeat() {
    stopHeartbeat()
    heartbeatTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { _ in
      INSCameraManager.socket().commandManager.sendHeartbeats(with: nil)
    }
  }

  private func stopHeartbeat() {
    heartbeatTimer?.invalidate()
    heartbeatTimer = nil
  }
}
