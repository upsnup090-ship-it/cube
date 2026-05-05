---
description: Financial safety invariants for balance, ledger, and idempotency logic
alwaysApply: true
---

# Financial Safety Rules

Balance-related code is high risk. Preserve accounting correctness first.

## Required Invariants

- Balances must never be changed directly from UI, handlers, scripts, or ad hoc logic.
- All money movement must go through `WalletService` and `LedgerService`.
- Every balance-changing operation must produce ledger entries.
- Ledger entries are immutable (append-only, no silent rewrites/deletes).
- Write operations that may be retried must use idempotency keys.
- Settlement and refund flows must be idempotent.
- Duplicate callbacks must not create duplicate payouts or refunds.
- Use integer minor units for money values; do not use floating point math.
- Available balance must never be negative.
- Locked balance must never be negative and must represent escrowed funds.

## Type Safety in Financial Logic

- Do not use broad `as any` in money, ledger, escrow, settlement, refund, or idempotency paths.
- Do not use `@ts-ignore` in financial logic unless explicitly approved and documented with rationale.
