---
description: Prisma and database safety rules for local development and money-sensitive flows
globs:
  - prisma/**/*
  - src/server/db/**/*
alwaysApply: false
---

# Prisma and Database Rules

## Environment and Data Safety

- SQLite is local development only at this stage.
- Do not commit local SQLite artifacts such as `dev.db`.
- Do not perform destructive DB operations without explicit approval.

## Schema and Migration Discipline

- Do not change Prisma schema without explaining migration impact.
- Prefer additive migrations over destructive changes.
- Any schema change must describe impact on services, types, and historical data safety.

## Transaction Requirements

- Use Prisma transactions for money movement and game-state operations that must stay atomic.
- Ensure wallet updates and ledger writes remain consistent in one atomic flow.

## Required Prisma Validation (after DB changes)

- Run `npx prisma validate`.
- Run `npx prisma migrate status`.
- Run `npx prisma db seed`.
