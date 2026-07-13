Pod::Spec.new do |s|
  s.name           = 'Insta360'
  s.version        = '1.0.0'
  s.summary        = 'Puente del SDK de cámara Insta360 (captura 360 para inspecciones).'
  s.description    = 'Módulo Expo que envuelve el INSCameraSDK para conectar por WiFi, tomar una foto 360 y descargarla.'
  s.author         = 'Azahares'
  s.homepage       = 'https://azaharesfuel.com'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # xcframeworks del SDK de Insta360 (colocados en modules/insta360/ios/Frameworks
  # por el script scripts/setup-insta360.sh — NO están versionados en git por peso).
  s.vendored_frameworks = [
    'Frameworks/INSCameraSDK.xcframework',
    'Frameworks/INSCameraServiceSDK.xcframework',
    'Frameworks/INSCoreMedia.xcframework',
    'Frameworks/SSZipArchive.xcframework',
  ]

  # Frameworks del sistema que el SDK requiere.
  s.frameworks = 'CoreMotion', 'CoreMedia', 'VideoToolbox', 'AVFoundation', 'Metal', 'SystemConfiguration'
  s.libraries  = 'c++', 'z', 'bz2', 'iconv'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
    # Build setting exigido por el SDK "to B".
    'GCC_PREPROCESSOR_DEFINITIONS' => 'TO_B_SDK=1',
    'OTHER_SWIFT_FLAGS' => '-DTO_B_SDK',
  }

  s.source_files = 'Insta360Module.swift'
end
