#!/usr/bin/env bash
# Backup and restore drill for the Civizen database. Runs where it can `docker exec` into the database container (the
# host, or a developer machine with the local stack).
#
#   1. pg_dump (custom format) of the live database into CIVIZEN_BACKUP_DIR, plus a .sha256 next to it
#   2. pg_restore of that file into a scratch database in the same server
#   3. compares the row count of every table in public and auth between live and restored
#   4. drops the scratch database, keeps the newest CIVIZEN_BACKUP_KEEP dumps
#   5. optionally hands the dump to CIVIZEN_BACKUP_OFFSITE_CMD (e.g. an rclone or scp command; the file path is
#      appended), so a copy leaves the host
# Exits non-zero when the dump, the restore or any count fails, so a scheduler (cron, systemd timer) can alert.
#
#   scripts/db/backup-restore-drill.sh                          # local stack (supabase_db_civizen-local)
#   CIVIZEN_DB_CONTAINER=<db container> CIVIZEN_BACKUP_DIR=/var/backups/civizen scripts/db/backup-restore-drill.sh
#
# Rows written between the dump and the count are tolerated only for tables named in CIVIZEN_DRILL_VOLATILE
# (space separated, default: tables that change every minute); every other difference fails the drill.
set -euo pipefail

CONTAINER="${CIVIZEN_DB_CONTAINER:-supabase_db_civizen-local}"
DB_USER="${CIVIZEN_DB_USER:-postgres}"
DB_NAME="${CIVIZEN_DB_NAME:-postgres}"
BACKUP_DIR="${CIVIZEN_BACKUP_DIR:-$HOME/civizen-db-backups}"
KEEP="${CIVIZEN_BACKUP_KEEP:-14}"
SCRATCH="civizen_restore_drill"
VOLATILE=" ${CIVIZEN_DRILL_VOLATILE:-public.participation_page_views public.client_error_reports public.rate_limit_events public.sign_in_attempts auth.sessions auth.refresh_tokens auth.audit_log_entries auth.flow_state} "

psql_in() { docker exec -i "$CONTAINER" psql -U "$DB_USER" -v ON_ERROR_STOP=1 -At "$@"; }

# Exact row counts of every ordinary table in public and auth, as "schema.table count" lines.
count_rows() {
  local db="$1"
  psql_in -d "$db" -c "
    SELECT format('SELECT %L || '' '' || count(*) FROM %I.%I;', n.nspname || '.' || c.relname, n.nspname, c.relname)
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relkind IN ('r', 'p') AND n.nspname IN ('public', 'auth')
     ORDER BY 1" | psql_in -d "$db" | sort
}

mkdir -p "$BACKUP_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
dump="$BACKUP_DIR/civizen-$stamp.dump"

echo "1/5 dump → $dump"
docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$dump"
(cd "$BACKUP_DIR" && sha256sum "$(basename "$dump")" > "$(basename "$dump").sha256")
echo "    $(du -h "$dump" | cut -f1), sha256 $(cut -c1-16 "$dump.sha256")…"
live_counts="$(count_rows "$DB_NAME")"

echo "2/5 restore into scratch database $SCRATCH"
psql_in -d "$DB_NAME" -c "DROP DATABASE IF EXISTS $SCRATCH" >/dev/null
psql_in -d "$DB_NAME" -c "CREATE DATABASE $SCRATCH" >/dev/null
cleanup() { psql_in -d "$DB_NAME" -c "DROP DATABASE IF EXISTS $SCRATCH" >/dev/null 2>&1 || true; }
trap cleanup EXIT
# Supabase objects owned by roles other than the dump user (extension internals, role grants) report errors that do
# not affect the data; the counts below are what decides whether the restore is usable.
restore_log="$(docker exec -i "$CONTAINER" pg_restore -U "$DB_USER" -d "$SCRATCH" --no-owner < "$dump" 2>&1 || true)"
echo "    pg_restore warnings: $(grep -c 'error:' <<<"$restore_log" || true)"

echo "3/5 compare row counts"
restored_counts="$(count_rows "$SCRATCH")"
failures=0
while read -r table live; do
  restored="$(awk -v t="$table" '$1 == t { print $2 }' <<<"$restored_counts")"
  if [ -z "$restored" ]; then
    echo "    MISSING  $table (live $live)"; failures=$((failures + 1))
  elif [ "$restored" != "$live" ]; then
    if [[ "$VOLATILE" == *" $table "* ]]; then
      echo "    changed  $table (live $live, restored $restored; written during the drill)"
    else
      echo "    MISMATCH $table (live $live, restored $restored)"; failures=$((failures + 1))
    fi
  fi
done <<<"$live_counts"
echo "    $(wc -l <<<"$live_counts") tables compared, $failures failing"

echo "4/5 drop scratch database, keep the newest $KEEP dumps"
cleanup
trap - EXIT
ls -1t "$BACKUP_DIR"/civizen-*.dump 2>/dev/null | tail -n +"$((KEEP + 1))" | while read -r old; do rm -f "$old" "$old.sha256"; done

if [ -n "${CIVIZEN_BACKUP_OFFSITE_CMD:-}" ]; then
  echo "5/5 off-site copy"
  # shellcheck disable=SC2086 # the command is a configured command line
  $CIVIZEN_BACKUP_OFFSITE_CMD "$dump"
  $CIVIZEN_BACKUP_OFFSITE_CMD "$dump.sha256"
else
  echo "5/5 off-site copy skipped (CIVIZEN_BACKUP_OFFSITE_CMD not set): this dump exists only on this host"
fi

if [ "$failures" -gt 0 ]; then
  echo "DRILL FAILED: $failures table(s) differ after restore" >&2
  exit 1
fi
echo "DRILL OK: $dump restores with every table's rows"
