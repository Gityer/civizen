#!/usr/bin/env bash
# Pushes main to the canonical public repository (origin = maturehumanity/civizen) and the mirror, then checks that
# both point at the local HEAD. Decision E1 / v2 plan step A1: the public source must never lag a release.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

BRANCH="${1:-main}"
HEAD_SHA="$(git rev-parse "$BRANCH")"
REMOTES="${CIVIZEN_RELEASE_REMOTES:-origin gityer-mirror}"

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "push-release: tracked changes are not committed; commit them first." >&2
  exit 1
fi

status=0
for remote in $REMOTES; do
  if ! git remote get-url "$remote" >/dev/null 2>&1; then
    echo "push-release: remote $remote is not configured" >&2
    status=1
    continue
  fi
  git push "$remote" "$BRANCH" 2>&1 | tail -1
  remote_sha="$(git ls-remote "$remote" "refs/heads/$BRANCH" | cut -f1)"
  if [ "$remote_sha" = "$HEAD_SHA" ]; then
    echo "push-release: $remote/$BRANCH = $HEAD_SHA"
  else
    echo "push-release: $remote/$BRANCH is $remote_sha, expected $HEAD_SHA" >&2
    status=1
  fi
done
exit $status
