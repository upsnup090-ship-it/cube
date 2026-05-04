# ACCEPTANCE

This file defines acceptance criteria for the BigPlayBot Dices MVP foundation.

A task is not complete only because the UI looks correct. It must also preserve ledger safety, game state safety, idempotency, and auditability.

## General acceptance rules

Every completed change must satisfy these rules:

1. The change is limited to the requested scope.
2. The change does not introduce unrelated refactoring.
3. The change does not touch secrets or deployment settings.
4. The change does not bypass wallet or ledger services.
5. The change does not directly mutate balances outside approved logic.
6. The change keeps ledger entries immutable.
7. The change keeps game state transitions explicit.
8. The change includes useful error handling.
9. The change is verified with the smallest relevant checks available.
10. The final response explains what changed, what was verified, and what was not touched.

## MVP acceptance

The MVP foundation is acceptable when the system can demonstrate:

1. User records mapped to Telegram identities.
2. Wallet records with available and locked balances.
3. Immutable ledger entry history.
4. Admin manual credit.
5. Admin manual debit.
6. PvP game creation.
7. Escrow lock on game creation.
8. Opponent join.
9. Escrow lock on opponent join.
10. Dice roll recording.
11. Winner resolution.
12. Settlement.
13. Expired game refund.
14. Admin dashboard visibility.
15. Audit logs for sensitive actions.
16. Idempotency protection for repeatable operations.

## User and wallet acceptance

User management is acceptable when:

1. A user can be represented by Telegram user id.
2. Telegram user id is unique.
3. User status is visible to admin.
4. Blocked users cannot create or join games.
5. Users under review cannot create or join games unless explicitly allowed by the rules.
6. Wallet available balance is visible.
7. Wallet locked balance is visible.
8. Wallet values use integer minor units.
9. Wallet values never use floating point math.
10. Available balance cannot become negative.
11. Locked balance cannot become negative.

## Ledger acceptance

Ledger implementation is acceptable when:

1. Ledger entries are append-only.
2. Ledger entries cannot be edited from normal UI flows.
3. Ledger entries cannot be deleted from normal UI flows.
4. Every balance-changing operation creates ledger entries.
5. Ledger entries include transaction id.
6. Ledger entries include idempotency key.
7. Ledger entries include amount.
8. Ledger entries include direction.
9. Ledger entries include entry type.
10. Ledger entries include user or wallet context when applicable.
11. Ledger entries include game context when applicable.
12. Ledger entries include metadata when useful.
13. Ledger entries are visible in admin dashboard.
14. Ledger entries can be filtered by user.
15. Ledger entries can be filtered by game.

## Admin manual credit acceptance

Manual credit is acceptable when:

1. Admin can select a user.
2. Admin can enter a positive integer amount.
3. Admin must provide a reason.
4. The operation creates a ledger entry.
5. The operation updates wallet available balance atomically.
6. The operation creates an audit log.
7. Duplicate submission with the same idempotency key does not double-credit.
8. The result is visible in user detail.
9. The result is visible in ledger history.

## Admin manual debit acceptance

Manual debit is acceptable when:

1. Admin can select a user.
2. Admin can enter a positive integer amount.
3. Admin must provide a reason.
4. The operation refuses to create a negative available balance.
5. The operation creates a ledger entry.
6. The operation updates wallet available balance atomically.
7. The operation creates an audit log.
8. Duplicate submission with the same idempotency key does not double-debit.
9. The result is visible in user detail.
10. The result is visible in ledger history.

## Create game acceptance

Game creation is acceptable when:

1. Active user can create a game.
2. Blocked user cannot create a game.
3. User under review cannot create a game unless explicitly allowed.
4. Bet amount must be positive.
5. Dice count must be 1 or 2.
6. User must have enough available balance.
7. Creator balance moves from available to locked through Wallet Service.
8. Ledger entries are created for escrow lock.
9. Game is created with a public code.
10. Game status becomes `waiting`.
11. Game has an expiry timestamp.
12. Game creation creates an audit log.
13. Duplicate request with the same idempotency key does not lock escrow twice.

## Join game acceptance

Join game is acceptable when:

1. Active opponent can join a waiting game.
2. Opponent cannot join expired game.
3. Opponent cannot join settled game.
4. Opponent cannot join cancelled game.
5. Opponent cannot join refunded game.
6. Opponent cannot be the creator.
7. Opponent must have enough available balance.
8. Opponent balance moves from available to locked through Wallet Service.
9. Ledger entries are created for opponent escrow lock.
10. Game status becomes `matched`.
11. Game stores opponent user id.
12. Join creates an audit log.
13. Two opponents cannot both join the same game.
14. Duplicate request with the same idempotency key does not lock escrow twice.

## Dice roll acceptance

Dice roll recording is acceptable when:

1. Roll belongs to an existing game.
2. Roll belongs to a player in that game.
3. Roll is rejected for users who are not game players.
4. Roll value is between 1 and 6 for each die.
5. Dice count matches the game dice count.
6. Total value is stored.
7. Roll round is stored.
8. Telegram message id is stored when available.
9. Telegram chat id is stored when available.
10. Raw payload is stored when available.
11. Duplicate Telegram callback does not create duplicate effective rolls.
12. Roll history is visible in game detail.

## Resolution acceptance

Game resolution is acceptable when:

1. Game resolves only after both players have valid rolls for the current round.
2. Higher total wins.
3. Lower total loses.
4. Tie does not settle the game.
5. Tie requires another roll round.
6. Winner user id is stored.
7. Loser user id is stored.
8. Result reason is stored.
9. Resolution creates an audit log.
10. Invalid state transitions are rejected.

## Settlement acceptance

Settlement is acceptable when:

1. Settlement can happen only for a matched or resolving game with a valid winner.
2. Settlement releases both players' locked escrow safely.
3. Settlement credits the winner with the pot.
4. In v1, no rake is taken.
5. Settlement creates ledger entries.
6. Settlement updates wallet balances atomically.
7. Game status becomes `settled`.
8. `settled_at` is stored.
9. Settlement creates an audit log.
10. Duplicate settlement call does not double-pay.
11. Failed settlement does not leave hidden partial state.
12. Failed settlement is visible to admin as failed or under review.

## Refund acceptance

Refund is acceptable when:

1. Refund applies to waiting games that expired before an opponent joined.
2. Refund does not apply to matched games unless a separate rule exists.
3. Refund does not apply to settled games.
4. Refund releases creator escrow safely.
5. Refund creates ledger entries.
6. Refund updates wallet balances atomically.
7. Game status becomes `refunded`.
8. Refund creates an audit log.
9. Duplicate refund call does not double-refund.
10. Refund result is visible in game detail and ledger history.

## Cancel acceptance

Cancel is acceptable when:

1. Creator can cancel a waiting game before opponent joins if rules allow it.
2. Creator cannot cancel after opponent joins unless a specific rule exists.
3. Non-creator cannot cancel the game.
4. Cancel leads to safe refund or explicit cancelled state with refund handling.
5. Cancel creates an audit log.
6. Duplicate cancel does not duplicate refund.

## Admin dashboard acceptance

The admin dashboard is acceptable when it provides visibility into:

1. Users.
2. Wallets.
3. Games.
4. Game details.
5. Dice rolls.
6. Ledger entries.
7. Audit logs.
8. Manual credits.
9. Manual debits.
10. Failed or under-review games.

The admin dashboard must clearly show:

1. Available balance.
2. Locked balance.
3. Game status.
4. Bet amount.
5. Players.
6. Winner.
7. Settlement status.
8. Ledger transaction ids.
9. Risk or review status.

## Audit acceptance

Audit logging is acceptable when these actions are logged:

1. Manual admin credit.
2. Manual admin debit.
3. User block.
4. User unblock.
5. Mark user under review.
6. Create game.
7. Join game.
8. Cancel game.
9. Refund game.
10. Record dice roll when useful.
11. Resolve game.
12. Settle game.
13. Failed settlement.
14. Suspicious or invalid state transition.

Audit logs must include:

1. Actor type.
2. Actor id when available.
3. Action.
4. Resource type.
5. Resource id when available.
6. Metadata.
7. Timestamp.

## Idempotency acceptance

Idempotency is acceptable when repeated operations cannot duplicate side effects.

Required duplicate-safe operations:

1. Create game.
2. Join game.
3. Record roll.
4. Resolve game.
5. Settle game.
6. Refund game.
7. Cancel game.
8. Manual credit.
9. Manual debit.
10. Telegram webhook event.
11. Telegram callback event.

Repeated requests with the same key should return the existing result or a safe no-op.

## Concurrency acceptance

Concurrency handling is acceptable when:

1. Two users cannot both become the opponent of the same game.
2. Creator cannot cancel at the same time as opponent joins and cause corrupted escrow.
3. Settlement cannot run twice in parallel and double-pay.
4. Refund cannot run twice in parallel and double-refund.
5. Roll callbacks cannot create conflicting final results.
6. Wallet updates are atomic.
7. Ledger and wallet updates stay consistent.

## Telegram stub acceptance

Telegram integration is acceptable for MVP when:

1. Real bot token is not required for local demo.
2. Webhook endpoint can be stubbed or mocked.
3. Dice roll payload can be simulated.
4. Simulated roll still goes through the same Game Service path.
5. Real credentials are not committed.
6. Environment variables are documented as placeholders only.

## Compliance placeholder acceptance

Compliance placeholders are acceptable when the system includes visible fields or flags for:

1. User status.
2. Blocked users.
3. Under-review users.
4. Age confirmation.
5. Region code.
6. Responsible daily limit.
7. Admin review notes or metadata where appropriate.

The MVP must not claim to be production-ready for real-money gambling.

## UI acceptance

UI is acceptable when:

1. Admin pages are readable on desktop.
2. Important statuses use clear labels or badges.
3. Money-like values are displayed consistently.
4. Risky actions show warnings.
5. Empty states are understandable.
6. Loading states are handled.
7. Error states are visible.
8. Ledger entries are read-only in normal views.
9. Game detail makes settlement and roll history easy to inspect.

## Verification checklist

For any task touching core logic, verify the relevant subset of this checklist:

1. Type check passes, if available.
2. Lint passes, if available.
3. Tests pass, if available.
4. Create game works.
5. Join game works.
6. Insufficient balance is rejected.
7. Duplicate join is rejected or no-op.
8. Settlement pays once.
9. Duplicate settlement does not pay again.
10. Refund pays once.
11. Duplicate refund does not pay again.
12. Ledger entries are created.
13. Audit logs are created.
14. Admin views show the result.

## Non-acceptance examples

A change is not acceptable if it:

1. Updates wallet balances directly from a component.
2. Settles a game without ledger entries.
3. Allows negative available balance.
4. Allows the creator to join their own game.
5. Allows two opponents to join one game.
6. Allows duplicate payout.
7. Allows duplicate refund.
8. Hides failed settlement.
9. Deletes ledger history.
10. Commits secrets.
11. Adds payment providers without request.
12. Implements Banker mode without request.
13. Changes authentication without request.
14. Performs unrelated refactoring.

## Done definition

A task is done when:

1. The requested behavior is implemented.
2. Safety invariants are preserved.
3. Relevant UI is updated.
4. Relevant types are updated.
5. Relevant service logic is updated.
6. Relevant demo or seed data is updated when needed.
7. Relevant tests or manual checks are completed.
8. The final response includes changed files and verification.
9. The final response clearly states any risks or skipped checks.
