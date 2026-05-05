# START HERE

This file is the first context document for Windsurf and other coding agents working on this repository.

Read it before editing any files.

## What this project is

This project is the foundation for a Telegram-first PvP dice game called BigPlayBot Dices.

The first milestone is a safe MVP for player-versus-player dice matches with internal balances, escrow locking, dice roll recording, settlement, refunds, immutable ledger entries, audit logs, and admin monitoring.

This is not a generic casino platform. The project must stay focused on PvP Dices first.

Banker mode, real payments, crypto deposits, withdrawals, bonuses, referrals, tournaments, and production gambling features are out of scope unless explicitly requested.

The most important engineering principle is financial safety: balances must never be changed directly outside the wallet and ledger flow.

## Current priorities

1. Build a safe PvP Dices foundation with explicit game states, escrow, settlement, refunds, and idempotent operations.
2. Keep all balance changes behind WalletService, immutable ledger entries, database transactions, and audit logs.
3. Provide a minimal admin dashboard for users, wallets, games, ledger entries, audit logs, manual credits, and manual debits.

## Read first

Read these files in order before making changes:

1. `AGENTS.md` — agent instructions and document map
2. `03_RULES.md` — all mandatory project rules (single source of truth)
3. `01_PROJECT_BRIEF.md` — product brief and user roles
4. `05_ARCHITECTURE.md` — technical architecture and data model
5. `10_ACCEPTANCE.md` — acceptance criteria and checklists
6. `11_CHANGELOG.md` — change history

Also review:
- `.windsurf/rules/` — agent-specific rule files
- `.windsurf/workflows/` — when a workflow matches the task

## Main scope

The current MVP scope includes:

1. Telegram user identity model.
2. Internal wallet model.
3. Available and locked balances.
4. Double-entry-style immutable ledger entries.
5. PvP game creation.
6. Opponent join flow.
7. Escrow lock for both players.
8. Dice roll recording.
9. Winner resolution.
10. Settlement.
11. Refund after timeout.
12. Admin manual credit and debit.
13. Admin user review tools.
14. Audit logs for sensitive actions.
15. Demo or mock flows for local testing.

## Out of scope for now

Do not implement these unless the user explicitly asks:

1. Banker mode.
2. Real payment processors.
3. Crypto deposits or withdrawals.
4. Fiat deposits or withdrawals.
5. Stripe, NowPayments, wallet integrations, or exchange APIs.
6. Referral systems.
7. Bonuses or promotions.
8. Tournaments.
9. Rake or platform fee logic.
10. NFTs or web3 mechanics.
11. Production gambling compliance automation.
12. Large-scale refactoring unrelated to the task.
