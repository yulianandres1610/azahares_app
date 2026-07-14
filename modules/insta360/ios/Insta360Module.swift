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

    Events("stateChange", "downloadProgress")

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

    // Inicia la grabación de video 360 (se guarda en la SD de la cámara).
    AsyncFunction("startRecording") { (promise: Promise) in
      DispatchQueue.main.async {
        guard INSCameraManager.socket().cameraState == .connected else {
          promise.reject("NOT_CONNECTED", "La cámara no está conectada.")
          return
        }
        let cmd = INSCameraManager.shared().commandManager

        let doStart = {
          NSLog("[Insta360] startCapture…")
          cmd.startCapture(with: nil) { error in
            if let error = error {
              NSLog("[Insta360] startCapture ERROR: \(error.localizedDescription)")
              promise.reject("RECORD_FAILED", error.localizedDescription)
            } else {
              NSLog("[Insta360] startCapture OK (grabando)")
              self.sendEvent("stateChange", ["state": "recording"])
              promise.resolve(nil)
            }
          }
        }

        // Baja la resolución a 2K (1920x960@30) y el bitrate para archivos
        // livianos → subida rápida (crítico en logística). Best-effort: si la
        // cámara no acepta la opción, grabamos igual con su resolución.
        let opts = INSCameraOptions()
        opts.videoResolution = INSVideoResolution1920x960x30
        opts.videoBitrate = UInt32(10 * 1024 * 1024) // ~10 Mbps
        NSLog("[Insta360] setOptions videoResolution 1920x960@30…")
        cmd.setOptions(
          opts,
          forTypes: [NSNumber(value: 1), NSNumber(value: 3)] // 1=VideoResolution, 3=VideoBitrate
        ) { err, _ in
          if let err = err {
            NSLog("[Insta360] setOptions err (ignorado): \(err.localizedDescription)")
          }
          doStart()
        }
      }
    }

    // Detiene la grabación, descarga el video 360 al disco local y resuelve con
    // el file:// del archivo (.insv / .mp4 según la cámara).
    AsyncFunction("stopRecording") { (promise: Promise) in
      DispatchQueue.main.async {
        NSLog("[Insta360] stopCapture…")
        INSCameraManager.shared().commandManager.stopCapture(with: nil) { error, info in
          if let error = error {
            NSLog("[Insta360] stopCapture ERROR: \(error.localizedDescription)")
            self.sendEvent("stateChange", ["state": "connected"])
            promise.reject("STOP_FAILED", error.localizedDescription)
            return
          }
          let uri = info?.uri ?? ""
          NSLog("[Insta360] stopCapture OK, uri='\(uri)'")
          guard !uri.isEmpty else {
            self.sendEvent("stateChange", ["state": "connected"])
            promise.reject("NO_URI", "La cámara no devolvió el video.")
            return
          }
          self.sendEvent("stateChange", ["state": "downloading"])
          let dir = FileManager.default.temporaryDirectory
          let ext = (uri as NSString).pathExtension.isEmpty ? "mp4" : (uri as NSString).pathExtension
          let dest = dir.appendingPathComponent("insta360-\(Int(Date().timeIntervalSince1970)).\(ext)")
          NSLog("[Insta360] fetchResource (video) → \(dest.path)")
          _ = INSCameraManager.shared().commandManager.fetchResource(
            withURI: uri,
            toLocalFile: dest,
            progress: { p in
              self.sendEvent("downloadProgress", ["progress": p?.fractionCompleted ?? 0])
            },
            completion: { err in
              if let err = err {
                NSLog("[Insta360] fetchResource ERROR: \(err.localizedDescription)")
                self.sendEvent("stateChange", ["state": "connected"])
                promise.reject("DOWNLOAD_FAILED", err.localizedDescription)
              } else {
                NSLog("[Insta360] fetchResource OK")
                self.sendEvent("stateChange", ["state": "connected"])
                // remoteUri = ruta del archivo EN la cámara (para borrarlo luego).
                promise.resolve(["uri": dest.absoluteString, "remoteUri": uri, "ext": ext])
              }
            }
          )
        }
      }
    }

    // Borra archivos de la SD de la cámara (para liberar memoria tras subir).
    AsyncFunction("deleteFromCamera") { (uri: String, promise: Promise) in
      DispatchQueue.main.async {
        guard !uri.isEmpty else {
          promise.resolve(nil)
          return
        }
        NSLog("[Insta360] deleteFiles \(uri)")
        INSCameraManager.shared().commandManager.deleteFiles([uri]) { error in
          if let error = error {
            NSLog("[Insta360] deleteFiles ERROR: \(error.localizedDescription)")
            promise.reject("DELETE_FAILED", error.localizedDescription)
          } else {
            promise.resolve(nil)
          }
        }
      }
    }

    // Reproductor 360 esférico del video grabado (navegable).
    View(Insta360PlayerView.self) {
      Prop("source") { (view: Insta360PlayerView, source: String) in
        view.setSource(source)
      }
    }

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
      INSCameraManager.shared().commandManager.sendHeartbeats(with: nil)
    }
  }

  private func stopHeartbeat() {
    heartbeatTimer?.invalidate()
    heartbeatTimer = nil
  }
}
