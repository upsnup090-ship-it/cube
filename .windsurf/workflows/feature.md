---
description: Feature development workflow — from spec to acceptance
---
# Feature Workflow

Use this workflow when developing a new feature or capability.

## Step 1: Define the feature
Describe in 3–7 lines:
- what the feature does
- who uses it (player, admin, system)
- expected outcome
- how it fits into MVP scope (see `.windsurf/rules/40-project-core.md`)

Fill `templates/feature_template.md` if the feature is large enough.

## Step 2: Check boundaries
Verify:
- feature is within current MVP scope
- no overlap with Out of Scope items (see `.windsurf/rules/40-project-core.md`)
- if it touches money/balance — review `.windsurf/rules/10-financial-safety.md` invariants
- if it touches DB — review `.windsurf/rules/30-prisma-database.md`

## Step 3: Design
Before writing code:
- list new or changed data models (Prisma schema impact)
- list service-layer changes (which service owns the new logic — see `.windsurf/rules/20-backend-services.md`)
- list API/route/handler changes
- sketch the happy path and at least one failure path
- for financial features: define idempotency keys and ledger entry types

## Step 4: Plan implementation
Break into small, ordered steps:
- DB migration first (additive only)
- service logic
- handlers/API
- admin UI (if needed)
- verification

## Step 5: Implement
Follow `.windsurf/rules/03-workflow-policy.md`:
- make only the changes required for this feature
- keep each step small and reviewable
- do not refactor unrelated code

## Step 6: Verify
Run the full verification gate from `.windsurf/rules/03-workflow-policy.md`:
1. `npx prisma validate`
2. `npx prisma migrate status`
3. `npx prisma db seed`
4. `npm run type-check`
5. `npm run lint`
6. `npm run build`

Plus feature-specific checks:
- test the happy path manually
- test at least one failure/edge case
- for financial features: verify ledger entries are created and balances are consistent

## Step 7: Document
- update `11_CHANGELOG.md`
- update relevant `docs/*.md` if behaviour, API, or data model changed
- update `context/current_state.md` (mark feature as implemented)

## Step 8: Report
Summarize:
- what was built
- files changed
- how to test the feature
- any known limitations or follow-up items
