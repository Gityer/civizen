#!/usr/bin/env bash
# Publishes the web OTA bundle and manifest for the Android sideload channel (Phase 9 step 9.3, per
# docs/04-operations/dev/OTA_UPDATES_PLAN.md): archives the built web layer (zip), records its SHA-256 and size, writes
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

BUNDLE_NAME="civizen-web-$APP_VERSION.zip"
BUNDLE_PATH="$BUNDLE_DIR/$BUNDLE_NAME"
# deterministic zip (the Capgo updater unpacks zips; index.html at the root): sorted entries, fixed timestamps, no extras
python3 - "$DIST_DIR" "$BUNDLE_PATH" <<'PY'
import os, sys, zipfile
dist, out = sys.argv[1], sys.argv[2]
files = []
for base, dirs, names in os.walk(dist):
    rel = os.path.relpath(base, dist)
    if rel.startswith("updates/bundles") or rel == "downloads" or rel.startswith("downloads/"):
        continue
    for n in names:
        files.append(os.path.relpath(os.path.join(base, n), dist))
files.sort()
with zipfile.ZipFile(out + ".tmp", "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for f in files:
        info = zipfile.ZipInfo(f, date_time=(1980, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        with open(os.path.join(dist, f), "rb") as fh:
            z.writestr(info, fh.read())
os.replace(out + ".tmp", out)
PY

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
ls -1 "$BUNDLE_DIR"/civizen-web-*.zip 2>/dev/null | sort -V | head -n -"$KEEP" | xargs -r rm -f
echo "web OTA bundle: $BUNDLE_NAME ($SIZE bytes, sha256 $SHA)"
