import ExpoModulesCore
import INSCameraSDK
import INSCameraServiceSDK
import CoreVideo
import UIKit

// Vista de preview en vivo de la cámara Insta360. Abre una INSCameraMediaSession
// con un INSCameraPlayer; cada frame stitched se pinta en un UIImageView. Se usa
// para encuadrar la toma 360 desde el teléfono (la cámara apaga su pantalla).
class Insta360PreviewView: ExpoView {
  private let imageView = UIImageView()
  private let mediaSession = INSCameraMediaSession()
  private let player = INSCameraPlayer()
  private var started = false

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    imageView.contentMode = .scaleAspectFill
    imageView.backgroundColor = .black
    addSubview(imageView)

    player.delegate = self
    player.outputPixelFormat = kCVPixelFormatType_32BGRA
    mediaSession.plug(player)
    start()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    imageView.frame = bounds
  }

  private func start() {
    guard !started else { return }
    guard INSCameraManager.socket().cameraState == .connected else {
      // La cámara aún no está conectada; se reintenta cuando la vista se re-monta.
      return
    }
    started = true
    mediaSession.startRunning { error in
      if let error = error {
        NSLog("[Insta360] preview startRunning error: \(error.localizedDescription)")
      }
    }
  }

  private func stop() {
    guard started else { return }
    started = false
    mediaSession.stopRunning { _ in }
  }

  deinit {
    mediaSession.stopRunning { _ in }
  }
}

extension Insta360PreviewView: INSCameraPlayerDelegate {
  func player(_ player: INSCameraPlayer, onStitchedFrame stitchedFrame: INSCameraVideoFrame) {
    guard let image = Insta360PreviewView.image(from: stitchedFrame.pixelBuffer) else { return }
    DispatchQueue.main.async { [weak self] in
      self?.imageView.image = image
    }
  }

  // CVPixelBuffer → UIImage (BGRA) para pintar el frame.
  private static func image(from pixelBuffer: CVPixelBuffer) -> UIImage? {
    let ci = CIImage(cvPixelBuffer: pixelBuffer)
    let context = CIContext(options: nil)
    guard let cg = context.createCGImage(ci, from: ci.extent) else { return nil }
    return UIImage(cgImage: cg)
  }
}
