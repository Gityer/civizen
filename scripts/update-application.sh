#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"
APK_SOURCE="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
APK_TARGET_DIR="$ROOT_DIR/public/downloads"
APK_TARGET="$APK_TARGET_DIR/civizen-debug.apk"
UPDATE_MANIFEST_DIR="$ROOT_DIR/public/updates"
RELEASE_METADATA_FILE="$ROOT_DIR/src/lib/app-release.ts"
APP_VERSION="$(sed -n "s/^export const APP_VERSION = '\\(.*\\)';$/\\1/p" "$RELEASE_METADATA_FILE")"
ANDROID_VERSION_CODE="$(sed -n "s/^export const ANDROID_VERSION_CODE = \\([0-9][0-9]*\\);$/\\1/p" "$RELEASE_METADATA_FILE")"
RELEASE_ID="$(sed -n "s/^export const APP_RELEASE_ID = '\\(.*\\)';$/\\1/p" "$RELEASE_METADATA_FILE")"
CHANNEL="${CIVIZEN_UPDATE_CHANNEL:-both}"

resolve_channel_suffix() {
  case "$1" in
    testing)
      echo "testing"
      ;;
    release)
      echo "release"
      ;;
    *)
      echo ""
      ;;
  esac
}

versioned_apk_filename() {
  local suffix
  suffix="$(resolve_channel_suffix "$1")"
  echo "civizen-debug-${suffix}-${RELEASE_ID}.apk"
}
JDK_CACHE_DIR="/tmp/civizen-jdk"
JDK_ARCHIVE="$JDK_CACHE_DIR/temurin21.tar.gz"
JDK_DOWNLOAD_URL="https://api.adoptium.net/v3/binary/latest/21/ga/linux/x64/jdk/hotspot/normal/eclipse"
export VITE_DISTRIBUTION_CHANNEL="${VITE_DISTRIBUTION_CHANNEL:-sideload}"

ensure_java() {
  if command -v java >/dev/null 2>&1; then
    return
  fi

  if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/java" ]; then
    export PATH="$JAVA_HOME/bin:$PATH"
    return
  fi

  mkdir -p "$JDK_CACHE_DIR/extracted"

  if [ ! -f "$JDK_ARCHIVE" ]; then
    curl -L -o "$JDK_ARCHIVE" "$JDK_DOWNLOAD_URL"
  fi

  if ! find "$JDK_CACHE_DIR/extracted" -mindepth 1 -maxdepth 1 -type d | grep -q .; then
    tar -xzf "$JDK_ARCHIVE" -C "$JDK_CACHE_DIR/extracted"
  fi

  JAVA_HOME="$(find "$JDK_CACHE_DIR/extracted" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
  export JAVA_HOME
  export PATH="$JAVA_HOME/bin:$PATH"

  if ! command -v java >/dev/null 2>&1; then
    echo "Java is required to build the Android APK." >&2
    exit 1
  fi
}

prune_download_archive() {
  local channel="$1"
  local suffix
  suffix="$(resolve_channel_suffix "$channel")"
  if [ -z "$suffix" ]; then
    return
  fi

  mkdir -p "$APK_TARGET_DIR"

  local -a versioned_apks=()
  mapfile -t versioned_apks < <(cd "$APK_TARGET_DIR" && ls -1t "civizen-debug-${suffix}-"*.apk 2>/dev/null || true)
  if [ "${#versioned_apks[@]}" -eq 0 ]; then
    return
  fi

  for apk_file in "${versioned_apks[@]}"; do
    if [ "$apk_file" = "$(versioned_apk_filename "$channel")" ]; then
      continue
    fi
    rm -f "$APK_TARGET_DIR/$apk_file"
  done
}

# Release notes: the feat/fix subjects committed since the previous release commit (no tags are used).
release_notes_json() {
  local since range lines
  since="$(git -C "$ROOT_DIR" log --grep='^chore(release)' -n1 --format=%H 2>/dev/null || true)"
  range="HEAD"
  if [ -n "$since" ]; then range="${since}..HEAD"; fi
  lines="$(git -C "$ROOT_DIR" log --no-merges --format=%s "$range" 2>/dev/null | grep -E '^(feat|fix)(\(|:)' | sed -E 's/^(feat|fix)(\([^)]*\))?: ?//' | head -6 || true)"
  if [ -z "$lines" ]; then
    printf '["Latest Civizen Android release built from the current application.", "Open Settings to confirm the installed version and build number."]'
    return
  fi
  node -e 'const lines = process.argv[1].split("\n").map((s) => s.trim()).filter(Boolean); process.stdout.write(JSON.stringify(lines))' "$lines"
}

write_update_manifest() {
  local channel="$1"
  local suffix
  suffix="$(resolve_channel_suffix "$channel")"
  if [ -z "$suffix" ]; then
    echo "Unknown update channel: $channel" >&2
    exit 1
  fi

  local apk_filename
  apk_filename="$(versioned_apk_filename "$channel")"
  local apk_path="/downloads/$apk_filename"
  local apk_url="https://civizen.world${apk_path}?v=${RELEASE_ID}"
  local apk_sha256=""
  if [ -f "$APK_TARGET_DIR/$apk_filename" ]; then
    apk_sha256="$(sha256sum "$APK_TARGET_DIR/$apk_filename" | cut -d' ' -f1)"
  fi
  local notes_json
  notes_json="$(release_notes_json)"

  mkdir -p "$UPDATE_MANIFEST_DIR"
  local published_at
  published_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  local manifest_suffix="android-${suffix}"

  cat > "$UPDATE_MANIFEST_DIR/${manifest_suffix}.json" <<EOF
{
  "platform": "android",
  "version": "$APP_VERSION",
  "versionTag": "v$APP_VERSION",
  "buildNumber": $ANDROID_VERSION_CODE,
  "releaseId": "$RELEASE_ID",
  "downloadPath": "$apk_path",
  "downloadUrl": "$apk_url",
  "publishedAt": "$published_at",
  "sha256": "$apk_sha256",
  "notes": $notes_json
}
EOF

  cat > "$UPDATE_MANIFEST_DIR/${manifest_suffix}.js" <<EOF
window.__CIVIZEN_ANDROID_UPDATE__ = {
  platform: 'android',
  version: '$APP_VERSION',
  versionTag: 'v$APP_VERSION',
  buildNumber: $ANDROID_VERSION_CODE,
  releaseId: '$RELEASE_ID',
  downloadPath: '$apk_path',
  downloadUrl: '$apk_url',
  publishedAt: '$published_at',
  sha256: '$apk_sha256',
  notes: $notes_json,
};
EOF
}

write_legacy_manifest() {
  if [ ! -f "$UPDATE_MANIFEST_DIR/android-release.json" ]; then
    return
  fi
  cp "$UPDATE_MANIFEST_DIR/android-release.json" "$UPDATE_MANIFEST_DIR/android.json"
  cp "$UPDATE_MANIFEST_DIR/android-release.js" "$UPDATE_MANIFEST_DIR/android.js"
}

echo "Generating icon assets from production SVG sources..."
npm run icons:generate

echo "Building the web app for Android sync..."
npm run build:android

echo "Removing website APK artifacts from Android web assets..."
rm -rf "$ROOT_DIR/dist/downloads"

echo "Syncing the latest web assets into the Android project..."
npx cap sync android

echo "Applying tracked Android native overlays (in-app APK installer)..."
bash "$ROOT_DIR/scripts/apply-android-native-overlays.sh"

echo "Preparing Java for the Android build..."
ensure_java

echo "Building the Android debug APK..."
(
  cd "$ANDROID_DIR"
  ./gradlew clean assembleDebug
)

if [ ! -f "$APK_SOURCE" ]; then
  echo "Expected APK not found at $APK_SOURCE" >&2
  exit 1
fi

echo "Publishing the APK into the website download path ($CHANNEL channel)..."
mkdir -p "$APK_TARGET_DIR"
if [ "$CHANNEL" = "both" ]; then
  cp "$APK_SOURCE" "$APK_TARGET"
  for channel in testing release; do
    apk_filename="$(versioned_apk_filename "$channel")"
    cp "$APK_SOURCE" "$APK_TARGET_DIR/$apk_filename"
    prune_download_archive "$channel"
    write_update_manifest "$channel"
  done
  # Same APK bytes as channel builds; matches src/lib/downloads.ts (ANDROID_DOWNLOAD_FILENAME).
  cp "$APK_SOURCE" "$APK_TARGET_DIR/civizen-debug-${RELEASE_ID}.apk"
  write_legacy_manifest
else
  apk_filename="$(versioned_apk_filename "$CHANNEL")"
  if [ "$CHANNEL" = "testing" ]; then
    cp "$APK_SOURCE" "$APK_TARGET"
  fi
  cp "$APK_SOURCE" "$APK_TARGET_DIR/$apk_filename"
  cp "$APK_SOURCE" "$APK_TARGET_DIR/civizen-debug-${RELEASE_ID}.apk"
  prune_download_archive "$CHANNEL"
  write_update_manifest "$CHANNEL"
  if [ "$CHANNEL" = "release" ]; then
    write_legacy_manifest
  fi
fi

echo "Rebuilding the website so the download path includes the latest APK..."
npm run build

echo "Application update complete."
echo "APK source: $APK_SOURCE"
if [ "$CHANNEL" = "both" ] || [ "$CHANNEL" = "testing" ]; then
  echo "Website download target: $APK_TARGET"
fi
if [ "$CHANNEL" = "both" ]; then
  echo "Website versioned APK target: $APK_TARGET_DIR/$(versioned_apk_filename testing)"
  echo "Website versioned APK target: $APK_TARGET_DIR/$(versioned_apk_filename release)"
else
  echo "Website versioned APK target: $APK_TARGET_DIR/$(versioned_apk_filename "$CHANNEL")"
fi
