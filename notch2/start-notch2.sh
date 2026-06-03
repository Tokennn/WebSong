#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
DERIVED_DATA="$ROOT_DIR/.build/DerivedData"
APP_PATH="$DERIVED_DATA/Build/Products/Debug/boringNotch.app"
XCODE_DEVELOPER_DIR="/Applications/Xcode.app/Contents/Developer"

if [[ ! -d "$XCODE_DEVELOPER_DIR" ]]; then
  echo "Erreur: Xcode complet est requis pour compiler Local Notch."
  echo "Installe Xcode depuis l'App Store, puis relance ce script."
  exit 1
fi

cd "$ROOT_DIR"
DEVELOPER_DIR="$XCODE_DEVELOPER_DIR" xcodebuild \
  -project notch2.xcodeproj \
  -scheme boringNotch \
  -configuration Debug \
  -derivedDataPath "$DERIVED_DATA" \
  build

open -n "$APP_PATH"
