# START HERE

This file is the first context document for Cline and other coding agents working on this repository.

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

1. `01_PROJECT_BRIEF.md`
2. `02_SETTINGS.md`
3. `03_RULES.md`
4. `04_WORKFLOW.md`
5. `05_ARCHITECTURE.md`
6. `06_FILE_MAP.md`
7. `07_TASKS.md`
8. `08_COMMANDS.md`
9. `09_DEBUG_CONTEXT.md`
10. `10_ACCEPTANCE.md`
11. `11_CHANGELOG.md`
12. `12_DECISIONS.md`
13. `13_AGENT_NOTES.md`

If a file does not exist yet, mention it in your response and continue with the available files.

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

## Financial safety rules

Treat all balance logic as high risk.

Required invariants:

1. Never mutate balances directly from UI code, API handlers, scripts, or tests.
2. All balance changes must go through the approved wallet and ledger service.
3. Every balance-changing operation must create immutable ledger entries.
4. Balance operations must be atomic.
5. Available balance must never become negative.
6. Locked balance must represent escrowed funds only.
7. Settlement must be idempotent.
8. Refund must be idempotent.
9. Duplicate callbacks must not cause duplicate payouts.
10. Admin balance adjustments must require a reason and audit log.

If a requested change touches money movement, ledger logic, escrow, settlement, refund, or manual adjustments, explain the risk before editing.

## Game state rules

Keep the PvP Dices state machine explicit and safe.

Expected lifecycle:

```text
CREATED
→ WAITING
→ MATCHED
→ ROLLING
→ RESOLVING
→ SETTLED

Allowed terminal or exception states:

CANCELLED
REFUNDED
FAILED
UNDER_REVIEW

Do not add new game states unless the change also explains how settlement, refund, audit logs, and admin review are affected.

Telegram rules

Telegram integration may be stubbed or mocked unless the task explicitly requires real bot integration.

Do not add real bot tokens, webhook secrets, credentials, or production URLs to the repository.

Telegram webhook and callback handlers must be idempotent.

All Telegram dice results must be stored with enough metadata to audit the game later, including message id, chat id, user id, dice value, game id, timestamp, and raw payload when available.

Database rules

Prefer additive migrations.

Do not drop tables, remove columns, rewrite historical data, truncate data, reset the database, or change existing enum values without explicit permission.

When changing schema, update related types, services, seed or demo data, and admin views as needed.

Forbidden without direct request

Do not do any of the following without explicit user permission:

Rewrite the global architecture.
Remove existing functionality.
Add dependencies without a clear reason.
Run dangerous commands.
Change environment variables, secrets, deploy settings, or production configuration.
Perform mass refactoring.
Modify authentication or authorization logic.
Bypass the ledger service.
Add real-money functionality.
Edit unrelated files.
Expected agent response

Before making changes, respond with:

What I understood.
What I plan to do.
Files I will inspect.
Files I expect to touch.
Risks or assumptions.
Verification steps.

After making changes, respond with:

What changed.
Files changed.
How it was verified.
What was not touched.
Any remaining risks or follow-up tasks.
Working style

Make minimal, safe, task-focused changes.

Prefer small reviewable edits over large rewrites.

Read before editing.

Follow .clinerules/.

Use .clinerules/workflows/ when a workflow matches the task.

If unsure, stop and ask before changing money logic, database structure, authentication, admin permissions, deployment, or compliance-sensitive behavior.
