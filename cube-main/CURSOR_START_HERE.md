# CURSOR START HERE

This onboarding note summarizes the current CubeChat / BigPlayBot Dices project context for Cursor sessions.

## Current Project State

- Project is positioned as a Telegram-first PvP Dices foundation.
- Scope is intentionally narrow: safe internal wallet, escrow, ledger, settlement/refund, and admin audit visibility.
- The documentation defines strict financial and safety invariants for MVP work.

## Stack

- Frontend: React + TypeScript
- Backend/API: server functions or API routes
- Data layer: Prisma with PostgreSQL/Supabase target architecture
- Local DB mode: SQLite for local development
- Core architecture style: service-based boundaries (`GameService`, `WalletService`, `LedgerService`, `IdempotencyService`, `AuditService`)

## Important Files

- `AGENTS.md`
- `00_START_HERE.md`
- `01_PROJECT_BRIEF.md`
- `03_RULES.md`
- `05_ARCHITECTURE.md`
- `10_ACCEPTANCE.md`
- `.cursor/rules/00-project-core.mdc`
- `.cursor/rules/10-financial-safety.mdc`
- `.cursor/rules/20-backend-services.mdc`
- `.cursor/rules/30-prisma-database.mdc`
- `.cursor/rules/40-workflow.mdc`

## Completed Milestones (Documentation Baseline)

The docs currently define and prioritize:

- PvP Dices MVP boundaries
- Financial safety invariants
- Service ownership boundaries
- Idempotency and audit requirements
- Acceptance criteria for wallet/game/ledger/admin behavior

If implementation status is unclear, validate against `10_ACCEPTANCE.md` before extending features.

## Next Milestone

- Next milestone target: **GameService foundation** (safe state transitions and orchestration through Wallet/Ledger services), implemented only when explicitly requested.

## Forbidden Actions

- Do not bypass wallet/ledger flows for balance mutations.
- Do not add banker mode or real-money features unless explicitly requested.
- Do not touch secrets, tokens, deploy credentials, or production configuration.
- Do not perform destructive DB operations without explicit approval.
- Do not introduce unrelated refactors.

## Required Verification Commands

Run before commit on implementation tasks:

1. `npx prisma validate`
2. `npx prisma migrate status`
3. `npx prisma db seed`
4. `npm run type-check`
5. `npm run lint`
6. `npm run build`

## MCP Recommendation

### Allowed Later

- GitHub MCP for PR/issue workflows
- Context7/docs MCP for documentation lookup
- Playwright tooling for later UI test automation

### Do Not Enable Now

- Payments integrations
- Crypto integrations
- Deployment automation
- Production database access
- Secrets manager integrations
- Airweave
- Magic UI auto-approve flows
