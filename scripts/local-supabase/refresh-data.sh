#!/usr/bin/env bash
# Refreshes the LOCAL database data from a privacy-reduced production dump, safely:
# a snapshot of the current local data is taken first and can be restored.
#
#   scripts/local-supabase/refresh-data.sh <dump.sql.gz>        from a file
#   scripts/local-supabase/refresh-data.sh <https://...>        download first; send the token in
#                                                               $CIVIZEN_DUMP_TOKEN (Authorization: Bearer)
#   scripts/local-supabase/refresh-data.sh --restore <snapshot> put a previous local snapshot back
#   scripts/local-supabase/refresh-data.sh --latest             use $CIVIZEN_DUMP_URL as the source
#
# Snapshots live in $CIVIZEN_LOCAL_SUPABASE_DIR/snapshots (default ~/civizen-local-supabase/snapshots);
# the newest 5 are kept. The dump itself is produced on the server by export-remote-dump.sh.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DB="supabase_db_civizen-local"
SNAP_DIR="${CIVIZEN_LOCAL_SUPABASE_DIR:-$HOME/civizen-local-supabase}/snapshots"
KEEP=5

psql_db() { docker exec -i "$DB" psql -U postgres -d postgres "$@"; }
docker inspect "$DB" >/dev/null 2>&1 || { echo "Local stack is not running (scripts/local-supabase/up.sh)." >&2; exit 1; }

snapshot() {
  mkdir -p "$SNAP_DIR"
  local out="$SNAP_DIR/local-$(date +%Y%m%d-%H%M%S).sql.gz"
  # Everything, including password hashes: this is a local backup, not an export.
  {
    echo "SET session_replication_role = replica;"
    docker exec "$DB" pg_dump -U postgres -d postgres --data-only --no-owner --no-privileges -n public \
      2> >(grep -Ev 'circular foreign-key|^pg_dump: (detail|hint):' >&2)
    for table in users identities; do
      cols=$(psql_db -tAc "select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
        from information_schema.columns where table_schema='auth' and table_name='$table' and is_generated='NEVER'")
      echo "COPY auth.$table ($cols) FROM stdin;"
      psql_db -c "COPY (select $cols from auth.$table) TO STDOUT"
      echo '\.'
    done
  } | gzip > "$out"
  ls -1t "$SNAP_DIR"/local-*.sql.gz | tail -n +$((KEEP + 1)) | xargs -r rm -f
  echo "$out"
}

if [ "${1:-}" = "--restore" ]; then
  file="${2:?usage: refresh-data.sh --restore <snapshot.sql.gz>}"
  CIVIZEN_IMPORT_FORCE=1 CIVIZEN_KEEP_PASSWORDS=1 "$REPO_ROOT/scripts/local-supabase/import-dump.sh" "$file"
  exit 0
fi

source_arg="${1:-}"
if [ "$source_arg" = "--latest" ]; then source_arg="${CIVIZEN_DUMP_URL:?set CIVIZEN_DUMP_URL}"; fi
[ -n "$source_arg" ] || { sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 1; }

dump="$source_arg"
if [[ "$source_arg" =~ ^https?:// ]]; then
  dump="$(mktemp --suffix=.sql.gz)"
  trap 'rm -f "$dump"' EXIT
  auth=(); [ -n "${CIVIZEN_DUMP_TOKEN:-}" ] && auth=(-H "Authorization: Bearer $CIVIZEN_DUMP_TOKEN")
  curl -fsSL "${auth[@]}" -o "$dump" "$source_arg"
fi
[ -f "$dump" ] || { echo "No such file: $dump" >&2; exit 1; }

snap="$(snapshot)"
echo "Snapshot of current local data: $snap"
if CIVIZEN_IMPORT_FORCE=1 "$REPO_ROOT/scripts/local-supabase/import-dump.sh" "$dump"; then
  echo "Refreshed. To undo: scripts/local-supabase/refresh-data.sh --restore $snap"
else
  echo "Import failed; restoring the snapshot..." >&2
  CIVIZEN_IMPORT_FORCE=1 CIVIZEN_KEEP_PASSWORDS=1 "$REPO_ROOT/scripts/local-supabase/import-dump.sh" "$snap" >/dev/null
  echo "Local data restored from $snap" >&2
  exit 1
fi
