#!/usr/bin/env bash
# Deploy local dist/ to the managed web server without wiping prior hashed /assets.
#
# Root cause this avoids: a full-directory wipe removes yesterday's chunk hashes
# while browsers still hold the previous App bundle → "Failed to fetch dynamically
# imported module" for /assets/<old-hash>.js.
#
# Usage:
#   bash scripts/deploy-web-to-vps.sh
# Requires REMOTE_SSH and REMOTE_ROOT (environment or .env.local).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="${ROOT}/dist"

if [[ -f "${ROOT}/.env.local" ]]; then
  while IFS='=' read -r raw_key raw_value; do
    [[ -z "${raw_key}" ]] && continue
    key="$(echo "${raw_key}" | tr -d '[:space:]')"
    value="$(echo "${raw_value}" | sed -E "s/^['\"]|['\"]$//g")"
    case "${key}" in
      REMOTE_SSH|REMOTE_ROOT|REMOTE_STAGE)
        if [[ -z "${!key:-}" ]]; then
          printf -v "${key}" '%s' "${value}"
          export "${key}"
        fi
        ;;
    esac
  done < <(grep -E '^(REMOTE_SSH|REMOTE_ROOT|REMOTE_STAGE)=' "${ROOT}/.env.local" || true)
fi

REMOTE_SSH="${REMOTE_SSH:?Set REMOTE_SSH (environment or .env.local)}"
REMOTE_ROOT="${REMOTE_ROOT:?Set REMOTE_ROOT (environment or .env.local)}"
REMOTE_STAGE="${REMOTE_STAGE:?Set REMOTE_STAGE (environment or .env.local)}"
ASSET_RETENTION_DAYS="${ASSET_RETENTION_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
TGZ="/tmp/civizen-dist-${STAMP}.tgz"
# Used remotely to keep the versioned APKs that belong to this deploy.
APP_RELEASE_ID="$(
  grep -E "^export const APP_RELEASE_ID" "${ROOT}/src/lib/app-release.ts" \
    | head -1 \
    | sed -E "s/.*'([^']+)'.*/\1/"
)"
APP_RELEASE_ID="${APP_RELEASE_ID:?Could not read APP_RELEASE_ID from src/lib/app-release.ts}"

if [[ ! -d "$DIST" ]]; then
  echo "Missing dist/. Run a production build first." >&2
  exit 1
fi

if [[ ! -f "$DIST/index.html" ]]; then
  echo "dist/index.html missing — refusing to deploy." >&2
  exit 1
fi

# Never put an older build over a newer live one. On 30 Oct a stale v0.1.246 dist from another worktree was deployed
# over the live v0.1.247 and silently rolled back the website and both Android manifests.
DIST_VERSION="$(node -p "require('${DIST}/updates/android-release.json').version" 2>/dev/null || true)"
LIVE_VERSION="$(curl -fsS --max-time 15 "https://civizen.world/updates/android-release.json" 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).version)}catch{console.log('')}})" || true)"
if [[ -n "${DIST_VERSION}" && -n "${LIVE_VERSION}" ]] \
  && [[ "$(printf '%s\n%s\n' "${LIVE_VERSION}" "${DIST_VERSION}" | sort -V | head -1)" != "${LIVE_VERSION}" ]] \
  && [[ "${ALLOW_VERSION_ROLLBACK:-}" != "1" ]]; then
  echo "dist is v${DIST_VERSION} but civizen.world serves v${LIVE_VERSION}: refusing to roll back (ALLOW_VERSION_ROLLBACK=1 for a deliberate rollback)." >&2
  exit 1
fi
echo "Deploying v${DIST_VERSION:-unknown} over live v${LIVE_VERSION:-unknown}"

echo "Packaging ${DIST} → ${TGZ}"
tar -C "$DIST" -czf "$TGZ" .

echo "Uploading to ${REMOTE_SSH}:${REMOTE_STAGE}/"
ssh -o BatchMode=yes "$REMOTE_SSH" "mkdir -p '${REMOTE_STAGE}' ~/civizen-backups"
scp -q "$TGZ" "${REMOTE_SSH}:${REMOTE_STAGE}/civizen-dist.tgz"

echo "Merging onto ${REMOTE_ROOT} (preserving recent /assets hashes)…"
ssh -o BatchMode=yes "$REMOTE_SSH" bash -s <<EOF
set -euo pipefail
ROOT='${REMOTE_ROOT}'
STAGE='${REMOTE_STAGE}'
STAMP='${STAMP}'
DAYS='${ASSET_RETENTION_DAYS}'
RELEASE_ID='${APP_RELEASE_ID}'
mkdir -p "\$ROOT/assets" ~/civizen-backups
backup=~/civizen-backups/civizen-\${STAMP}.tgz
sudo tar -C "\$ROOT" -czf "\$backup" . || true
# Cap backup retention — unbounded full-tree tarballs fill the VPS disk.
ls -1t ~/civizen-backups/civizen-*.tgz 2>/dev/null | tail -n +3 | xargs -r sudo rm -f || true
# Atomic for live clients: unpack into a staging folder, put every new hashed asset and file in place first, and swap
# index.html in last. A page loaded mid-deploy then never references an asset that is not there yet, which used to
# trigger the stale-chunk boot recovery (?boot_recovery=) for whoever opened the site during a deploy.
NEW="\$STAGE/new-\$STAMP"
rm -rf "\$NEW"; mkdir -p "\$NEW"
tar -C "\$NEW" -xzf "\$STAGE/civizen-dist.tgz"
sudo cp -a "\$NEW/assets/." "\$ROOT/assets/"
( cd "\$NEW" && sudo find . -mindepth 1 -maxdepth 1 ! -name index.html ! -name assets -exec cp -a {} "\$ROOT/" \; )
sudo cp "\$NEW/index.html" "\$ROOT/.index.html.new"
sudo mv -f "\$ROOT/.index.html.new" "\$ROOT/index.html"
rm -rf "\$NEW"
# Keep recently hashed assets so in-flight clients can still fetch prior chunks.
sudo find "\$ROOT/assets" -type f -mtime +"\$DAYS" -delete || true
# Keep release soak APKs, current aliases, and this deploy's versioned APKs.
if [[ -d "\$ROOT/downloads" ]]; then
  sudo find "\$ROOT/downloads" -maxdepth 1 -type f \( -name 'civizen-debug-*.apk' -o -name 'civizen-android-*.apk' \) \
    ! -name 'civizen-debug-release-*.apk' ! -name 'civizen-android-release-*.apk' \
    ! -name "civizen-debug-\${RELEASE_ID}.apk" \
    ! -name "civizen-debug-testing-\${RELEASE_ID}.apk" ! -name "civizen-android-testing-\${RELEASE_ID}.apk" \
    -delete || true
fi
rm -f "\$STAGE/civizen-dist.tgz"
echo "Deploy complete: \$ROOT (backup \$backup)"
EOF

rm -f "$TGZ"
echo "Done."
