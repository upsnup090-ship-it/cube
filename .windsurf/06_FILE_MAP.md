# FILE MAP — CubeChat (BigPlayBot Dices)

## Root documents
| File | Purpose |
|---|---|
| `00_START_HERE.md` | Entry point and scope overview |
| `01_PROJECT_BRIEF.md` | Product brief: user roles, game flow, admin dashboard |
| `03_RULES.md` | Mandatory project rules (single source of truth) |
| `05_ARCHITECTURE.md` | Technical architecture: data model, service boundaries |
| `10_ACCEPTANCE.md` | Acceptance criteria and verification checklists |
| `11_CHANGELOG.md` | Change history |
| `AGENTS.md` | Agent instructions and working style |
| `README.md` | Project readme |
| `RELEASE_NOTES.md` | Release notes |

## Agent configuration
| Path | Purpose |
|---|---|
| `.windsurf/rules/` | Agent rules (01–40) |
| `.windsurf/workflows/` | Agent workflows (debug, refactor, review, setup-project, task, feature) |

## Context (runtime state)
| Path | Purpose |
|---|---|
| `context/constraints.md` | Technical and business constraints |
| `context/current_state.md` | Implemented / in progress / not ready |
| `context/known_issues.md` | Known issues list |
| `context/priorities.md` | Top priorities and freeze zone |

## Source code
| Path | Purpose |
|---|---|
| `src/app/` | Next.js App Router pages and components |
| `src/app/admin/` | Admin dashboard (users, wallets, games, ledger, audit) |
| `src/app/play/` | Player-facing game UI (create, join, game sandbox) |
| `src/app/api/` | API routes (health, jobs, telegram webhook) |
| `src/server/services/` | Core services: WalletService, LedgerService, GameService |
| `src/server/telegram/` | Telegram webhook handler, admin, types, API |
| `src/server/db/` | Prisma client singleton |
| `src/server/config/` | Environment validation |
| `src/server/admin/` | Admin security smoke checks |

## Database
| Path | Purpose |
|---|---|
| `prisma/schema.prisma` | Database schema |
| `prisma/seed.ts` | Seed data |
| `prisma/migrations/` | Migration history |

## Templates
| Path | Purpose |
|---|---|
| `templates/bug_template.md` | Bug report template |
| `templates/change_template.md` | Change description template |
| `templates/feature_template.md` | Feature specification template |
| `templates/task_template.md` | Task description template |

## Docs
| Path | Purpose |
|---|---|
| `docs/` | Additional documentation and diagrams |

## Config
| Path | Purpose |
|---|---|
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript configuration |
| `eslint.config.js` | ESLint configuration |
| `postcss.config.cjs` | PostCSS configuration |
| `prisma.config.ts` | Prisma configuration |
| `middleware.ts` | Next.js middleware |
| `next-env.d.ts` | Next.js type declarations |
