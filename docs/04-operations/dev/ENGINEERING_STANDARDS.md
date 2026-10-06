# Civizen Engineering Standards

These standards are mandatory for all new and modified application code.

## Purpose

Civizen is moving into a governance-heavy, safety-sensitive system. The codebase must stay understandable, reviewable, and auditable as that complexity grows. These standards are intended to prevent oversized files, blurred responsibilities, and hard-to-verify changes.

## Core Standards

1. Every source file must have a single clear responsibility.
2. Application source files must not exceed `400` lines.
3. The preferred target for most files is `250` lines or fewer.
4. Generated files are exempt only when clearly machine-generated or synced from an external schema.
5. New work must extend existing modules by extraction, not by continuing to grow oversized files.
6. UI pages should orchestrate, not own all logic.
7. Data access, execution logic, and rendering logic should live in separate modules whenever practical.
8. New governance logic must be auditable and covered by targeted tests.
9. All changes must pass `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
10. New standards debt must never be introduced silently.

## File Structure Rules

- Pages should delegate to feature helpers, hooks, or child components.
- Shared domain logic should live in `src/lib/...` modules split by responsibility.
- Database execution code should be separated from metadata parsing and UI concerns.
- Large static content bundles should be treated as content assets or generated outputs, not general-purpose logic modules.

## Exceptions

These are the only standing exemptions:

- `src/integrations/supabase/types.ts`

If another file must become exempt, that decision should be deliberate and documented.

## Enforcement Model

Civizen now enforces the file-length rule with:

- `scripts/check-engineering-standards.mjs`
- `docs/04-operations/dev/engineering-standards-baseline.json`

The baseline file lists current legacy violations that still need refactoring.

## Ratchet Policy

1. A new file may not exceed the standard limit.
2. A legacy file already above the limit may not grow beyond its recorded baseline.
3. When a legacy file is reduced, the baseline should be updated downward in the same change.
4. The long-term goal is to eliminate the baseline file entirely.

## Required Refactor Pattern

When a file grows near the limit, extract by responsibility:

- page rendering
- forms
- cards or list sections
- database adapters
- execution handlers
- label/metadata helpers
- tests per domain module

## Current Priority Debt

The highest-priority oversized files are governance, identity/admin, home/profile, and localization bundles. These should be reduced gradually as each area is touched.
