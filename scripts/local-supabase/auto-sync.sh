#!/usr/bin/env bash
# Keeps the local Civizen database schema in step with supabase/migrations. Called by the Git hooks
# installed by install-hooks.sh (after pull/merge, branch switch, and commits that add migrations).
#
# It never fails the Git operation: if Docker or the local stack is not running it exits quietly;
# if a migration cannot be applied it prints one warning with the log location.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DB="${CIVIZEN_LOCAL_DB_CONTAINER:-supabase_db_civizen-local}"
LOG="${TMPDIR:-/tmp}/civizen-local-sync.log"

command -v docker >/dev/null 2>&1 || exit 0
[ "$(docker inspect -f '{{.State.Running}}' "$DB" 2>/dev/null)" = "true" ] || exit 0

if "$REPO_ROOT/scripts/local-supabase/replay-migrations.sh" >"$LOG" 2>&1; then
  count=$(grep -cE '^applied [0-9]{14}_' "$LOG" || true)
  [ "$count" -gt 0 ] && echo "[civizen] applied $count new migration(s) to the local database"
else
  echo "[civizen] local database sync FAILED - $(grep -m1 '^FAILED' "$LOG") (details: $LOG)" >&2
fi
exit 0
