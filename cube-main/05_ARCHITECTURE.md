# ARCHITECTURE

This file describes the intended architecture for the BigPlayBot Dices MVP.

The goal is to build a safe foundation first, not a large casino platform.

## Architecture goal

The system must support a Telegram-first PvP dice game with:

1. Internal user identity mapped to Telegram users.
2. Internal wallet balances.
3. Escrow locking for active games.
4. Immutable ledger entries.
5. Explicit game state transitions.
6. Dice roll recording.
7. Settlement and refunds.
8. Admin visibility.
9. Audit logs.
10. Safe extension points for future modes.

## High-level components

The system is divided into these components:

1. Telegram Bot Interface.
2. Backend API.
3. Game Service.
4. Wallet Service.
5. Ledger Service.
6. Idempotency Service.
7. Audit Service.
8. Admin Dashboard.
9. Database.
10. Background Jobs.

The UI must not perform financial or settlement logic directly.

All high-risk operations must go through the backend service layer.

## Recommended stack

Use the existing project stack unless the user requests a change.

Preferred foundation:

1. React and TypeScript for UI.
2. Supabase or PostgreSQL for data storage.
3. Server functions or API routes for backend actions.
4. Database transactions for wallet and game operations.
5. Row-level locks, unique constraints, or equivalent protection for concurrency.

Do not introduce new infrastructure unless the task requires it.

## Source of truth

The source of truth for money movement is the ledger.

The source of truth for current game state is the `games` table.

The source of truth for user identity is the internal `users` table mapped to Telegram user ids.

The visual draw.io flow is a product reference only. It must not override ledger, escrow, settlement, refund, idempotency, or audit rules.

## Data model

The initial data model should include these tables.

### users

Stores Telegram-linked player profiles.

Recommended fields:

1. `id`.
2. `telegram_user_id`.
3. `username`.
4. `display_name`.
5. `status`.
6. `region_code`.
7. `age_confirmed`.
8. `responsible_limit_per_day`.
9. `created_at`.
10. `updated_at`.

User status values:

```text
active
blocked
under_review
```

### wallets

Stores current wallet snapshot for fast reads.

Recommended fields:

1. `id`.
2. `user_id`.
3. `currency`.
4. `available_balance`.
5. `locked_balance`.
6. `version`.
7. `created_at`.
8. `updated_at`.

Wallet values must use integer minor units.

Do not use floating point balances.

### ledger_entries

Stores immutable balance history.

Recommended fields:

1. `id`.
2. `transaction_id`.
3. `user_id`.
4. `wallet_id`.
5. `game_id`.
6. `entry_type`.
7. `direction`.
8. `amount`.
9. `currency`.
10. `idempotency_key`.
11. `metadata`.
12. `created_at`.

Recommended entry types:

```text
admin_credit
admin_debit
escrow_lock
escrow_release
payout_credit
refund_credit
rake_debit
adjustment
```

Recommended directions:

```text
debit
credit
```

### games

Stores PvP Dices game state.

Recommended fields:

1. `id`.
2. `public_code`.
3. `creator_user_id`.
4. `opponent_user_id`.
5. `status`.
6. `bet_amount`.
7. `currency`.
8. `dice_count`.
9. `winner_user_id`.
10. `loser_user_id`.
11. `result_reason`.
12. `expires_at`.
13. `settled_at`.
14. `created_at`.
15. `updated_at`.

Game status values:

```text
created
waiting
matched
rolling
resolving
settled
cancelled
refunded
failed
under_review
```

### game_players

Stores participation and escrow per player.

Recommended fields:

1. `id`.
2. `game_id`.
3. `user_id`.
4. `role`.
5. `escrow_locked_amount`.
6. `joined_at`.
7. `cancelled_at`.

Player roles:

```text
creator
opponent
```

### dice_rolls

Stores dice results for audit and game resolution.

Recommended fields:

1. `id`.
2. `game_id`.
3. `user_id`.
4. `roll_round`.
5. `telegram_chat_id`.
6. `telegram_message_id`.
7. `dice_emoji`.
8. `dice_value`.
9. `dice_count`.
10. `total_value`.
11. `source`.
12. `raw_payload`.
13. `created_at`.

Roll sources:

```text
telegram_dice
admin_test
system_test
```

### idempotency_keys

Stores processed external or repeatable operations.

Recommended fields:

1. `key`.
2. `operation`.
3. `resource_type`.
4. `resource_id`.
5. `response_snapshot`.
6. `created_at`.

### audit_logs

Stores sensitive user, admin, and system actions.

Recommended fields:

1. `id`.
2. `actor_type`.
3. `actor_id`.
4. `action`.
5. `resource_type`.
6. `resource_id`.
7. `metadata`.
8. `created_at`.

Actor types:

```text
system
admin
user
telegram_webhook
```

## Service boundaries

### Wallet Service

The Wallet Service owns all wallet mutations.

Responsibilities:

1. Manual admin credit.
2. Manual admin debit.
3. Lock escrow.
4. Release escrow.
5. Credit payout.
6. Refund escrow.
7. Prevent negative balances.
8. Write ledger entries.
9. Run balance operations atomically.
10. Enforce idempotency.

No other service should directly update wallet balances.

### Ledger Service

The Ledger Service owns immutable ledger creation and ledger queries.

Responsibilities:

1. Create ledger entries.
2. Enforce required metadata.
3. Enforce idempotency keys.
4. Query ledger by user, wallet, game, or transaction.
5. Support admin review.

Ledger entries should not be updated or deleted.

### Game Service

The Game Service owns PvP Dices game state.

Responsibilities:

1. Create game.
2. Join game.
3. Cancel waiting game.
4. Record dice roll.
5. Resolve game.
6. Settle game.
7. Refund expired game.
8. Move unsafe games to review.
9. Enforce game state transitions.
10. Write audit logs for important actions.

Game Service must call Wallet Service for escrow, payout, and refund operations.

### Idempotency Service

The Idempotency Service protects repeatable operations.

Responsibilities:

1. Store operation keys.
2. Detect repeated requests.
3. Return safe previous result when appropriate.
4. Prevent double settlement.
5. Prevent double refund.
6. Prevent duplicate Telegram callback effects.

### Audit Service

The Audit Service records sensitive actions.

Responsibilities:

1. Log admin actions.
2. Log system settlement and refund events.
3. Log failed or suspicious game transitions.
4. Log manual balance adjustments.
5. Log user blocking or review actions.

## PvP Dices flow

### Create game

1. User requests game creation.
2. Backend validates user status.
3. Backend validates bet amount.
4. Backend validates dice count.
5. Backend checks wallet available balance.
6. Wallet Service locks creator escrow.
7. Game Service creates game in `waiting` state.
8. Audit Service logs creation.
9. UI or Telegram shows public game code.

### Join game

1. Opponent requests to join by game id or public code.
2. Backend checks game exists.
3. Backend checks game is `waiting`.
4. Backend checks game is not expired.
5. Backend checks opponent is not creator.
6. Backend checks opponent status.
7. Backend checks opponent available balance.
8. Wallet Service locks opponent escrow.
9. Game Service sets game to `matched`.
10. Audit Service logs join.

### Roll dice

1. Player rolls using Telegram Dice or a test stub.
2. Telegram webhook or test endpoint sends result to backend.
3. Backend validates game and player.
4. Backend records dice roll with metadata.
5. Backend checks whether both players have rolled in the current round.
6. If both rolled, Game Service moves game to `resolving`.

### Resolve game

1. Game Service compares current round totals.
2. If totals are equal, create or expect another roll round.
3. If one player has higher total, set winner and loser.
4. Game Service calls Wallet Service for settlement.
5. Wallet Service releases escrow and credits payout.
6. Game Service sets status to `settled`.
7. Audit Service logs settlement.

### Refund expired game

1. Waiting game expires before opponent joins.
2. User or background job requests refund.
3. Game Service checks game status and expiry.
4. Wallet Service refunds creator escrow.
5. Game Service sets status to `refunded`.
6. Audit Service logs refund.

## Game state machine

Primary lifecycle:

```text
created
→ waiting
→ matched
→ rolling
→ resolving
→ settled
```

Exception states:

```text
cancelled
refunded
failed
under_review
```

State transitions must be validated in code.

Do not allow arbitrary status changes from the UI.

## Admin dashboard architecture

The admin dashboard is a control and visibility layer.

It should include these pages.

### Overview

Show:

1. Total users.
2. Active users.
3. Active games.
4. Waiting games.
5. Matched games.
6. Settled games today.
7. Failed games.
8. Funds available.
9. Funds locked.
10. Manual credits and debits today.

### Users

Show:

1. Telegram id.
2. Username.
3. Display name.
4. Status.
5. Available balance.
6. Locked balance.
7. Created date.
8. Last activity when available.

User detail should show:

1. Wallet snapshot.
2. Ledger history.
3. Game history.
4. Audit logs.
5. Admin actions.

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
9. Expiry.
10. Settled date.

Game detail should show:

1. Players.
2. Roll history.
3. Ledger entries.
4. State timeline.
5. Audit logs.
6. Failure or review reason.

### Ledger

Show:

1. Transaction id.
2. User.
3. Wallet.
4. Game.
5. Entry type.
6. Direction.
7. Amount.
8. Currency.
9. Idempotency key.
10. Created date.

Ledger entries must be read-only.

### Manual operations

Allow controlled admin operations:

1. Manual credit.
2. Manual debit.
3. Block user.
4. Unblock user.
5. Mark user under review.
6. Mark game under review.

All manual operations require a reason and audit log.

## Telegram integration architecture

Telegram should be treated as an external event source.

Initial implementation may use stubs.

Required environment placeholders:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
```

Do not commit real values.

Webhook handlers must:

1. Validate source when real integration is enabled.
2. Use idempotency keys.
3. Avoid direct wallet mutations.
4. Record raw payload when useful.
5. Return safe responses for duplicate callbacks.

## Background jobs

Background jobs may be needed for:

1. Expired waiting game refunds.
2. Stuck game detection.
3. Under-review alerts.
4. Daily responsible limit checks.
5. Ledger consistency checks.

Jobs must use the same service layer as user actions.

Jobs must be idempotent.

## Error and recovery architecture

Failed financial operations should never be hidden.

If settlement cannot complete safely:

1. Do not pay partially.
2. Do not unlock only one side unless explicitly handled by Wallet Service.
3. Mark game as `failed` or `under_review`.
4. Log audit event.
5. Preserve all evidence.
6. Show the issue in admin dashboard.

## Security and abuse controls

Initial controls should include:

1. User status checks.
2. Blocked user prevention.
3. Under-review user prevention for new games.
4. Rate limit placeholders.
5. Responsible limit placeholders.
6. Region code placeholder.
7. Age confirmation placeholder.
8. Admin audit logs.
9. Idempotency for external events.
10. No secret values in repository.

## Suggested folder structure

Use the actual project conventions first.

If the project does not already define structure, prefer a layout similar to this:

```text
src/
  app/
  components/
  features/
    admin/
    games/
    ledger/
    telegram/
    users/
    wallets/
  services/
    audit/
    games/
    idempotency/
    ledger/
    wallets/
  db/
    migrations/
    queries/
    schema/
  types/
  utils/
```

Keep high-risk business logic in services, not UI components.

## Future Banker mode extension

Banker mode is not part of v1.

The architecture may reserve extension points for Banker mode, but it must not implement it yet.

When Banker mode is later requested, it should be designed separately with its own:

1. Game mode type.
2. State machine.
3. Contribution ledger entries.
4. Winner selection or resolution rules.
5. Refund rules.
6. Admin review rules.
7. Risk limits.
8. Acceptance tests.

Do not mix Banker mode into PvP Dices settlement logic.

## Non-goals

The MVP is not trying to be:

1. A full casino platform.
2. A web3 casino.
3. A payment processor.
4. A compliance automation system.
5. A tournament engine.
6. A bonus platform.
7. A generic game engine.

The goal is a safe, auditable PvP Dices foundation.
