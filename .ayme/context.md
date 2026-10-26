# civizen.world: AyMe context

> Generated from AyMe; do not edit. Edit in AyMe.
> Project-scoped items only. AyMe regenerates this file when they change; your local AyMe has the full record.
> Safe-only export (public repo): rules and decisions without names of people, task titles only.

## Project rules

- In Civizen, ordinary people never pay transaction or processing fees; legal entities cover the necessary costs.
- Get single world citizenship and a shared civil governance framework onto the UN agenda.
- Hand founder control over to the system domain by domain, once each part can moderate itself.

## Decisions (newest first)

- 8 Oct 2026 · D8: phone sign-up
- 8 Oct 2026 · D7: iOS timing — why: A second platform multiplies the cost of every change while the core loop is still being closed. Recommended option accepted 8 Oct 2026.
- 8 Oct 2026 · D6: legacy governance proposal system
- 8 Oct 2026 · D5: seeded demo programs in production — why: They show how the pilots work without presenting founder-authored samples as community activity. Recommended option accepted 8 Oct 2026.
- 8 Oct 2026 · D3: Market and Luma positioning — why: Credits cannot be spent or moved, listings and agreements have zero production use, and showing a prototype as a marketplace violates the epistemic-honesty rule. Recommended option accepted 8 Oct 2026.

## Open tasks

- Native push for the Android app (and iOS later): create a Firebase project, add google-services.json and the Capacitor push plugin; web push is already live

## Open jobs

- Re-test v0.1.233–v0.1.236 for the safe-to-invite gate
- Docs and task gaps in Civizen
- Civizen: fix post-sign-in Loading (continuation of jdb493d69)
- Civizen v0.1.238 regression: Home Civizen Score dropped (40.6 / 3 of 5 areas → 27.4 / 2 of 5) after the sign-in speed fix 8c53352
- Verify production sign-in Home is fast after v0.1.238
- Verify v0.1.239 Home score paging fix on production
- Docs follow the app: a check that fails when docs name a UI path, setting or command that no longer exists
- Pilot: AyMe repo snapshot (.ayme/context.md) for Civizen cloud sessions
- Civizen: docs follow the app (stale UI paths + automatic check), and the cloud-session findings (parent jobs jafe649b7, j2785e225 note)
- Settle chat: Civizen keys for Aye

## Where the details live

AyMe keeps the why; the how is in this repo's own docs:

- `README.md`
- `docs/`
- `docs/03-platform/product-design/product-inventory-and-implementation-plan-2026-10-07.md`
- `docs/04-operations/dev/AGENTS.md`
- `memory-bank/activeContext.md`
- `docs/03-platform/product-design/product-inventory-and-plan-v2-2026-10-12.md`
- `docs/04-operations/qa/test-matrix.md`
- `docs/04-operations/qa/regression-checklist.md`

## Reporting back to AyMe

Cloud sessions cannot reach AyMe. Report in the pull request description with the headings of `.github/pull_request_template.md`: Outcome, Why, Status, Next, Blockers, Feedback, Session, Model, Environment (environment: cloud). Name the AyMe job id (j + 8 hex) when there is one. AyMe reads open and merged pull requests back with `ayme sync prs <project>`.
