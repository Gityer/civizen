#!/usr/bin/env bash
# Loads a dump made by export-remote-dump.sh into the LOCAL Civizen Supabase only.
#
#   scripts/local-supabase/import-dump.sh <civizen-data-....sql.gz>
#   CIVIZEN_IMPORT_FORCE=1 ...   wipe existing local data first (otherwise refuses on a non-empty database)
#
# After loading, every account gets the local password "civizen-local" (real password hashes are not
# exported) and emails are marked confirmed, so you can sign in locally as any member.
set -euo pipefail

DB="supabase_db_civizen-local"   # fixed on purpose: this script must never touch another database
DUMP="${1:?usage: import-dump.sh <dump.sql.gz>}"
[ -f "$DUMP" ] || { echo "No such file: $DUMP" >&2; exit 1; }
docker inspect "$DB" >/dev/null 2>&1 || { echo "Local container $DB is not running (scripts/local-supabase/up.sh)." >&2; exit 1; }

psql_db() { docker exec -i "$DB" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
existing=$(psql_db -tAc "select count(*) from public.profiles")
if [ "$existing" != "0" ]; then
  [ "${CIVIZEN_IMPORT_FORCE:-}" = "1" ] || { echo "Local database already has $existing profiles; set CIVIZEN_IMPORT_FORCE=1 to wipe it first." >&2; exit 1; }
  echo "Wiping existing local data..."
  psql_db -c "do \$\$
    begin
      execute (select 'truncate ' || string_agg(format('%I.%I', schemaname, tablename), ', ') || ' cascade'
               from pg_tables where schemaname = 'public');
      truncate auth.identities, auth.users cascade;
    end \$\$;"
fi

echo "Loading $DUMP ..."
gzip -dc "$DUMP" | psql_db

# GoTrue cannot sign in a user whose token columns are NULL ("converting NULL to string is unsupported",
# HTTP 500 on /token). pg_dump of production leaves them NULL, so normalise them to empty strings.
psql_db -c "update auth.users
  set confirmation_token = coalesce(confirmation_token, ''),
      recovery_token = coalesce(recovery_token, ''),
      email_change_token_new = coalesce(email_change_token_new, ''),
      email_change = coalesce(email_change, ''),
      email_change_token_current = coalesce(email_change_token_current, ''),
      phone_change = coalesce(phone_change, ''),
      phone_change_token = coalesce(phone_change_token, ''),
      reauthentication_token = coalesce(reauthentication_token, '');"

# A local snapshot (refresh-data.sh --restore) keeps its own password hashes; a production export has none.
if [ "${CIVIZEN_KEEP_PASSWORDS:-}" != "1" ]; then
  psql_db -c "update auth.users
    set encrypted_password = extensions.crypt('civizen-local', extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now());"
  echo "Local sign-in password for every account: civizen-local"
fi

echo "Loaded: $(psql_db -tAc "select count(*) from public.profiles") profiles, $(psql_db -tAc "select count(*) from auth.users") auth users."
