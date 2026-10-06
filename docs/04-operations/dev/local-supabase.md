# Local Supabase (Civizen)

Civizen has its own isolated local Supabase for testing write paths (office changes, row-level security, RPCs) and for regenerating `src/integrations/supabase/types.ts` without touching the hosted database. It is separate from any other project's Supabase stack on the same machine (project id `civizen-local`, ports below).

| Service | Address |
|---|---|
| API | `http://127.0.0.1:56321` |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:56322/postgres` |
| Studio | `http://127.0.0.1:56323` |
| Mail (Inbucket) | `http://127.0.0.1:56324` |

The keys and passwords are the CLI's local defaults and are not secrets. Never point them at, or copy them from, the hosted environment.

## Start, replay, stop

```bash
scripts/local-supabase/up.sh          # start the stack and replay supabase/migrations (idempotent)
scripts/local-supabase/up.sh --stop   # stop; the data volume is kept
```

The CLI work dir lives outside the repo (`$CIVIZEN_LOCAL_SUPABASE_DIR`, default `~/civizen-local-supabase`). `scripts/local-supabase/config.toml` is the source of truth for its configuration.

## Why migrations are replayed by a script

`supabase start` / `db reset` apply each migration in a single transaction. Some migrations use a value added by `ALTER TYPE ... ADD VALUE` in the same file (for example `20260328010000` uses `law.review`), which Postgres rejects inside one transaction. The hosted database applied them statement by statement, so `scripts/local-supabase/replay-migrations.sh` does the same and records progress per file (a few versions have two files).

Two quirks are handled in the script, not by editing migration history:

- `20260424103000` needs the fix from `20260428140000` (an ambiguous `generate_official_id_candidate()` call), so the later migration is pre-applied (it is idempotent).
- `20260818030000` is data-only and asserts that production rows exist; it is recorded as applied without running.

A fresh replay of all 269 files completes with these two rules.

## Automatic updates

**Schema (automatic, local only).** `scripts/local-supabase/install-hooks.sh` installs Git hooks that run `auto-sync.sh`: after `git pull`/`merge`, after a branch switch, and after a commit that touches `supabase/migrations/`. It applies any new migrations to the local database (under a second when nothing is new), stays silent when there is nothing to do or the stack is not running, and never fails the Git command (a broken migration prints one warning with the log path). The hosted database still receives migrations only at release time, as a deliberate step.

**CI.** `.github/workflows/migrations-replay.yml` replays all migrations into an empty Supabase whenever migrations or this tooling change, so a migration that cannot be applied from scratch fails the pull request. It has not run on GitHub yet.

**Data (refresh on demand, snapshot first).** `scripts/local-supabase/refresh-data.sh <dump file or URL>` takes a snapshot of the current local data, replaces it with the production dump, and restores the snapshot automatically if the import fails (`--restore <snapshot>` puts one back by hand; the newest 5 are kept). It deliberately does not run on its own on every ship: it replaces local data and would otherwise wipe test rows silently.

The only part that needs the server is producing the dump: a job on the host (a cron entry or a step in the release script, run as a user with database access) runs `export-remote-dump.sh` and publishes the file somewhere the dev machine can fetch with a read-only token. Then `CIVIZEN_DUMP_URL=... CIVIZEN_DUMP_TOKEN=... scripts/local-supabase/refresh-data.sh --latest` pulls it. No production credential ever lives on the dev machine. That server job has not been set up.

## Current state

- Schema: complete (all 270 files, including `20261005230000_transfer_constitutional_office`; about 300 public tables).
- Data: empty. The agent SSH account on the hosted server has no database/Docker access (by design; see `REMOTE_DB_ACCESS.md`), so the dump has to be taken by someone authorised, then loaded locally (below).

## Loading production data (privacy-reduced dump)

1. On the database host, by someone authorised: `scripts/local-supabase/export-remote-dump.sh` writes `civizen-data-<time>.sql.gz` and a manifest. It leaves out identity-verification cases/artifacts/reviews/providers, private messages and conversations, social OAuth tokens and push-device tokens, password hashes and one-time auth tokens, and all storage file bytes.
2. Copy the file to the dev machine and run `scripts/local-supabase/import-dump.sh <file>` (add `CIVIZEN_IMPORT_FORCE=1` to wipe existing local data first). It only ever targets the local container, and gives every account the local password `civizen-local`.

Both scripts were rehearsed end to end on the local database with seeded rows (excluded rows absent from the dump, no hash or token in it, import refuses a non-empty database without the force flag). They have not been run against the hosted database. Avatars and other uploaded files are not included, so profile pictures and attachments will be missing locally.
- `src/integrations/supabase/types.ts` is still the older hand-maintained file; regenerating it from this database (`supabase gen types typescript --local`) is a separate, larger change because the existing code relies on the narrower types.

## Verifying the schema against the repo types

```bash
cd "$CIVIZEN_LOCAL_SUPABASE_DIR" && npx -y supabase gen types typescript --local > /tmp/local-types.ts
```

Every table named in `types.ts` exists locally (about 100 of about 300); function names that are longer than 63 characters are truncated by Postgres.

## SQL tests

`scripts/local-supabase/run-sql-tests.sh [name-filter]` runs every `supabase/tests/*_test.sql` against the local database only. Each file wraps itself in `BEGIN … ROLLBACK`, impersonates members with `SET LOCAL ROLE authenticated` + `request.jwt.claims`, and raises on any failed assertion, so nothing persists. The consultation ballot and proposal-support tests need the production-derived data (election `single-world-citizenship`, profiles `member` and `citizen`).

## Which backend does the app use?

The web app (`npm run dev`, the `civizen-web` container on port 8080) reads `VITE_SUPABASE_URL` from `.env` / `.env.local`. By default that is the **live production backend**, not this local stack (kong on `127.0.0.1:56321`). Sign-ups, votes, withdrawals and account deletions made in the browser therefore change real data.

Before testing anything that writes, check the URL in the page console:

```js
(await import('/src/integrations/supabase/client.ts')).supabase.supabaseUrl
```

To test writes safely, point `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` at the local stack (`http://127.0.0.1:56321` and the local anon key printed by `scripts/local-supabase/up.sh`) in `.env.local` and restart the dev server.
