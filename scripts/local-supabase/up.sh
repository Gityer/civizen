#!/usr/bin/env bash
# Starts the isolated local Civizen Supabase (db, auth, rest, storage, studio) and replays the
# repository migrations into it. Safe to re-run: already-applied migrations are skipped.
#
#   scripts/local-supabase/up.sh            start + replay
#   scripts/local-supabase/up.sh --stop     stop the stack (keeps the data volume)
#
# Work dir (CLI project files): $CIVIZEN_LOCAL_SUPABASE_DIR, default ~/civizen-local-supabase.
# Ports: API 56321, DB 56322, Studio 56323, mail 56324 (see config.toml). Nothing here touches the
# hosted database or another project's Supabase stack.
set -eu
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKDIR="${CIVIZEN_LOCAL_SUPABASE_DIR:-$HOME/civizen-local-supabase}"

mkdir -p "$WORKDIR/supabase"
cp "$REPO_ROOT/scripts/local-supabase/config.toml" "$WORKDIR/supabase/config.toml"
ln -sfn "$REPO_ROOT/supabase/functions" "$WORKDIR/supabase/functions"

cd "$WORKDIR"
if [ "${1:-}" = "--stop" ]; then
  npx -y supabase stop
  exit 0
fi

# Start with an EMPTY migrations dir so the CLI does not try its single-transaction replay;
# replay-migrations.sh applies the real ones (see that script for why).
if [ -L supabase/migrations ]; then rm supabase/migrations; fi
mkdir -p supabase/migrations
npx -y supabase start -x imgproxy,vector,logflare,edge-runtime
"$REPO_ROOT/scripts/local-supabase/replay-migrations.sh"

# Link the real migrations so `supabase gen types --local` and other CLI commands see them.
rmdir supabase/migrations
ln -sfn "$REPO_ROOT/supabase/migrations" supabase/migrations
echo "Local Civizen Supabase ready: API http://127.0.0.1:56321, DB postgresql://postgres:postgres@127.0.0.1:56322/postgres"
