#!/usr/bin/env bash
# Installs the local-database Git hooks (post-merge, post-checkout, post-commit) as symlinks into this
# clone's hooks directory, so they stay in step with the versions in the repo. Existing hooks that
# are not ours are left alone and reported (this repo already has a prepare-commit-msg hook).
#
#   scripts/local-supabase/install-hooks.sh            install
#   scripts/local-supabase/install-hooks.sh --remove   remove the symlinks it created
set -eu
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HOOKS_DIR="$(git -C "$REPO_ROOT" rev-parse --git-path hooks)"
case "$HOOKS_DIR" in /*) ;; *) HOOKS_DIR="$REPO_ROOT/$HOOKS_DIR" ;; esac
SRC="$REPO_ROOT/scripts/local-supabase/hooks"

chmod +x "$SRC"/* "$REPO_ROOT"/scripts/local-supabase/*.sh
for hook in post-merge post-checkout post-commit; do
  target="$HOOKS_DIR/$hook"
  if [ "${1:-}" = "--remove" ]; then
    if [ -L "$target" ] && [ "$(readlink "$target")" = "$SRC/$hook" ]; then rm "$target"; echo "removed $hook"; fi
    continue
  fi
  if [ -e "$target" ] && [ ! -L "$target" ]; then
    echo "skipped $hook: a different hook already exists at $target"
    continue
  fi
  ln -sfn "$SRC/$hook" "$target"
  echo "installed $hook"
done
