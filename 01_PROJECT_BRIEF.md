# 01_PROJECT_BRIEF.md

## Project name

BigPlayBot Dices

## One-line summary

BigPlayBot Dices is a Telegram-first PvP dice game where two players create or join a match, lock an internal bet in escrow, roll Telegram dice, and receive an automatic settlement through a safe wallet and ledger system.

## What this project is

This project is the technical foundation for a Telegram-native player-versus-player dice game.

The first version must focus only on PvP Dices. A user can create a dice match with a selected bet amount, another user can join it, both players lock equal escrow, Telegram dice rolls determine the winner, and the system settles the pot to the winner or refunds if the game expires before being matched.

The project must be built as a safe MVP, not as a full casino platform. Real payments, crypto deposits, withdrawals, Banker mode, bonuses, referrals, tournaments, and production gambling functionality are outside the first milestone.

The most important engineering rule is financial safety: balances must never be edited directly. All balance changes must go through a wallet service, immutable ledger entries, database transactions, and audit logs.

## Product goal

Build a simple, fast, auditable Telegram PvP dice experience with a reliable financial core.

The user experience should feel like this:

1. Player opens the Telegram bot.
2. Player chooses PvP Dices.
3. Player creates a match or joins an existing one.
4. The bet amount is locked from both players.
5. Both players roll Telegram dice.
6. The higher roll wins.
7. If the result is tied, the game rerolls.
8. The winner receives the pot.
9. The full game history, rolls, ledger movements, and audit trail are available for review.

## MVP scope

The MVP includes:

1. Telegram user identity model.
2. Internal wallet model.
3. Available balance and locked balance.
4. Immutable ledger entries.
5. Manual admin credit and debit.
6. PvP dice game creation.
7. Opponent join flow.
8. Escrow locking for both players.
9. Dice roll recording.
10. Winner resolution.
11. Settlement.
12. Refund after timeout.
13. Game history.
14. Admin dashboard.
15. Audit logs.
16. Demo or mock flow for local testing.
17. Telegram webhook placeholders.

## Explicitly out of scope for MVP

Do not implement these in the first milestone unless the user explicitly requests it:

1. Banker mode.
2. Real payment processors.
3. Crypto deposits.
4. Crypto withdrawals.
5. Fiat deposits.
6. Fiat withdrawals.
7. Stripe integration.
8. NowPayments integration.
9. Wallet or exchange API integration.
10. Referral system.
11. Bonuses or promotions.
12. Tournaments.
13. Rake or platform fees.
14. NFTs or web3 mechanics.
15. Production gambling compliance automation.
16. Large unrelated refactoring.

## Core user roles

### Player

A player is a Telegram user who can create or join PvP dice games.

A player has:

1. Telegram identity.
2. Internal wallet.
3. Available balance.
4. Locked balance.
5. Game history.
6. Ledger history.
7. Status: active, blocked, or under review.

### Admin

An admin can monitor the system and perform controlled manual balance operations.

An admin can:

1. View users.
2. View wallets.
3. View games.
4. View ledger entries.
5. View audit logs.
6. Manually credit a user with a required reason.
7. Manually debit a user with a required reason.
8. Block or unblock users.
9. Mark users or games for review.

An admin must not be able to silently mutate balances without ledger entries and audit logs.

## Core game flow

### Create game

1. Player selects bet amount.
2. Player selects dice count: one or two dice.
3. System checks that the player has enough available balance.
4. System locks the bet amount in escrow.
5. Game is created with status `WAITING`.
6. Game receives a public code or join link.
7. Game expires after a short timeout if nobody joins.

### Join game

1. Opponent opens a join link or selects a waiting game.
2. System checks that the game is still joinable.
3. System checks that the opponent is not the creator.
4. System checks that the opponent has enough available balance.
5. System locks opponent escrow.
6. Game status becomes `MATCHED`.

### Roll dice

1. Each player rolls through Telegram dice.
2. Backend records Telegram roll metadata.
3. Backend stores the dice value, message id, chat id, user id, game id, timestamp, and raw payload when available.
4. When both players have valid rolls, the system resolves the round.

### Resolve game

1. Higher total wins.
2. If both totals are equal, the game requires another roll round.
3. When a winner exists, the game moves to settlement.

### Settlement

1. Both escrow locks are released.
2. Winner receives the full pot.
3. Game status becomes `SETTLED`.
4. Ledger entries are written.
5. Audit log is written.
6. Duplicate settlement attempts must not pay twice.

### Refund

1. If a waiting game expires before an opponent joins, creator can be refunded.
2. Refund releases locked escrow back to available balance.
3. Game status becomes `REFUNDED` or `CANCELLED` depending on the flow.
4. Duplicate refund attempts must not refund twice.

## Required game states

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

Do not add new game states unless the effect on settlement, refund, audit logs, and admin review is explicitly described.

## Financial model

All balances must be stored as integer minor units.

Never use floating point numbers for money or internal balance values.

Recommended wallet fields:

1. `available_balance`
2. `locked_balance`
3. `currency`
4. `version`
5. `created_at`
6. `updated_at`

Recommended ledger fields:

1. `id`
2. `transaction_id`
3. `user_id`
4. `wallet_id`
5. `game_id`
6. `entry_type`
7. `direction`
8. `amount`
9. `currency`
10. `idempotency_key`
11. `metadata`
12. `created_at`

## Financial invariants

These rules must not be broken:

1. Balances must never be changed directly from UI code.
2. Balances must never be changed directly from API handlers.
3. Balances must never be changed directly from random scripts.
4. Every balance-changing operation must create immutable ledger entries.
5. Wallet updates and ledger writes must happen atomically.
6. Available balance must never become negative.
7. Locked balance must represent escrowed funds only.
8. A game cannot start unless both players have locked escrow.
9. Settlement must be idempotent.
10. Refund must be idempotent.
11. Duplicate callbacks must not create duplicate payouts.
12. Admin manual adjustments must require a reason.
13. Admin manual adjustments must create audit logs.
14. Ledger entries must not be deleted or edited.

## Required services

### WalletService

Responsible for:

1. Manual credit.
2. Manual debit.
3. Escrow lock.
4. Escrow release.
5. Payout.
6. Refund.
7. Atomic ledger writes.
8. Atomic wallet balance updates.

### GameService

Responsible for:

1. Create game.
2. Join game.
3. Cancel game.
4. Record roll.
5. Resolve game.
6. Settle game.
7. Refund expired game.

### IdempotencyService

Responsible for preventing duplicate effects from repeated external requests, Telegram callbacks, retries, webhooks, and admin actions.

### AuditService

Responsible for recording all sensitive operations.

Audit logs should cover:

1. Admin manual credit.
2. Admin manual debit.
3. Game creation.
4. Game join.
5. Escrow lock.
6. Refund.
7. Settlement.
8. Failed settlement.
9. User block or unblock.
10. Review status changes.

## Admin dashboard requirements

The admin dashboard should include these sections:

### Overview

Show:

1. Total users.
2. Active games.
3. Waiting games.
4. Settled games today.
5. Locked funds.
6. Failed settlements.
7. Manual credits and debits today.

### Users

Show:

1. Telegram user id.
2. Username.
3. Display name.
4. Status.
5. Available balance.
6. Locked balance.
7. Games count.
8. Created date.

User detail should show wallet, ledger history, game history, and audit logs.

### Games

Show:

1. Public code.
2. Status.
3. Creator.
4. Opponent.
5. Bet amount.
6. Dice count.
7. Winner.
8. Created date.
9. Settled date.

Game detail should show players, rolls, ledger entries, status timeline, and audit logs.

### Ledger

Show all ledger entries with filters by user, game, transaction id, type, direction, and date.

### Manual operations

Allow admin credit and debit only with a required reason.

Do not allow negative available balance.

### Risk and review

Show blocked users, users under review, failed games, and suspicious operations.

## Telegram integration notes

Telegram integration may be stubbed in the MVP.

Do not commit real Telegram bot tokens, webhook secrets, or production URLs.

Environment variable placeholders:

```text
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
```

All Telegram webhook and callback handlers must be idempotent.

Telegram dice rolls must be auditable.

## Visual flow reference

The product flow is described in:

`docs/bigplaybot-dices-banker-flow.drawio`

This diagram is a product/user-flow reference only.

It must not override the technical rules for ledger, escrow, settlement, refunds, idempotency, audit logs, or game state transitions.

## Compliance placeholders

The MVP should include placeholders for:

1. Age confirmation.
2. Region code.
3. User status.
4. Responsible daily limit.
5. Admin review status.
6. Blocked user handling.
7. Audit logs.

Do not claim that the product is legally ready for real-money operation.

## Technical principles

1. Keep the MVP small.
2. Prefer explicit state transitions.
3. Prefer additive database changes.
4. Avoid unnecessary dependencies.
5. Keep business logic out of UI components.
6. Keep money logic centralized.
7. Make risky operations auditable.
8. Make external callbacks idempotent.
9. Prefer readable code over clever abstractions.
10. Do not implement unrelated future features.

## First implementation target

The first useful implementation should support a demo flow:

1. Admin creates or seeds two demo users.
2. Admin credits both users with internal test balance.
3. User A creates a PvP dice game.
4. User B joins the game.
5. Both escrows are locked.
6. Dice rolls are simulated or recorded.
7. Winner is resolved.
8. Settlement is executed once.
9. Ledger entries are visible.
10. Wallet balances are correct.
11. Audit logs are visible.
12. Repeating settlement does not pay twice.

## Acceptance criteria

The project foundation is acceptable when:

1. The admin can view users, wallets, games, ledger entries, and audit logs.
2. The admin can manually credit and debit balances with a reason.
3. The system can simulate create, join, roll, resolve, and settle.
4. Ledger entries are immutable and visible.
5. Duplicate settlement attempts do not double-pay.
6. Duplicate refund attempts do not double-refund.
7. Banker mode is clearly not implemented in v1.
8. Real payments are clearly not implemented in v1.
9. All sensitive operations are auditable.

## Future extension: Banker mode

Banker mode is a future feature and must not be implemented in the first milestone.

The database and architecture may leave extension points for it, but the actual feature should wait until PvP Dices, ledger safety, escrow, settlement, refund, and audit flows are stable.