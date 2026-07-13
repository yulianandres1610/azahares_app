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
    # El SDK "to B" apaga las dependencias de efectos (NvEffectSdkCore) con
    # `#if !TO_B_SDK` en sus headers. El define debe llegar tanto al compilador
    # de este pod como al Clang module importer que construye los módulos de los
    # xcframeworks importados (de ahí el `-Xcc -DTO_B_SDK=1`).
    'GCC_PREPROCESSOR_DEFINITIONS' => '$(inherited) TO_B_SDK=1',
    'OTHER_CFLAGS' => '$(inherited) -DTO_B_SDK=1',
    'OTHER_SWIFT_FLAGS' => '$(inherited) -DTO_B_SDK -Xcc -DTO_B_SDK=1',
    # Xcode 16 usa explicit modules, que no propagan los -Xcc defines al build
    # del módulo Clang dependiente (INSCoreMedia con `#if !TO_B_SDK`). Volvemos a
    # implicit modules para que TO_B_SDK=1 llegue a los headers del SDK (igual
    # que el proyecto de ejemplo oficial de Insta360).
    'SWIFT_ENABLE_EXPLICIT_MODULES' => 'NO',
    '_EXPERIMENTAL_SWIFT_EXPLICIT_MODULES' => 'NO',
  }

  s.source_files = '*.swift'
end
