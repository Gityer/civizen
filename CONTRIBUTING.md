# Contributing to Civizen

Thanks for helping. Small, focused pull requests with a short explanation of *why* are the easiest to review.

## Set up

1. Node.js from `.nvmrc` and npm 10+.
2. `npm install`
3. `cp .env.example .env` and fill in the Supabase URL and publishable key. For a private backend, run `scripts/local-supabase/up.sh` (needs Docker); it replays every migration and prints the keys.
4. `npm run dev`

## Before you open a pull request

Run what CI runs:

```bash
npm run typecheck
npm run lint                     # includes the engineering standards check (file size limits)
npm test
npm run assistant:knowledge:check  # if it fails, run npm run assistant:knowledge and commit the result
npm run build
```

Database changes:

- Add a new file in `supabase/migrations/` with a unique timestamp; never edit an applied migration.
- Every table needs row level security. Functions that should not be called by logged-out visitors must not be executable by `anon`.
- Add or extend a check in `supabase/tests/` and run it against the local stack. CI replays all migrations and runs these checks.

Copy shown to members goes through `t('...')` with English strings in `src/lib/i18n/base/`.

## Pull requests

Use the pull request template. Changes that affect the Android app go to the Testing channel before production.

## Security

Report vulnerabilities privately; see [SECURITY.md](SECURITY.md).
