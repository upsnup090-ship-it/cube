# Service Smoke Check Verification

## Purpose

This smoke script provides a minimal repeatable local verification of the core
wallet + game service flow in SQLite dev mode.

## Implemented File

- `src/server/services/service-smoke-check.ts`

## Covered Cases

1. Ensures demo users and wallets exist (upsert).
2. Credits two demo users via `WalletService.manualCredit`.
3. Creates a game via `GameService.createGame`.
4. Joins the game via `GameService.joinGame`.
5. Attempts a second join and expects rejection.
6. Records both player rolls via `GameService.recordRoll`.
7. Resolves winner via `GameService.resolveGame`.
8. Settles once via `GameService.settleGame`.
9. Re-runs settle with the same idempotency key and confirms no balance change.
10. Attempts an oversized escrow lock and expects insufficient balance rejection.
11. Prints explicit PASS/FAIL per case plus final summary.

## Safety Notes

- No direct wallet balance mutation is performed.
- All money movement goes through `WalletService`.
- No external services are called.
- No Telegram integration is implemented.
- No payment logic or Banker mode is introduced.
