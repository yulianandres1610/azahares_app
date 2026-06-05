#!/usr/bin/env bash
# Deploy de la app al iPhone físico en un comando.
# - Compila (Debug) reusando la DerivedData de Expo (incremental, rápido).
# - Firma los frameworks que el build deja sin firma (bug Xcode 26 + RN prebuilt)
#   y re-firma la .app, evitando ApplicationVerificationFailed.
# - Instala y lanza en el dispositivo.
# Requiere: Metro corriendo aparte (`npx expo start --dev-client`) para el bundle JS.
set -euo pipefail
cd "$(dirname "$0")/.."

UDID="${1:-00008150-000A422A0ADA401C}"
ID="${AZ_SIGN_ID:-Apple Development: Yulian Andres Diaz Garcia (FR3RP4VKXV)}"
SCHEME="Azahares"
WS="ios/Azahares.xcworkspace"

echo "▶ Compilando ($SCHEME, Debug) para $UDID…"
xcodebuild -workspace "$WS" -scheme "$SCHEME" -configuration Debug \
  -destination "id=$UDID" -allowProvisioningUpdates build | tail -3

APP=$(ls -dt ~/Library/Developer/Xcode/DerivedData/Azahares-*/Build/Products/Debug-iphoneos/Azahares.app 2>/dev/null | head -1)
[ -n "$APP" ] || { echo "✖ no se encontró la .app compilada"; exit 1; }
echo "▶ App: $APP"

echo "▶ Firmando frameworks sin firma…"
for f in "$APP"/Frameworks/*.framework; do
  codesign -v "$f" >/dev/null 2>&1 || { echo "   firmando $(basename "$f")"; codesign --force --timestamp=none --sign "$ID" "$f"; }
done
codesign --force --deep --timestamp=none --preserve-metadata=entitlements --sign "$ID" "$APP" >/dev/null

echo "▶ Instalando en el dispositivo…"
xcrun devicectl device install app --device "$UDID" "$APP" | tail -3

echo "▶ Lanzando…"
xcrun devicectl device process launch --device "$UDID" com.logirapid.azaharesfuel | tail -2
echo "✓ Listo."
