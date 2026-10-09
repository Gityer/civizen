#!/usr/bin/env bash
# Builds the web client twice from the same tree and compares every output file (Phase 10 step 10.3: a reproducible
# client build lets a verifier confirm that the served bundle is the one the published source produces).
#
#   scripts/verify-reproducible-build.sh            # two builds, byte-for-byte comparison
#   scripts/verify-reproducible-build.sh --keep     # keep the second build directory for inspection
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

KEEP="${1:-}"
FIRST="$(mktemp -d)"
SECOND="$(mktemp -d)"
trap 'rm -rf "$FIRST"; [ "$KEEP" = "--keep" ] || rm -rf "$SECOND"' EXIT

export SOURCE_DATE_EPOCH="${SOURCE_DATE_EPOCH:-$(git log -1 --format=%ct 2>/dev/null || date +%s)}"
export TZ=UTC

echo "== build 1"
npx vite build --outDir "$FIRST" --emptyOutDir >/dev/null
echo "== build 2"
npx vite build --outDir "$SECOND" --emptyOutDir >/dev/null

echo "== compare"
( cd "$FIRST" && find . -type f -print0 | sort -z | xargs -0 sha256sum ) > "$FIRST.sums"
( cd "$SECOND" && find . -type f -print0 | sort -z | xargs -0 sha256sum ) > "$SECOND.sums"
if diff -u "$FIRST.sums" "$SECOND.sums" > "$SECOND.diff"; then
  COUNT="$(wc -l < "$FIRST.sums" | tr -d ' ')"
  echo "REPRODUCIBLE: $COUNT files identical across two builds"
  echo "bundle manifest sha256: $(sha256sum "$FIRST.sums" | cut -d' ' -f1)"
  rm -f "$FIRST.sums" "$SECOND.sums" "$SECOND.diff"
  exit 0
fi
echo "NOT REPRODUCIBLE: these outputs differ between two builds of the same tree" >&2
grep -E '^[+-][^+-]' "$SECOND.diff" | head -40 >&2
[ "$KEEP" = "--keep" ] && echo "second build kept at $SECOND" >&2
rm -f "$FIRST.sums" "$SECOND.sums"
exit 1
