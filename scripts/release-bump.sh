#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_FILE="$ROOT_DIR/src/lib/app-release.ts"

if [ ! -f "$RELEASE_FILE" ]; then
  echo "Could not find release metadata file: $RELEASE_FILE" >&2
  exit 1
fi

CURRENT_VERSION="$(sed -n "s/^export const APP_VERSION = '\\(.*\\)';$/\\1/p" "$RELEASE_FILE")"
CURRENT_BUILD="$(sed -n "s/^export const ANDROID_VERSION_CODE = \\([0-9][0-9]*\\);$/\\1/p" "$RELEASE_FILE")"

if [ -z "$CURRENT_VERSION" ] || [ -z "$CURRENT_BUILD" ]; then
  echo "Could not parse current release metadata." >&2
  exit 1
fi

BUMP_TARGET="${1:-patch}"

bump_version() {
  local version="$1"
  local mode="$2"
  local major minor patch

  IFS='.' read -r major minor patch <<<"$version"

  case "$mode" in
    patch)
      patch=$((patch + 1))
      ;;
    minor)
      minor=$((minor + 1))
      patch=0
      ;;
    major)
      major=$((major + 1))
      minor=0
      patch=0
      ;;
    *)
      echo "$mode"
      return
      ;;
  esac

  echo "${major}.${minor}.${patch}"
}

if [[ "$BUMP_TARGET" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  NEXT_VERSION="$BUMP_TARGET"
elif [[ "$BUMP_TARGET" =~ ^(patch|minor|major)$ ]]; then
  NEXT_VERSION="$(bump_version "$CURRENT_VERSION" "$BUMP_TARGET")"
else
  echo "Usage: npm run release:bump -- [patch|minor|major|x.y.z]" >&2
  exit 1
fi

NEXT_BUILD=$((CURRENT_BUILD + 1))
NEXT_RELEASE_ID="$(date +%Y%m%d)-v${NEXT_VERSION}"

sed -i \
  -e "s/^export const APP_VERSION = '.*';$/export const APP_VERSION = '${NEXT_VERSION}';/" \
  -e "s/^export const ANDROID_VERSION_CODE = [0-9][0-9]*;$/export const ANDROID_VERSION_CODE = ${NEXT_BUILD};/" \
  -e "s/^export const APP_RELEASE_ID = '.*';$/export const APP_RELEASE_ID = '${NEXT_RELEASE_ID}';/" \
  "$RELEASE_FILE"

cd "$ROOT_DIR"
npm pkg set version="$NEXT_VERSION" >/dev/null
npm install --package-lock-only >/dev/null

echo "Release updated:"
echo "  version: $CURRENT_VERSION -> $NEXT_VERSION"
echo "  build:   $CURRENT_BUILD -> $NEXT_BUILD"
echo "  id:      $NEXT_RELEASE_ID"
echo
# The Civi knowledge pack and its edge bundle embed the app version; CI fails when they lag behind.
echo "Regenerating the Civi knowledge pack for ${NEXT_VERSION}..."
npx tsx scripts/assistant-knowledge.ts

echo "Next step:"
echo "  npm run update:application"
