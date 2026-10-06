#!/usr/bin/env bash
# Replays supabase/migrations into the local Civizen database in autocommit mode.
#
# Why not `supabase start` / `db reset`: the CLI applies each migration inside one transaction, and
# migrations that use a value added by `ALTER TYPE ... ADD VALUE` in the same file fail there
# (e.g. 20260328010000 uses `law.review`). The hosted database applied them statement by statement.
#
# Replay quirks (kept here, not by editing migration history):
#   FIXUPS  "<version> <later version>": pre-apply an idempotent later migration before a migration
#           that trips over a bug the later one repairs.
#   SKIP    data-only migrations that assert production rows exist. They are recorded as applied
#           without running; the data they changed arrives with the data import.
#
# Some versions have more than one file (e.g. 20260501040000), so progress is tracked per FILE in
# supabase_migrations.civizen_replayed; supabase_migrations.schema_migrations is still filled (by
# version) so Supabase CLI commands see the history.
#
# Usage: scripts/local-supabase/replay-migrations.sh   (database container must be running)
set -u
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DB="${CIVIZEN_LOCAL_DB_CONTAINER:-supabase_db_civizen-local}"
DIR="$REPO_ROOT/supabase/migrations"

SKIP=" 20260818030000 ${SKIP:-} "
FIXUPS=("20260424103000 20260428140000")

psqlq() { docker exec -i "$DB" psql -U postgres -q -v ON_ERROR_STOP=1 "$@"; }
mark() {
  psqlq -c "insert into supabase_migrations.civizen_replayed(file) values ('$1') on conflict do nothing; insert into supabase_migrations.schema_migrations(version,name) values ('$2','$3') on conflict do nothing" >/dev/null
}

psqlq -c "create schema if not exists supabase_migrations;
  create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);
  create table if not exists supabase_migrations.civizen_replayed (file text primary key);
  insert into supabase_migrations.civizen_replayed(file) select version || '_' || name from supabase_migrations.schema_migrations on conflict do nothing;" >/dev/null 2>&1

applied=0
replayed=$'\n'"$(docker exec -i "$DB" psql -U postgres -tAc "select file from supabase_migrations.civizen_replayed")"$'\n'
for file in $(ls "$DIR"/*.sql | sort); do
  base=$(basename "$file" .sql); version=${base%%_*}; name=${base#*_}
  [[ "$replayed" == *$'\n'"$base"$'\n'* ]] && continue   # one query up front instead of one per file
  if [[ "$SKIP" == *" $version "* ]]; then mark "$base" "$version" "$name"; echo "skipped (data-only) $base"; continue; fi
  for fixup in "${FIXUPS[@]}"; do
    set -- $fixup
    if [ "$1" = "$version" ]; then psqlq -f - < "$(ls "$DIR"/$2_*.sql)" >/dev/null 2>&1; fi
  done
  if ! psqlq -f - < "$file" >/tmp/civizen-replay-last.log 2>&1; then
    echo "FAILED at $base"; grep -v NOTICE /tmp/civizen-replay-last.log | tail -8; exit 1
  fi
  mark "$base" "$version" "$name" || { echo "could not record $base"; exit 1; }
  applied=$((applied + 1))
  echo "applied $base"
done
echo "applied $applied migrations this run"
