# Postgres Readiness Plan

## Current State (SQLite)
- Current Prisma datasource provider is `sqlite`.
- Local development uses a file-backed DB (`dev.db`).
- Existing service logic already relies on Prisma transactions, idempotency keys, append-only ledger, and explicit game states.
- Core tables in active use:
  - `User`
  - `Wallet`
  - `LedgerEntry`
  - `Game`
  - `GamePlayer`
  - `DiceRoll`
  - `IdempotencyKey`
  - `AuditLog`

## Why This Matters
Moving from SQLite to Postgres/Supabase is a data-plane change with high blast radius for wallet + ledger invariants. The migration must preserve:
- atomic balance updates
- immutable ledger history
- idempotent operations under retries/concurrency
- deterministic game state transitions

## Schema Readiness Notes (Prisma -> Postgres)
1. BigInt fields
- Existing money-like values (`availableBalance`, `lockedBalance`, `betAmount`, ledger `amount`) already use `BigInt` in Prisma.
- For Postgres, verify generated SQL maps to `BIGINT` consistently.
- Keep integer-only money semantics; do not switch to float.

2. Json fields
- Existing `metadata` / `rawPayload` / `responseSnapshot` fields map naturally to Postgres `jsonb`.
- Add index strategy later only where query patterns require it.

3. Enums
- Existing Prisma enums are extensive and central to business rules.
- Do not rename or remove enum values during provider switch.
- Validate generated enum DDL and migration order in staging first.

4. IDs and uniqueness
- Integer PK + autoincrement and unique keys (`publicCode`, `idempotencyKey`, `telegramUserId`) must remain intact.
- Re-check unique conflict behavior used in idempotent paths.

## Concurrency and Transaction Risks to Re-verify
1. Opponent race on game join
- Two opponents must not join same game.
- Verify update/where claim logic remains safe under Postgres transaction semantics.

2. Idempotent settle/refund/credit/debit
- Re-run duplicate-request scenarios with same idempotency key.
- Confirm no double payout/refund under parallel execution.

3. Wallet invariants under load
- No negative `availableBalance` / `lockedBalance`.
- Lock/release/payout/refund paths stay atomic and auditable.

## Environment Variables (target shape)
Use environment-specific values, never committed secrets:
- `DATABASE_URL` (Postgres/Supabase connection string)
- `DIRECT_URL` (optional direct connection for migrations, if needed by deployment model)
- existing app env vars unchanged unless explicitly required

Keep `.env.example` placeholder-only; no real credentials in repo.

## Migration Strategy (local -> staging -> production)
1. Local preparation
- Add docs-only plan first (this file).
- Keep provider unchanged until staging drill is defined.

2. Staging dry run
- Clone representative data shape (or synthetic equivalent).
- Switch provider in isolated branch.
- Run Prisma migrate + seed + smoke checks.
- Execute concurrency/idempotency checks with repeated calls.

3. Cutover plan (production later)
- Freeze write traffic window (or explicit maintenance mode).
- Backup source DB and verify restore path.
- Apply migrations in controlled order.
- Run post-migrate verification checklist before reopening writes.

## Rollback Strategy
1. Pre-cutover backup is mandatory.
2. If post-migrate checks fail:
- stop write traffic
- restore previous DB snapshot
- revert app config to previous provider/URL
- re-run smoke and critical invariants
3. Document failure mode + fix before next attempt.

## Pre-switch Verification Gates
Before any real provider switch PR is approved, all must pass:
1. `npx prisma validate`
2. migration status sanity on target env
3. seed/idempotency sanity
4. service smoke checks
5. telegram smoke checks (stub path)
6. type-check
7. lint
8. build
9. explicit manual checks for:
- duplicate settle no double payout
- duplicate refund no double refund
- join race safety

## Out of Scope in This Step
- No datasource provider change yet.
- No Supabase project connection yet.
- No deploy changes yet.
- No schema refactor unrelated to provider migration.
