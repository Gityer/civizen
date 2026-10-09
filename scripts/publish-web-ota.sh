#!/usr/bin/env bash
# Publishes the web OTA bundle and manifest for the Android sideload channel (Phase 9 step 9.3, per
# docs/04-operations/dev/OTA_UPDATES_PLAN.md): archives the built web layer (tar.gz), records its SHA-256 and size, writes
# public/updates/web-android.json (+ .js mirror) and keeps the last three bundles. Run after a production build;
# scripts/update-application.sh calls it. The native shell's download-and-activate step is a separate, owner-gated change.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
BUNDLE_DIR="$ROOT_DIR/public/updates/bundles"
MANIFEST_DIR="$ROOT_DIR/public/updates"
RELEASE_METADATA_FILE="$ROOT_DIR/src/lib/app-release.ts"
KEEP="${WEB_OTA_KEEP:-3}"

APP_VERSION="$(sed -n "s/^export const APP_VERSION = '\(.*\)';$/\1/p" "$RELEASE_METADATA_FILE")"
ANDROID_VERSION_CODE="$(sed -n "s/^export const ANDROID_VERSION_CODE = \([0-9][0-9]*\);$/\1/p" "$RELEASE_METADATA_FILE")"
MIN_NATIVE_VERSION="${WEB_OTA_MIN_NATIVE_VERSION:-$APP_VERSION}"
MIN_NATIVE_BUILD="${WEB_OTA_MIN_NATIVE_BUILD:-$ANDROID_VERSION_CODE}"
HOST="${WEB_OTA_HOST:-https://civizen.world}"

[ -f "$DIST_DIR/index.html" ] || { echo "dist/index.html missing: run the production build first" >&2; exit 1; }
mkdir -p "$BUNDLE_DIR"

BUNDLE_NAME="civizen-web-$APP_VERSION.tar.gz"
BUNDLE_PATH="$BUNDLE_DIR/$BUNDLE_NAME"
TMP_TAR="$(mktemp -u).tar.gz"
# deterministic archive (tar is available everywhere, zip is not): sorted entries, fixed mtime, no owner, gzip without name or time
( cd "$DIST_DIR" && find . -type f ! -path './updates/bundles/*' ! -path './downloads/*' -print | LC_ALL=C sort \
  | tar --create --files-from=- --mtime="@${SOURCE_DATE_EPOCH:-0}" --owner=0 --group=0 --numeric-owner --format=gnu \
  | gzip -n -9 > "$TMP_TAR" )
mv "$TMP_TAR" "$BUNDLE_PATH"

SHA="$(sha256sum "$BUNDLE_PATH" | cut -d' ' -f1)"
SIZE="$(stat -c %s "$BUNDLE_PATH")"
PUBLISHED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

cat > "$MANIFEST_DIR/web-android.json" <<JSON
{
  "platform": "android",
  "channel": "web-ota",
  "bundleVersion": "$APP_VERSION",
  "bundlePath": "/updates/bundles/$BUNDLE_NAME",
  "bundleUrl": "$HOST/updates/bundles/$BUNDLE_NAME",
  "bundleSha256": "$SHA",
  "bundleSize": $SIZE,
  "minNative": { "version": "$MIN_NATIVE_VERSION", "buildNumber": $MIN_NATIVE_BUILD },
  "mandatory": false,
  "publishedAt": "$PUBLISHED_AT"
}
JSON
cat > "$MANIFEST_DIR/web-android.js" <<JS
window.__CIVIZEN_WEB_OTA__ = $(cat "$MANIFEST_DIR/web-android.json");
JS

# keep the newest bundles only (by version-sorted name)
ls -1 "$BUNDLE_DIR"/civizen-web-*.tar.gz 2>/dev/null | sort -V | head -n -"$KEEP" | xargs -r rm -f
echo "web OTA bundle: $BUNDLE_NAME ($SIZE bytes, sha256 $SHA)"
