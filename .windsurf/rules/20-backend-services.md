---
description: Backend service boundaries for server-side TypeScript code
globs:
  - src/server/**/*.ts
alwaysApply: false
---

# Backend Service Boundaries

Apply these boundaries to all backend service and handler code.

## Ownership Rules

- `WalletService` owns all wallet balance mutations (credit, debit, lock, release, payout, refund).
- `LedgerService` owns ledger entry creation and ledger write policy.
- `GameService` must call `WalletService` for escrow, payout, and refund effects.
- `GameService` must not directly update wallet balances.
- Telegram/webhook/callback handlers must call service-layer APIs.
- Telegram handlers must not directly write balances.

## Safety Rules

- Keep game state transitions explicit and validated.
- Preserve idempotency on repeatable operations.
- Keep high-risk logic in services, not in transport handlers.
