import ExpoModulesCore
import INSCameraSDK
import INSCoreMedia
import UIKit

// Reproductor 360 esférico de un archivo .insv local. Usa el render del SDK
// (INSRenderView.sphericalPanoRender) + INSPreviewer3 para decodificar y "unir"
// (stitch) el doble ojo de pez en una esfera navegable: el usuario arrastra
// para mirar en todas direcciones. Prop `source` = ruta del archivo local.
class Insta360PlayerView: ExpoView {
  private var renderView: INSRenderView?
  private var previewer: INSPreviewer3?
  private var currentPath: String?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .black
    clipsToBounds = true
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    renderView?.frame = bounds
  }

  func setSource(_ source: String) {
    let path = source.replacingOccurrences(of: "file://", with: "")
    guard !path.isEmpty, path != currentPath else { return }
    currentPath = path
    teardown()
    play(URL(fileURLWithPath: path))
  }

  private func play(_ url: URL) {
    let rv = INSRenderView(frame: bounds, renderType: .sphericalPanoRender)
    rv.frame = bounds
    addSubview(rv)
    renderView = rv

    let pv = INSPreviewer3()
    pv.displayDelegate = rv
    previewer = pv

    rv.render.stitchingInfo = INSStitchingInfo()
    rv.render.colorFusion = true
    rv.render.stitchType = .disflow

    let cache = NSHomeDirectory() + "/Documents/com.insta360.asset.video"
    let asset = INSVideoAsset(path: url.absoluteString, cacheDir: cache, option: .All)
    if asset.open() != nil {
      NSLog("[Insta360] player: no se pudo abrir el asset")
      return
    }

    var offset: String? = nil
    if let o = asset.extraMetadata?.offsetV3, !o.isEmpty { offset = o }
    else if let o = asset.extraMetadata?.offsetV2, !o.isEmpty { offset = o }
    else if let o = asset.extraMetadata?.offset, !o.isEmpty { offset = o }

    let durationMs = (asset.demuxerInfo?.videoDurationS ?? 0) * 1000
    let videoTrackCount = asset.extraMetadata?.videoTrackCount ?? 1
    let reverse = asset.extraMetadata?.reverseVideoTrackOrder == true
    let mediaFileSize = Int64(asset.mediaFileSize)

    let segment = INSEmSegment(url: [url], totalSrcDurationMs: durationMs, isValid: true)
    let clip = INSFileClip(
      emSegment: [segment],
      startTimeMs: 0,
      endTimeMs: durationMs,
      totalSrcDurationMs: durationMs,
      timeScales: nil,
      hasAudio: false,
      mediaFileSize: mediaFileSize,
      videoTrackCount: Int32(videoTrackCount),
      reverseVideoTrackOrder: reverse
    )

    pv.setVideoSource([clip], bgmSource: nil, videoSilent: false)
    pv.prepareAsync(0)
    rv.playVideo(withOffset: offset)
    pv.play()
  }

  private func teardown() {
    previewer?.shutdown()
    previewer = nil
    renderView?.removeFromSuperview()
    renderView = nil
  }

  deinit {
    teardown()
  }
}
