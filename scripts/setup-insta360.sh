#!/usr/bin/env bash
# Coloca los xcframeworks del SDK de Insta360 en el módulo nativo local.
# Los binarios (~600MB) NO se versionan en git; se extraen del SDK oficial.
#
# Uso:
#   bash scripts/setup-insta360.sh /ruta/al/iOS-SDK-1.9.2.zip
#
# Descargá el SDK aprobado desde https://www.insta360.com/sdk/apply
set -euo pipefail

ZIP="${1:-}"
if [[ -z "$ZIP" || ! -f "$ZIP" ]]; then
  echo "Uso: bash scripts/setup-insta360.sh /ruta/al/iOS-SDK-x.y.z.zip" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/modules/insta360/ios/Frameworks"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "→ Extrayendo xcframeworks del SDK…"
unzip -o -q "$ZIP" \
  "*/Frameworks/INSCameraSDK.xcframework/*" \
  "*/Frameworks/INSCameraServiceSDK.xcframework/*" \
  "*/Frameworks/INSCoreMedia.xcframework/*" \
  "*/Frameworks/SSZipArchive.xcframework/*" \
  -x "__MACOSX/*" -d "$TMP"

mkdir -p "$DEST"
for fw in INSCameraSDK INSCameraServiceSDK INSCoreMedia SSZipArchive; do
  SRC="$(find "$TMP" -type d -name "$fw.xcframework" | head -1)"
  if [[ -z "$SRC" ]]; then
    echo "✗ No se encontró $fw.xcframework en el SDK" >&2
    exit 1
  fi
  rm -rf "$DEST/$fw.xcframework"
  cp -R "$SRC" "$DEST/$fw.xcframework"
  echo "  ✓ $fw.xcframework"
done

# Los headers de INSCoreMedia importan NvEffectSdkCore bajo `#if !TO_B_SDK`.
# Ese framework de efectos NO viene en el SDK "to B"; forzamos el modo TO_B
# (bloque nunca compilado) para que el módulo Clang construya sin él.
echo "→ Parcheando headers para el modo TO_B…"
for f in $(grep -rlE "if !TO_B_SDK" --include="*.h" "$DEST" 2>/dev/null); do
  sed -i '' 's/#if !TO_B_SDK/#if 0 \/\/ TO_B_SDK (azahares)/' "$f"
done

echo "→ Listo. Ahora corré: cd ios && pod install && cd .. && npx expo run:ios"
