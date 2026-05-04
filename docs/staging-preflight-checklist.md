# Staging Preflight Checklist

Use before every staging deploy.

## A. Release Inputs
- [ ] Target branch and commit SHA fixed
- [ ] PR list for release frozen
- [ ] Changelog/notes prepared

## B. Secrets & Config
- [ ] Required env var names present in staging secret manager
- [ ] No secrets committed in release diff
- [ ] Guard/dev flags set intentionally (`ADMIN_GUARD_MODE`, `DEV_PLAYER_SIMULATOR_ENABLED`)

## C. Build & Static Validation
- [ ] `npm ci`
- [ ] `npx prisma validate`
- [ ] `npm run type-check`
- [ ] `npm run lint`
- [ ] `npm run build`

## D. DB Readiness
- [ ] `npx prisma migrate status` checked
- [ ] Backup snapshot created before migration/app restart
- [ ] Migration reviewed and approved

## E. Runtime Verification
- [ ] `npx prisma db seed`
- [ ] `npm run smoke:services`
- [ ] `npm run smoke:telegram`
- [ ] Any new feature-specific tests/smoke scripts run

## F. Manual App Checks
- [ ] `/admin` dashboard loads
- [ ] `/admin/users`, `/admin/wallets`, `/admin/games`, `/admin/ledger`, `/admin/audit` load
- [ ] Latest feature routes from release are reachable
- [ ] Financial invariants spot-check completed (no obvious negative balances, no duplicate side effects)

## G. Idempotency Spot Checks
- [ ] duplicate settle does not double payout
- [ ] duplicate refund does not double refund
- [ ] duplicate webhook/intent handling remains safe

## H. Rollback Preparedness
- [ ] previous known-good SHA documented
- [ ] DB restore command/path validated
- [ ] owner for rollback decision assigned

## I. Post-Deploy Recording
- [ ] deployment timestamp captured
- [ ] verification outputs saved
- [ ] issues/incidents logged with links
