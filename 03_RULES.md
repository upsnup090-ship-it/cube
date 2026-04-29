# RULES

This file defines the project rules for Cline and other coding agents.

These rules are mandatory unless the user explicitly overrides them for a specific task.

## Core rule

Make minimal, safe, task-focused changes.

Do not use a small task as a reason to rewrite unrelated parts of the project.

Do not optimize, refactor, rename, reorganize, or redesign unless the task directly requires it.

## Project scope

This project is a Telegram-first PvP dice game foundation.

The current milestone is PvP Dices only.

The project must prioritize:

1. Safe internal balance accounting.
2. Escrow locking.
3. Immutable ledger entries.
4. Idempotent game actions.
5. Admin visibility.
6. Auditability.
7. Clear separation between implemented MVP features and future features.

## Out of scope unless explicitly requested

Do not implement these features unless the user directly asks for them:

1. Banker mode.
2. Real payment integrations.
3. Crypto deposits or withdrawals.
4. Fiat deposits or withdrawals.
5. Stripe, NowPayments, exchange APIs, wallet connectors, or payment webhooks.
6. Referral systems.
7. Bonuses, promo codes, cashback, or free spins.
8. Tournaments.
9. Rake, house edge, or platform fee logic.
10. NFTs, tokens, or other web3 mechanics.
11. Production gambling compliance automation.
12. Large unrelated refactors.
13. Deployment automation.
14. Authentication or authorization rewrites.

## Forbidden without direct user permission

Never do any of the following without explicit permission from the user:

1. Touch secrets, `.env` files, API keys, bot tokens, webhook secrets, or deploy credentials.
2. Deploy the project.
3. Run destructive database operations.
4. Drop tables.
5. Truncate data.
6. Reset migrations.
7. Rewrite production-like data.
8. Remove existing functionality.
9. Bypass wallet, ledger, escrow, settlement, or refund rules.
10. Directly mutate balances outside the approved wallet service.
11. Add dependencies without a clear reason.
12. Change global architecture.
13. Modify authentication or authorization behavior.
14. Edit unrelated files.
15. Hide failures or skip verification silently.

## Financial safety rules

Balance-related code is high risk.

All balance changes must go through the approved wallet and ledger flow.

Required invariants:

1. Never mutate balances directly from UI code.
2. Never mutate balances directly from API handlers.
3. Never mutate balances directly from scripts.
4. Never mutate balances directly from tests unless the test is explicitly testing controlled setup data.
5. Every balance-changing operation must create immutable ledger entries.
6. Ledger entries must never be deleted or rewritten.
7. Available balance must never become negative.
8. Locked balance must represent escrowed funds only.
9. Settlement must be idempotent.
10. Refund must be idempotent.
11. Duplicate callbacks must not create duplicate payouts.
12. Duplicate callbacks must not create duplicate refunds.
13. Admin manual credit and debit must require a reason.
14. Admin manual credit and debit must create audit logs.
15. All money-like values must use integer minor units.
16. Do not use floating point numbers for balances, bets, payouts, or fees.

## Ledger rules

The ledger is the source of truth for balance history.

Wallet balances may be stored for fast reads, but they must be derived from valid wallet operations and ledger entries.

Ledger entries must include enough context to audit the operation later.

Each ledger entry should include:

1. Transaction id.
2. User id when applicable.
3. Wallet id when applicable.
4. Game id when applicable.
5. Entry type.
6. Direction.
7. Amount.
8. Currency.
9. Idempotency key.
10. Metadata.
11. Created timestamp.

Do not build features that depend only on current wallet balance while ignoring the ledger.

## Game logic rules

The PvP Dices game state machine must stay explicit.

Expected lifecycle:

```text
CREATED
→ WAITING
→ MATCHED
→ ROLLING
→ RESOLVING
→ SETTLED
```

Allowed terminal or exception states:

```text
CANCELLED
REFUNDED
FAILED
UNDER_REVIEW
```

Do not add new statuses unless the change also explains how the new status affects:

1. Escrow.
2. Settlement.
3. Refund.
4. Admin review.
5. Audit logs.
6. UI filters.
7. Tests.

## PvP Dices rules

The MVP game rules are:

1. Creator creates a game with bet amount and dice count.
2. Dice count can be 1 or 2 only.
3. Creator must have enough available balance.
4. Creator bet is locked into escrow.
5. Game becomes waiting.
6. Opponent may join while game is waiting and not expired.
7. Opponent cannot be the creator.
8. Opponent must have enough available balance.
9. Opponent bet is locked into escrow.
10. Game becomes matched.
11. Both players roll using Telegram Dice or a test stub.
12. Higher total wins.
13. Tie must trigger another roll round.
14. Winner receives the pot.
15. No rake in v1.
16. If the game expires before an opponent joins, creator can be refunded.
17. Settled games must not be modified except through explicit admin adjustment records.

## Idempotency rules

Every external or repeatable action must be idempotent.

This includes:

1. Telegram webhook handling.
2. Telegram callback handling.
3. Game creation.
4. Join game.
5. Cancel game.
6. Refund expired game.
7. Record roll.
8. Resolve game.
9. Settlement.
10. Manual admin ledger operation.

If an operation may be retried, it must use an idempotency key.

Repeated calls with the same idempotency key must not change the final result more than once.

## Database rules

Prefer additive migrations.

Do not make destructive schema changes unless explicitly requested.

Allowed by default:

1. Add a table.
2. Add a nullable column.
3. Add a safe index.
4. Add a new non-breaking enum value only when all code paths are updated.
5. Add seed or demo data when clearly marked as demo data.

Forbidden without explicit permission:

1. Drop a table.
2. Drop a column.
3. Rename a table.
4. Rename a column.
5. Truncate data.
6. Reset migrations.
7. Change existing enum values.
8. Delete historical ledger entries.
9. Rewrite game history.
10. Rewrite audit logs.

## Telegram rules

Telegram integration may be stubbed or mocked until real bot integration is explicitly requested.

Do not commit real Telegram tokens, webhook secrets, chat ids, or production URLs.

Telegram event handlers must store enough metadata for audit.

Dice roll records should store:

1. Game id.
2. User id.
3. Telegram chat id when available.
4. Telegram message id when available.
5. Dice emoji.
6. Dice value.
7. Dice count.
8. Total value.
9. Source.
10. Raw payload when available.
11. Created timestamp.

## Admin rules

Admin tools are for visibility and controlled operations.

Admin UI must not bypass business services.

Admin actions that affect money, status, review, or risk must:

1. Require a reason.
2. Use the proper service layer.
3. Create audit logs.
4. Show a clear warning in the UI.
5. Avoid destructive edits.

Admin manual credit and debit are allowed in v1 only as internal/demo operations.

They are not payment integration.

## Error handling rules

Prefer safe failure over silent corruption.

If an operation cannot safely complete:

1. Do not partially settle.
2. Do not partially refund.
3. Do not ignore failed ledger writes.
4. Move the game to `FAILED` or `UNDER_REVIEW` only when appropriate.
5. Write an audit log.
6. Surface a useful error to the admin or caller.

## Concurrency rules

Any operation that can be executed by two users or two callbacks at the same time must be protected.

High-risk operations include:

1. Join game.
2. Cancel game.
3. Refund game.
4. Record roll.
5. Resolve game.
6. Settlement.
7. Admin manual balance adjustment.

Use transactions, row locks, unique constraints, idempotency keys, or equivalent safeguards.

## Code style rules

Keep code boring and predictable.

Prefer explicit names over clever abstractions.

Use service boundaries for high-risk logic.

Avoid business logic hidden inside UI components.

Avoid business logic duplicated across handlers.

Avoid implicit side effects.

## Testing rules

For any change touching game or wallet logic, add or update targeted tests when the project has a test setup.

At minimum, verify these cases manually or through tests:

1. Successful create game.
2. Insufficient balance on create.
3. Successful join.
4. Double join prevention.
5. Creator cannot join own game.
6. Successful settlement.
7. Tie reroll handling.
8. Refund expired waiting game.
9. Duplicate settlement does not double-pay.
10. Duplicate refund does not double-pay.
11. Manual admin credit requires reason.
12. Manual admin debit cannot create negative balance.

## Expected agent behavior

Before editing, the agent should state:

1. What it understood.
2. What it plans to do.
3. Files it will inspect.
4. Files it expects to touch.
5. Risks or assumptions.
6. Verification steps.

After editing, the agent should state:

1. What changed.
2. Files changed.
3. How it was verified.
4. What was not touched.
5. Remaining risks or follow-up tasks.

## When to stop and ask

Stop and ask before changing anything that affects:

1. Money movement.
2. Ledger behavior.
3. Escrow.
4. Settlement.
5. Refunds.
6. Database structure.
7. Authentication.
8. Admin permissions.
9. Deployment.
10. Secrets.
11. Compliance-sensitive behavior.
12. Banker mode.
13. Real payments.
