# Security policy

Civizen handles identity, civic votes and private messages, so security reports are welcome and handled first.

## Reporting a vulnerability

Please report privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability**. Do not open a public issue or pull request that describes an unfixed vulnerability.

Include what you found, how to reproduce it, and what an attacker could do with it. You will get an acknowledgement, and a note when a fix is released.

## Scope

- The web app and Android app built from this repository
- Database migrations, row level security and RPCs in `supabase/migrations`
- Edge functions in `supabase/functions`

Testing against civizen.world must not touch other members' data or degrade the service. Use a local stack (`scripts/local-supabase/up.sh`) wherever possible.
