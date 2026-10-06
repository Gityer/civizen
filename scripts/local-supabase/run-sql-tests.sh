#!/usr/bin/env bash
# Runs the SQL tests in supabase/tests/*_test.sql against the LOCAL Civizen database only.
# Each test file wraps itself in BEGIN ... ROLLBACK, so nothing persists.
#
#   scripts/local-supabase/run-sql-tests.sh                # all tests
#   scripts/local-supabase/run-sql-tests.sh consultation   # files whose name contains "consultation"
set -eu
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DB="${CIVIZEN_LOCAL_DB_CONTAINER:-supabase_db_civizen-local}"   # fixed on purpose: local only
FILTER="${1:-}"

if ! docker ps --format '{{.Names}}' | grep -qx "$DB"; then
  echo "Local database container $DB is not running (scripts/local-supabase/up.sh)." >&2
  exit 1
fi

status=0
for file in "$REPO_ROOT"/supabase/tests/*_test.sql; do
  name="$(basename "$file")"
  if [ -n "$FILTER" ] && [[ "$name" != *"$FILTER"* ]]; then continue; fi
  echo "== $name"
  if docker exec -i "$DB" psql -U postgres -q -v ON_ERROR_STOP=1 < "$file"; then
    echo "   passed"
  else
    echo "   FAILED" >&2
    status=1
  fi
done
exit $status
