import Foundation
import INSCameraSDK
import INSCoreMedia

// "Une" (stitch) un video .insv de doble ojo de pez en un MP4 equirectangular
// estándar, reproducible en cualquier player y en un visor 360 web. Usa
// INSExportSimplify del SDK con proyección PlaneEquirectangular.
class Insta360Exporter: NSObject, INSRExporter2ManagerDelegate {
  private var exporter: INSExportSimplify?
  private let onProgress: (Float) -> Void
  private let onComplete: (Bool, String?) -> Void
  private var finished = false

  init(
    insvPath: String,
    outputPath: String,
    onProgress: @escaping (Float) -> Void,
    onComplete: @escaping (Bool, String?) -> Void
  ) {
    self.onProgress = onProgress
    self.onComplete = onComplete
    super.init()

    try? FileManager.default.removeItem(atPath: outputPath)
    let insvURL = URL(fileURLWithPath: insvPath)
    let outURL = URL(fileURLWithPath: outputPath)

    let exp = INSExportSimplify(urls: [insvURL], outputUrl: outURL)
    exp.renderType = INSDisplayType(rawValue: 12) ?? .auto // 12 = PlaneEquirectangular
    exp.width = 2560   // equirectangular 2:1, 2K liviano
    exp.height = 1280
    exp.fps = 30
    exp.bitrate = 10 * 1024 * 1024
    exp.colorFusion = true
    exp.assetCachePath = NSHomeDirectory() + "/Documents/com.insta360.export.cache"
    exp.exportManagedelegate = self
    self.exporter = exp

    NSLog("[Insta360] stitch start → \(outputPath)")
    if let err = exp.start() {
      finish(false, err.localizedDescription)
    }
  }

  // MARK: - INSRExporter2ManagerDelegate

  func exporter2Manager(_ manager: INSExporter2Manager, progress: Float) {
    onProgress(progress)
  }

  func exporter2Manager(_ manager: INSExporter2Manager, state: INSExporter2State, error: Error?) {
    NSLog("[Insta360] stitch state=\(state.rawValue) err=\(String(describing: error))")
    switch state {
    case .complete:
      finish(true, nil)
    case .error, .initError:
      finish(false, error?.localizedDescription ?? "Error al unir el video 360.")
    case .cancel, .interrupt, .disconnect:
      finish(false, "El procesamiento se interrumpió.")
    @unknown default:
      break
    }
  }

  func exporter2Manager(
    _ manager: INSExporter2Manager,
    correctOffset: String,
    errorNum: Int32,
    totalNum: Int32,
    clipIndex: Int32,
    type: String
  ) {}

  private func finish(_ success: Bool, _ err: String?) {
    guard !finished else { return }
    finished = true
    exporter?.shutDown()
    exporter = nil
    onComplete(success, err)
  }
}
