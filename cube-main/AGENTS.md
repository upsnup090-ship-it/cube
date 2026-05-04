# AGENTS.md

This repository is prepared for Cline and other coding agents.

## Start Here

Before making any changes, read the project instructions in this order:

1. `00_START_HERE.md`
2. `.clinerules/`
3. `.clinerules/workflows/` when a workflow matches the task

Do not start editing files until the relevant rules and workflow notes have been reviewed.

## Core Principle

Make minimal, safe, task-focused changes.

Prefer small, reviewable edits over large rewrites. Do not refactor unrelated code, rename files, change architecture, or introduce new dependencies unless the task explicitly requires it.

## Project Context

This project is the foundation for a Telegram-first PvP dice game.

The first milestone is focused on:

- PvP Dices only
- internal user balances
- escrow locking
- dice roll recording
- settlement
- refunds
- immutable ledger entries
- audit logs
- admin monitoring

Banker mode, real payments, crypto deposits, withdrawals, bonuses, referrals, tournaments, and production gambling features are out of scope unless explicitly requested.

## Safety Rules

Never do any of the following without explicit permission:

- touch secrets or `.env` values
- deploy the project
- run destructive database operations
- reset, truncate, drop, or overwrite production-like data
- modify authentication or authorization flows
- bypass ledger logic
- directly mutate balances outside the wallet/ledger service
- edit unrelated files
- introduce payment providers or real-money functionality
- implement gambling/compliance-sensitive features beyond the requested scope

## Financial Logic Rules

Balance-related logic must be treated as high-risk.

All balance changes must go through the approved wallet/ledger flow.

Do not directly change user balances in UI code, API handlers, migrations, scripts, or tests unless the task explicitly asks for a controlled migration and the user approves it.

Required invariants:

- ledger entries are immutable
- balance operations must be atomic
- no negative available balances
- escrow must be locked before a game can start
- settlement must be idempotent
- refund must be idempotent
- duplicate callbacks must not cause duplicate payouts
- admin balance adjustments must require a reason and audit log

## Game Logic Rules

For PvP Dices, keep the game state machine explicit and safe.

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

Do not add new game states without checking whether they affect settlement, refund, or audit behavior.

Telegram Integration Rules

Telegram integration may be stubbed or mocked unless the task explicitly requires real bot integration.

Do not add real bot tokens, webhook secrets, or credentials to the repository.

All Telegram webhook or callback handlers must be idempotent.

Database Rules

Prefer additive migrations.

Do not remove columns, drop tables, rewrite historical data, or change existing enum values without explicit permission.

When changing schema, update related types, services, seed/demo data, and admin views as needed.

Testing and Verification

After changes, run the smallest relevant checks available.

Prefer:

type check
lint
unit tests for touched logic
targeted integration tests
local smoke test of the changed flow

If a check cannot be run, explain why and mention the expected risk.

Working Style

For every task:

Identify the smallest safe change.
Read the relevant files before editing.
Follow .clinerules/.
Use the matching workflow from .clinerules/workflows/ when available.
Make focused edits only.
Verify the changed path.
Summarize what changed and what was not touched.
When Unsure

Stop and ask before making changes that affect:

money movement
ledger behavior
settlement/refund logic
database structure
authentication
admin permissions
production configuration
compliance-sensitive features
