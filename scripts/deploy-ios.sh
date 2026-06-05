#!/usr/bin/env bash
# Deploy de la app al iPhone fisico en un comando.
# - Compila (Debug) reusando la DerivedData de Expo (incremental).
# - Firma los frameworks que el build deja sin firma (bug Xcode 26 + RN prebuilt)
#   y re-firma la .app, evitando ApplicationVerificationFailed.
# - Instala y lanza en el dispositivo.
# Requiere Metro corriendo aparte: npx expo start --dev-client
set -eo pipefail
cd "$(dirname "$0")/.."

UDID="${1:-00008150-000A422A0ADA401C}"
CONFIG="${CONFIG:-Debug}"
SIGN_ID="${AZ_SIGN_ID:-Apple Development: Yulian Andres Diaz Garcia (FR3RP4VKXV)}"
SCHEME="Azahares"
WS="ios/Azahares.xcworkspace"

echo ">> Compilando ($SCHEME, $CONFIG) para $UDID"
xcodebuild -workspace "$WS" -scheme "$SCHEME" -configuration "$CONFIG" \
  -destination "id=$UDID" -allowProvisioningUpdates build | tail -3

APP=$(ls -dt ~/Library/Developer/Xcode/DerivedData/Azahares-*/Build/Products/$CONFIG-iphoneos/Azahares.app 2>/dev/null | head -1)
if [ -z "$APP" ]; then echo "ERROR: no se encontro la .app"; exit 1; fi
echo ">> App: $APP"

echo ">> Firmando frameworks sin firma"
for f in "$APP"/Frameworks/*.framework; do
  if ! codesign -v "$f" >/dev/null 2>&1; then
    echo "   firmando $(basename "$f")"
    codesign --force --timestamp=none --sign "$SIGN_ID" "$f"
  fi
done
codesign --force --deep --timestamp=none --preserve-metadata=entitlements --sign "$SIGN_ID" "$APP" >/dev/null

echo ">> Instalando"
xcrun devicectl device install app --device "$UDID" "$APP" | tail -3
echo ">> Lanzando"
xcrun devicectl device process launch --device "$UDID" com.logirapid.azaharesfuel | tail -2
echo ">> Listo"
