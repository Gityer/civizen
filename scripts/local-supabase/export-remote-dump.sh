#!/usr/bin/env bash
# Data-only export of the Civizen database for loading into the LOCAL Supabase (import-dump.sh).
# Run it ON the database host (or anywhere with `docker exec` access to the Postgres container) by
# someone who is authorised to read production data. It writes one gzipped SQL file and a manifest.
#
# Deliberately NOT exported:
#   - identity verification cases, artifacts, reviews and providers (ID documents and face photos)
#   - private messages, conversations, members, blocks and the older chat table
#   - social account OAuth tokens/state and push-device tokens (credentials)
#   - auth.users password hashes and one-time tokens (everyone gets a known LOCAL password on import)
#   - all storage object bytes (avatars, files); only database rows are exported
#
#   scripts/local-supabase/export-remote-dump.sh [output-file]
#   CIVIZEN_DB_CONTAINER=<name>   override the Postgres container name (auto-detected otherwise)
set -euo pipefail

DB="${CIVIZEN_DB_CONTAINER:-$(docker ps --format '{{.Names}}' | grep -E 'supabase[-_]db' | head -1 || true)}"
[ -n "$DB" ] || { echo "No Postgres container found; set CIVIZEN_DB_CONTAINER." >&2; exit 1; }
OUT="${1:-civizen-data-$(date +%Y%m%d-%H%M%S).sql.gz}"

EXCLUDED=(
  public.identity_verification_artifacts
  public.identity_verification_cases
  public.identity_verification_reviews
  public.identity_verification_providers
  public.private_messages
  public.private_conversations
  public.private_conversation_members
  public.private_message_blocks
  public.messages
  public.social_account_connections
  public.social_crossposts
  public.social_oauth_states
  public.civic_device_registrations
)

psql_db() { docker exec -i "$DB" psql -U postgres -d postgres "$@"; }

# Column list for a table, without generated columns and (optionally) credential-like columns.
columns_of() { # schema table
  psql_db -tAc "select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    from information_schema.columns
    where table_schema = '$1' and table_name = '$2' and is_generated = 'NEVER'
      and column_name !~ '(password|token)'"
}

dump_args=(--data-only --no-owner --no-privileges -n public)
for table in "${EXCLUDED[@]}"; do dump_args+=("--exclude-table-data=$table"); done

{
  echo "-- Civizen data export $(date -u +%Y-%m-%dT%H:%M:%SZ). Loaded by scripts/local-supabase/import-dump.sh."
  echo "SET session_replication_role = replica;"
  # The "circular foreign-key" warnings are expected: the import runs with triggers/FKs disabled
  # (session_replication_role = replica above), so they are filtered out here.
  docker exec "$DB" pg_dump -U postgres -d postgres "${dump_args[@]}" 2> >(grep -Ev 'circular foreign-key|^pg_dump: (detail|hint):' >&2)
  for table in users identities; do
    cols="$(columns_of auth "$table")"
    echo "COPY auth.$table ($cols) FROM stdin;"
    psql_db -c "COPY (select $cols from auth.$table) TO STDOUT"
    echo '\.'
  done
} | gzip > "$OUT"

{
  echo "Civizen data export manifest"
  echo "Container: $DB"
  echo "Excluded table data:"; printf '  %s\n' "${EXCLUDED[@]}"
  echo "Excluded: auth password hashes and tokens, storage object bytes."
} > "$OUT.manifest.txt"

echo "Wrote $OUT ($(du -h "$OUT" | cut -f1)) and $OUT.manifest.txt"
