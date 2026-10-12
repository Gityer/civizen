#!/usr/bin/env bash
# Copy tracked native Android overlays into the local (often gitignored) android/ tree.
# Run after `npx cap sync android` so custom install support survives Capacitor sync.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$ROOT_DIR/native/android"
DST_DIR="$ROOT_DIR/android"

if [ ! -d "$DST_DIR/app/src/main" ]; then
  echo "Android project not found at $DST_DIR — skip native overlays." >&2
  exit 0
fi

if [ ! -d "$SRC_DIR" ]; then
  echo "Native overlay source missing at $SRC_DIR" >&2
  exit 1
fi

echo "Applying Android native overlays from native/android/..."
mkdir -p "$DST_DIR/app/src/main/java/com/civizen/app"
mkdir -p "$DST_DIR/app/src/main/res/xml"

cp "$SRC_DIR/app/src/main/AndroidManifest.xml" "$DST_DIR/app/src/main/AndroidManifest.xml"
cp "$SRC_DIR/app/src/main/res/xml/file_paths.xml" "$DST_DIR/app/src/main/res/xml/file_paths.xml"
cp "$SRC_DIR/app/src/main/java/com/civizen/app/MainActivity.java" \
  "$DST_DIR/app/src/main/java/com/civizen/app/MainActivity.java"
for plugin in ApkUpdaterPlugin BiometricAuthPlugin; do
  cp "$SRC_DIR/app/src/main/java/com/civizen/app/$plugin.java" \
    "$DST_DIR/app/src/main/java/com/civizen/app/$plugin.java"
done

echo "Android native overlays applied."
