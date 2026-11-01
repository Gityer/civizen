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
# Each replayed file's SHA-256 is recorded. A file that changed after it was applied locally (a PR branch
# tried early, then edited before merge) is reported as CHANGED and fails the run, instead of surfacing later
# as a confusing error in a newer migration that depends on it.
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
psqlq_admin() { docker exec -i "$DB" psql -U supabase_admin -q -v ON_ERROR_STOP=1 "$@"; }
mark() {
  psqlq -c "insert into supabase_migrations.civizen_replayed(file, sha256) values ('$1', '$4') on conflict (file) do update set sha256 = excluded.sha256; insert into supabase_migrations.schema_migrations(version,name) values ('$2','$3') on conflict do nothing" >/dev/null
}

psqlq -c "create schema if not exists supabase_migrations;
  create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);
  create table if not exists supabase_migrations.civizen_replayed (file text primary key);
  alter table supabase_migrations.civizen_replayed add column if not exists sha256 text;
  insert into supabase_migrations.civizen_replayed(file) select version || '_' || name from supabase_migrations.schema_migrations on conflict do nothing;" >/dev/null 2>&1

applied=0
changed=0
declare -A replayed_sha   # one query up front instead of one per file
while IFS='|' read -r f s; do [ -n "$f" ] && replayed_sha["$f"]="$s"; done \
  < <(docker exec -i "$DB" psql -U postgres -tAc "select file || '|' || coalesce(sha256, '') from supabase_migrations.civizen_replayed")
for file in $(ls "$DIR"/*.sql | sort); do
  base=$(basename "$file" .sql); version=${base%%_*}; name=${base#*_}
  sum=$(sha256sum "$file" | cut -c1-64)
  if [ -n "${replayed_sha[$base]+x}" ]; then
    stored=${replayed_sha[$base]}
    if [ -z "$stored" ]; then mark "$base" "$version" "$name" "$sum"   # recorded before checksums existed: trust it
    elif [ "$stored" != "$sum" ]; then echo "CHANGED $base (applied locally from an older version of the file)"; changed=1; fi
    continue
  fi
  if [[ "$SKIP" == *" $version "* ]]; then mark "$base" "$version" "$name" "$sum"; echo "skipped (data-only) $base"; continue; fi
  for fixup in "${FIXUPS[@]}"; do
    set -- $fixup
    if [ "$1" = "$version" ]; then psqlq -f - < "$(ls "$DIR"/$2_*.sql)" >/dev/null 2>&1; fi
  done
  # Policies on realtime.messages need its (reserved) owner role; locally only supabase_admin may act for it.
  runner=psqlq; case "$base" in *_realtime_policies.sql) runner=psqlq_admin;; esac
  if ! $runner -f - < "$file" >/tmp/civizen-replay-last.log 2>&1; then
    echo "FAILED at $base"; grep -v NOTICE /tmp/civizen-replay-last.log | tail -8; exit 1
  fi
  mark "$base" "$version" "$name" "$sum" || { echo "could not record $base"; exit 1; }
  applied=$((applied + 1))
  echo "applied $base"
done
echo "applied $applied migrations this run"
if [ "$changed" = 1 ]; then
  echo "FAILED: migration file(s) changed after they were applied locally. Re-apply them (drop the objects they"
  echo "create first) or rebuild the local database; production applies each file once, from main."
  exit 2
fi
