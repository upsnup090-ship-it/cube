# AGENTS.md

This repository is prepared for Windsurf and other coding agents.

## Start Here

Before making any changes, read the project instructions in this order:

1. `00_START_HERE.md` — entry point and scope overview
2. `03_RULES.md` — mandatory project rules (single source of truth)
3. `.windsurf/rules/` — agent-specific rule files
4. `.windsurf/workflows/` — when a workflow matches the task

Do not start editing files until the relevant rules and workflow notes have been reviewed.

## Core Principle

Make minimal, safe, task-focused changes.

Prefer small, reviewable edits over large rewrites. Do not refactor unrelated code, rename files, change architecture, or introduce new dependencies unless the task explicitly requires it.

## Key Documents

| File | Purpose |
|---|---|
| `03_RULES.md` | All mandatory rules: financial safety, game logic, DB, Telegram, idempotency, admin |
| `01_PROJECT_BRIEF.md` | Product brief: user roles, game flow, admin dashboard requirements |
| `05_ARCHITECTURE.md` | Technical architecture: data model, service boundaries, folder structure |
| `10_ACCEPTANCE.md` | Acceptance criteria and verification checklists |
| `11_CHANGELOG.md` | Change history |

## Working Style

For every task:

1. Identify the smallest safe change.
2. Read the relevant files before editing.
3. Follow `03_RULES.md` and `.windsurf/rules/`.
4. Use the matching workflow from `.windsurf/workflows/` when available.
5. Make focused edits only.
6. Verify the changed path.
7. Summarize what changed and what was not touched.

## When Unsure

Stop and ask before making changes that affect:

- money movement / ledger behavior
- settlement / refund logic
- database structure
- authentication / admin permissions
- production configuration
- compliance-sensitive features
