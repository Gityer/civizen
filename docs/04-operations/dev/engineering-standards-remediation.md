# Engineering standards remediation (file size)

Updated 2026-07-30 during remaining remediation action plan v0.4 so `npm run lint` can pass on a reviewed, frozen legacy allowlist.

## Policy

- Soft limit remains **400** lines for new/unlisted source files.
- `legacy_allowlist` in `engineering-standards-baseline.json` freezes **current** sizes only.
- Do **not** raise a cap again without splitting the file (or documenting an emergency exception).
- Generated/exempt: `src/integrations/supabase/types.ts`, `src/lib/i18n.generated.ts`.

## Why temporary acceptance

These files exceeded the soft limit before or during institutional remediation. Preferring a reviewed baseline freeze over disabling the check or mass-refactoring unrelated modules mid-release.

## Future remediation items

| Priority | Target | Action |
|---|---|---|
| P1 | `src/components/ui/chat-bar.tsx` | Split composer, message list, attachments, and hooks |
| P1 | `src/lib/i18n.base.ts` | Continue pack splits / generated locale slices |
| P1 | `src/pages/settings/UsersAdmin.tsx` | Extract role tables and emergency-access panels |
| P1 | `src/components/layout/BuildOverlay.tsx` | Keep shrinking; already allowlisted historically |
| P2 | Verifier federation distribution UI + lib (`GovernancePublicAuditVerifierMirrorFederation*`, `governance-public-audit-verifier-federation-distribution*`) | Extract controls, policy summary, and tests |
| P2 | ~~`src/lib/use-governance-activation-demographic-feeds.ts`~~ | Moved to `research/governance-simulations/activation-demographic-feeds/` (2026-07-31) |
| P2 | `src/pages/Home.tsx`, `Governance.tsx`, `StudyCivicLearning.tsx` | Extract section components |
| P3 | Deployment/p2p/protocol modules over 400 | Split by concern when next touched |
| P3 | Funding admin pages over 400 | Split once funding UI is next revised |

## Removed from allowlist

- `GovernanceActivationFeedAdaptersPanel.tsx` — deleted from production tree (off route graph; demographic ingest UI removed).
- 2026-10-05 split pass (caps removed or lowered to current size): `App.tsx` (routes now in `src/app-routes/`), `i18n.base.ts` (composed from `src/lib/i18n/base/`), `assistant/catalog.ts` (data in `catalog-data/`), `Home.tsx` (hooks and sections in `src/pages/home/`), `UserPageMenu.tsx`, `MarketJobsInterestForm.tsx`, `CivicVotingElection.tsx`, `CivicVotingHub.tsx`, `page-smoke.test.tsx`, plus `matters*.ts`, `identity-verification.ts`, `matters-coding-policy.ts`, `PublicCiviWidget.tsx`, `MatterDetail.tsx`, `MatterWorkPanel.tsx` and the two long matters test files. Text-scanning tests and the assistant route validator now read the split files. Still allowlisted (smaller than before): `chat-bar.tsx`, `Settings.tsx`, `EditProfile.tsx`, `StudyCivicLearning.tsx`, `Market.tsx`.
- The extracted `src/pages/home/**` files keep the existing `react-hooks/exhaustive-deps` exemption that `Home.tsx` already had (effects there are intentionally scoped to specific triggers).

## 2026-08-13 contribution lifecycle freeze

Frozen `i18n.base.ts` after live contribution evidence / declared-context copy (LANGUAGE_PACK_VERSION 158). New modules stay under 400 lines.

Frozen caps updated for `App.tsx` (ledger routes), `i18n.base.ts` (ledger copy), `Profile.tsx` / `UserProfile.tsx` (ledger links), and `page-smoke.test.tsx`. Prefer splitting i18n packs and App routes on the next dedicated refactor. New ledger modules stay under the 400-line soft limit.

## 2026-08-13 Phase 1 pilot freeze

## 2026-08-01 purpose-alignment pass

Frozen caps updated for `App.tsx`, `AuthContext.tsx`, `i18n.base.ts`, `Settings.tsx`, and civic-voting files that grew with mission/copy and voting work. Prefer splitting on next touch.
