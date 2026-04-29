# GameService Foundation Verification

## Scope

Implemented server-side PvP Dices `GameService` foundation only:

- `createGame`
- `joinGame`
- `cancelWaitingGame`
- `recordRoll`
- `resolveGame`
- `settleGame`

No Telegram integration, UI, payment providers, Banker mode, or Prisma schema changes were introduced.

## Safety and Ownership

- GameService never mutates wallet balances directly.
- All money movement routes through `WalletService`:
  - `lockEscrow`
  - `refund`
  - `releaseEscrow`
  - `payout`
- Game state and audit writes are handled via Prisma and transactions.

## Idempotency Strategy

- Write operations use `IdempotencyKey` table (`create_game`, `join_game`, `cancel_game`, `settle_game`).
- Wallet-side effects use deterministic derived idempotency keys per operation step.
- `recordRoll` deduplicates when `telegramMessageId` exists for the same `(gameId, userId, telegramMessageId)`.

## Double Join Prevention

- `joinGame` uses an atomic `updateMany` claim:
  - `status = waiting`
  - `opponentUserId = null`
  - `expiresAt > now`
- If `count !== 1`, join is rejected (`Game already joined`).

## Double Settlement Prevention

- `settleGame` is guarded by operation idempotency key (`settle_game`).
- Wallet side-effects are additionally protected by derived keys:
  - creator release
  - opponent release
  - winner payout
- Settled game short-circuits and returns existing state.

## Notes

- Current implementation keeps settlement state transition strict (`matched`/`resolving` only).
- Tie resolution returns `tie_requires_reroll` and does not settle.
