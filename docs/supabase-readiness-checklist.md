# Supabase/Postgres Readiness Checklist

Use this checklist before approving a real SQLite -> Postgres/Supabase switch.

## A. Planning
- [ ] Scope is docs/readiness only (no provider switch in this PR)
- [ ] Rollback owner and on-call owner are assigned
- [ ] Maintenance/freeze strategy is defined

## B. Configuration
- [ ] `DATABASE_URL` placeholder is documented (no real secret committed)
- [ ] `DIRECT_URL` strategy decided (needed or not)
- [ ] Environment matrix prepared (local / staging / production)
- [ ] Secret management location is defined (not in repo)

## C. Schema Compatibility
- [ ] All BigInt money fields verified for Postgres `BIGINT`
- [ ] Enum mapping checked (no value loss/rename)
- [ ] Json fields verified (`metadata`, `rawPayload`, `responseSnapshot`)
- [ ] Unique constraints validated (`telegramUserId`, `publicCode`, `idempotencyKey`)
- [ ] Foreign keys and indexes reviewed for query paths

## D. Data Safety
- [ ] Pre-cutover backup plan documented and tested
- [ ] Restore procedure tested on staging snapshot
- [ ] Ledger immutability assumptions preserved
- [ ] Wallet non-negative invariants preserved

## E. Concurrency + Idempotency
- [ ] Duplicate `createGame` is idempotent
- [ ] Duplicate `joinGame` is idempotent / race-safe
- [ ] Duplicate `settleGame` does not double payout
- [ ] Duplicate `refund` does not double refund
- [ ] Wallet lock/release paths remain atomic under concurrency

## F. Validation Runs
- [ ] `npx prisma validate`
- [ ] `npx prisma migrate status`
- [ ] `npx prisma db seed`
- [ ] `npm run smoke:services`
- [ ] `npm run smoke:telegram`
- [ ] `npm run type-check`
- [ ] `npm run lint`
- [ ] `npm run build`

## G. Staging Exit Criteria
- [ ] Admin pages load and show expected entities
- [ ] Create -> Join -> Roll -> Resolve -> Settle flow works end-to-end
- [ ] Refund/cancel paths remain safe
- [ ] Audit logs and ledger entries appear correctly
- [ ] No unexpected migration drift after deploy

## H. Production Go/No-Go
- [ ] All staging gates green
- [ ] Backup + restore dry-run completed recently
- [ ] Rollback command runbook confirmed
- [ ] Monitoring checks prepared (errors, DB latency, transaction failures)
- [ ] Explicit go/no-go signoff recorded

## I. Post-cutover
- [ ] Re-run smoke checks immediately
- [ ] Validate top financial invariants manually
- [ ] Confirm idempotency under repeated requests
- [ ] Record lessons learned and update this checklist
