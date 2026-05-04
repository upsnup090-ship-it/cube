# Staging Deploy Preparation Runbook

## Goal
Prepare a safe, repeatable staging deploy process without deploying in this PR.

This runbook is for the current MVP foundation and prioritizes financial safety invariants:
- no direct balance mutations outside services
- immutable ledger behavior
- idempotent money/game operations
- explicit game state integrity

## Scope of This Step
- Documentation only.
- No infrastructure changes.
- No secret values in repo.
- No production/staging deploy execution.

## Deployment Flow (Staging)
1. Preflight
- Confirm target commit SHA and PR merge set.
- Confirm database backup/restore commands are available.
- Confirm required env vars exist in staging secret store.
- Confirm maintenance mode strategy for staging if needed.

2. Build & static checks
- `npm ci`
- `npx prisma validate`
- `npm run type-check`
- `npm run lint`
- `npm run build`

3. DB migration safety checks
- `npx prisma migrate status`
- Review pending migrations manually before apply.
- If migration is expected: apply in staging only under change window.

4. Seed/smoke checks
- `npx prisma db seed`
- `npm run smoke:services`
- `npm run smoke:telegram`
- If available in branch: run additional new smoke/test scripts.

5. Post-deploy verification (staging)
- Admin pages load (`/admin`, users/wallets/games/ledger/audit).
- Core simulation flow still works (create -> join -> roll -> resolve -> settle).
- Ledger entries append for new operations.
- Audit logs append for sensitive actions.
- Repeat idempotent operations and confirm no duplicate side effects.

## Required Environment Inventory (Names Only)
- `DATABASE_URL`
- `NODE_ENV`
- `TELEGRAM_WEBHOOK_SECRET` (stub-safe mode still supported)
- `ADMIN_GUARD_MODE`
- `ADMIN_GUARD_TOKEN`
- `DEV_PLAYER_SIMULATOR_ENABLED`

Do not store real values in repository files.

## Migration Gate Rules
Before applying migrations to staging:
1. Confirm migration diff is expected and reviewed.
2. Confirm rollback path for DB snapshot is tested.
3. Confirm no enum value removals/renames without explicit approval.
4. Confirm BigInt and idempotency-sensitive columns are unchanged or intentionally migrated.

## Rollback Plan (Staging)
If verification fails after deploy:
1. Stop staging write traffic (or disable interactive endpoints).
2. Roll app version back to previous known-good SHA.
3. Restore DB from latest pre-deploy snapshot if data inconsistency risk exists.
4. Re-run smoke checks on rolled-back version.
5. Open incident note with failure signature and fix plan before next attempt.

## Release Evidence Template
Capture after each staging attempt:
- Commit SHA deployed
- Migration status output summary
- Build/type/lint result summary
- Smoke result summary
- Manual verification notes
- Rollback needed: yes/no
- Incident link (if any)

## Exit Criteria for "Staging Ready"
All must be true:
- Static checks green (type, lint, build)
- Prisma validate/migrate status green
- Service + telegram smoke checks green
- Manual admin verification complete
- Idempotency duplicate checks pass
- Rollback procedure validated and documented
