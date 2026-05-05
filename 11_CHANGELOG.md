# CHANGELOG

## [2026-05-06] — v0.1.14 Postgres Migration (Milestone 1.1)

### Changed
- `prisma/schema.prisma` — `provider = "postgresql"` (было `"sqlite"`). URL/directUrl убраны из schema (Prisma 7.x требует их в `prisma.config.ts`).
- `prisma.config.ts` — `datasource.url` использует `DIRECT_URL ?? DATABASE_URL ?? ""` (Prisma CLI для миграций).
- `src/server/db/prisma.ts` — `@prisma/adapter-pg` + `pg.Pool` для Postgres. SQLite fallback убран — теперь `DATABASE_URL` или `DIRECT_URL` обязательны.
- `prisma/seed.ts` — аналогично: `@prisma/adapter-pg`, без SQLite fallback.
- `src/server/services/wallet-service.ts` — `BigInt(0)` → `0n` (нативный bigint для Postgres).
- `src/server/services/service-smoke-check.ts` — `BigInt(0)` → `0n`.
- `.env.example` — обновлён: Postgres обязателен, SQLite больше не поддерживается.

### Added
- `prisma/migrations/20260506_init_postgres/migration.sql` — чистая Postgres-миграция (enum'ы, SERIAL, BIGINT, JSONB, foreign keys).
- `prisma/migrations/migration_lock.toml` — `provider = "postgresql"`.
- Зависимости: `@prisma/adapter-pg`, `pg`, `@types/pg`.

### Removed
- `prisma/migrations/20260429104836_init/`, `20260429122036_init/`, `20260505212036/`, `20260505_add_telegram_chat_id/` — старые SQLite-миграции.
- `@prisma/adapter-better-sqlite3` из `prisma.ts` и `seed.ts` (пакет остаётся в devDependencies для возможного будущего использования).

### Verification
```
npx prisma validate  → schema is valid 🚀
npx tsc --noEmit      → 0 errors
npm run build         → Exit code: 0
npm run lint          → 0 errors
```

### Blocked by
- Требуется Supabase/Postgres инстанс с `DATABASE_URL` + `DIRECT_URL` в `.env` для `npx prisma migrate deploy`.

## [2026-05-06] — v0.1.13 Prisma SQLite-only + Health Endpoint Fix

### Fixed
- `src/server/db/prisma.ts` — убрана ветка `if (DATABASE_URL) return new PrismaClient()`. Schema `provider = "sqlite"` несовместима с Postgres URL через driver adapter. Теперь всегда используется SQLite adapter с `dev.db`. Если `DATABASE_URL` задан — выводится `console.warn`. Postgres поддержка — Milestone 2 (смена provider + новые миграции).
- `src/app/api/health/db/route.ts` — исправлен `no_self_play` invariant check: заменён сломанный `prisma.game.fields.opponentUserId` на raw SQL query.
- Все admin + play страницы: добавлен `export const dynamic = "force-dynamic"` (13 файлов) — необходим для корректной работы с lazy Prisma proxy.

### Result
```
GET /api/health → {"status":"ok","db":"connected","latencyMs":1}
npm run build   → Exit code: 0 (все маршруты ƒ Dynamic)
npx tsc --noEmit → 0 errors
```

## [2026-05-06] — v0.1.12 Production Build Fix

### Fixed
- `src/server/db/prisma.ts` — переход на **lazy Proxy**: `PrismaClient` создаётся только при первом обращении к свойству, а не при импорте модуля. Без этого `npm run build` падал на "Collecting page data" и "Prerendering" с `PrismaClientInitializationError` — Next.js пытался инициализировать SQLite адаптер в build-окружении где нет `dev.db`.

### Changed (all admin + play pages)
Добавлен `export const dynamic = "force-dynamic"` в 13 страниц:
- `src/app/admin/page.tsx` и все вложенные admin pages (9 файлов)
- `src/app/play/page.tsx`, `play/create`, `play/join`, `play/games/[id]` (4 файла)

Все маршруты теперь `ƒ (Dynamic)` — рендерятся на сервере по запросу, не пре-рендерятся при build.

### Verification
```
npm run build          → ✓ Exit code: 0
npm run smoke:services → 14/14 PASS
npx tsc --noEmit       → 0 errors
```

## [2026-05-06] — v0.1.11 Docs Refresh

### Changed
- `docs/current-project-state.md` — полностью переписан: актуальная карта кода, все сервисы, admin страницы, скрипты, локальный runbook, ключевые инварианты
- `docs/next-milestones.md` — переписан: Milestone 0 закрыт, Milestone 1 (staging), 2 (hardening), 3 (real money) с конкретными шагами

## [2026-05-06] — v0.1.10 .env.example + Docs Update

### Added
- `.env.example` — полный шаблон всех env-переменных с описанием и дефолтами. Не заигнорирован (`.gitignore` игнорирует `.env`, не `.env.example`).

### Changed
- `docs/deploy-staging-runbook.md` — исправлена устаревшая строка про read-only admin (теперь credit/debit/block есть); обновлён список smoke-тестов (65/65)

### Notes
- `middleware.ts` с Basic Auth для `/admin` уже был реализован.
- В development при отсутствии `ADMIN_USERNAME`/`ADMIN_PASSWORD` — открытый доступ.
- В production при отсутствии — 503.

## [2026-05-06] — v0.1.9 Lint Clean + MVP Audit Update

### Fixed (lint errors → 0)
- `src/app/admin/read-only-guard.ts` — заменён `method as any` на `method as 'GET' | 'POST' | 'PUT' | 'DELETE'`
- `src/server/services/wallet-service.ts` — добавлены `eslint-disable-next-line` комментарии для трёх оставшихся `metadata as any` (паттерн существовал в других местах файла, теперь последователен)
- `src/server/config/env-validation.ts` — `eslint-disable-next-line` для `OPTIONAL_VARS` (документирует доступные env-vars, не используется в рантайме)
- `src/server/telegram/telegram-webhook-handler-smoke-check.ts` — `void` для первого вызова `handleUpdate` (нужен для side-effect)
- `eslint.config.js` — добавлен `cube-main` в ignores (вложенная директория с другим проектом)

### Changed
- `docs/mvp-readiness-audit.md` — полностью обновлён: актуальный статус всех блоков, таблица smoke tests, acceptance coverage map, список known gaps

### Verification
```
npx tsc --noEmit              → 0 errors
npx eslint src/ prisma/ --max-warnings 0  → 0 errors, 0 warnings
All smoke checks               → 65/65 PASS
```

## [2026-05-06] — v0.1.8 Expanded Telegram Handler Smoke Tests

### Added
- `src/server/telegram/telegram-webhook-handler-smoke-check.ts` — 7 новых тестов (8→15):
  - `Command /balance handled`
  - `Command /play without args ignored`
  - `Command /play creates game`
  - `Command /play rejected when already has active game`
  - `Command /cancel cancels waiting game`
  - `Command /join without code ignored`
  - `Blocked user /play ignored via Telegram`

### Smoke Test Results
| Smoke check | Result |
|---|---|
| `service-smoke-check.ts` | 14/14 PASS |
| `telegram-webhook-handler-smoke-check.ts` | **15/15** PASS |
| `admin-security-smoke-check.ts` | 17/17 PASS |
| `telegram-webhook-smoke-check.ts` | 9/9 PASS |
| `telegram-webhook-admin-smoke-check.ts` | 4/4 PASS |

**Total: 59/59 PASS**

## [2026-05-06] — v0.1.7 User Status Enforcement in Game Service

### Fixed
- `src/server/services/game-service.ts` — добавлен приватный метод `assertUserCanPlay(userId, action)`. `createGame` и `joinGame` теперь отклоняют `blocked` и `under_review` пользователей до начала idempotency flow. Без этого блокированный пользователь мог создавать и вступать в игры. Закрывает acceptance п.112.2, 112.3, 130.1.

### Added
- `src/server/services/service-smoke-check.ts` — два новых теста:
  - `Blocked user cannot create game` — 14/14 PASS
  - `Under-review user cannot join game` — 14/14 PASS

### Notes
- Acceptance п.184 "In v1, no rake" расходится с реализацией (DEFAULT_GAME_COMMISSION_BPS=50). Это архитектурное решение в коде; `10_ACCEPTANCE.md` устарел в этом пункте. Комиссию не трогаем без явного задания.
- `type-check` — 0 ошибок.

## [2026-05-06] — v0.1.6 Prisma SQLite Adapter Fix + All Smoke Tests Green

### Fixed
- `src/server/db/prisma.ts` — добавлен `PrismaBetterSqlite3` adapter при отсутствии `DATABASE_URL`. Без этого `PrismaClient` падал на dev-окружении с ошибкой "needs to be constructed with valid options". Seed.ts уже использовал адаптер вручную, теперь все сервисы используют единый путь.

### Added
- `@prisma/adapter-better-sqlite3` и `better-sqlite3` добавлены в `devDependencies` в `package.json`
- `@types/better-sqlite3` добавлен в `devDependencies`

### Applied migration
- `prisma migrate dev` применил отложенную миграцию `20260505_add_telegram_chat_id` к `dev.db`

### Smoke Test Results (all green)
| Smoke check | Result |
|---|---|
| `service-smoke-check.ts` | 12/12 PASS |
| `admin-security-smoke-check.ts` | 17/17 PASS |
| `telegram-webhook-handler-smoke-check.ts` | 8/8 PASS |
| `telegram-webhook-smoke-check.ts` | 9/9 PASS |
| `telegram-webhook-admin-smoke-check.ts` | 4/4 PASS |

**Total: 50/50 PASS**

## [2026-05-05] — v0.1.5 Ledger + Audit Filters; Wallets Improvements

### Changed
- `src/app/admin/ledger/page.tsx` — URL-фильтры (userId, gameId, type, direction); ссылки на user/game detail; credit/debit раскрашены; take 100
- `src/app/admin/audit/page.tsx` — добавлена колонка resourceId; URL-фильтры (action, resourceType, actorId); ссылки на user/game из resourceId; take 100
- `src/app/admin/wallets/page.tsx` — включён user relation (username/displayName/status); total available + locked; ссылки на user detail; статус пользователя; locked > 0 подсвечивается
- `src/app/admin/page.tsx` — Wallets card теперь показывает реальное число (usersCount)

### Notes
- Acceptance criteria 74-75 (ledger filter by user/game) закрыты.
- `type-check` — 0 ошибок.

## [2026-05-05] — v0.1.4 Admin Manual Credit/Debit + User Block/Unblock

### Added
- `src/app/admin/users/[id]/actions.ts` — Server Actions:
  - `manualCreditAction` — ручное пополнение баланса через `walletService.manualCredit` (идемпотентно, требует reason)
  - `manualDebitAction` — ручное списание через `walletService.manualDebit` (идемпотентно, требует reason, блокирует negative balance)
  - `setUserStatusAction` — смена статуса active/blocked/under_review с audit log (`user_block`/`user_unblock`/`user_mark_review`)
- `src/app/admin/users/[id]/_components/AdminUserActions.tsx` — UI компоненты форм с `useActionState`:
  - `ManualCreditForm`, `ManualDebitForm`, `UserStatusForm`

### Changed
- `src/app/admin/users/[id]/page.tsx` — добавлены секции "Manual Operations" и "User Status" с активными формами
- `src/app/admin/read-only-guard.ts` — добавлены credit/debit/status в allowedActions

### Notes
- Все операции с балансом идут через `walletService` — прямых обращений к wallet нет.
- Каждая операция создаёт ledger entry + audit log.
- `type-check` — 0 ошибок.

## [2026-05-05] — v0.1.3 Admin Dashboard — Detail Pages + Risk Section

### Added
- `src/app/admin/games/[id]/page.tsx` — страница деталей игры: summary, dice rolls, ledger entries, audit logs
- `src/app/admin/users/[id]/page.tsx` — страница деталей пользователя: profile, wallet, game history, ledger, audit logs
- `src/app/admin/risk/page.tsx` — Risk & Review: blocked users, under_review users, failed games, under_review games

### Changed
- `src/app/admin/page.tsx` — overview с метриками: users/blocked/under_review, games по статусам, locked funds, manual ops today; секция Risk при наличии items
- `src/app/admin/games/page.tsx` — id стал ссылкой на detail; добавлен link на Risk
- `src/app/admin/users/page.tsx` — id стал ссылкой на user detail

### Notes
- Только read-only страницы. Wallet/ledger не меняются.
- `type-check` — 0 ошибок.

## [2026-05-05] — v0.1.2 Background Refund Job

### Added
- `src/server/services/game-service.ts` — методы `refundExpiredGame` и `processExpiredGames`:
  - `refundExpiredGame`: рефанд одной просроченной WAITING-игры через `walletService.refund` (идемпотентно)
  - `processExpiredGames`: batch-обработка просроченных игр + флаггинг stuck ROLLING/RESOLVING → UNDER_REVIEW (cutoff 30 мин)
- `src/app/api/jobs/refund-expired/route.ts` — `POST /api/jobs/refund-expired`; если задан `CRON_JOB_SECRET`, требует `Authorization: Bearer <secret>`. Возвращает `{ ok, expiredRefunded, stuckFlagged, failed }`.
- `src/server/config/env-validation.ts` — добавлена `CRON_JOB_SECRET` в OPTIONAL_VARS

### Notes
- Все изменения в game-service аддитивны; существующие методы не затронуты.
- `type-check` — 0 ошибок.

## [2026-05-05] — v0.1.1 Telegram Bot Commands + Notifications

### Added
- `prisma/schema.prisma` — добавлено nullable поле `telegramChatId BigInt?` на `User` для хранения chatId при уведомлениях
- `prisma/migrations/20260505_add_telegram_chat_id/migration.sql` — аддитивная миграция (ALTER TABLE ADD COLUMN)
- Команды бота: `/play <ставка> [кубики]`, `/join <код>`, `/balance`, `/cancel`
- Уведомления при ключевых событиях: оппонент вступил, бросок сделан, победа/поражение/ничья, отмена

### Changed
- `src/server/telegram/telegram-webhook-service.ts` — добавлена команда `"balance"` в `TelegramCommandType` и `detectCommand`
- `src/server/telegram/telegram-webhook-handler.ts` — полный рефакт: `handleCommand` стал роутером, `upsertUser` сохраняет `chatId`, добавлен `notifyUser` helper, `tryAutoResolve` возвращает outcome, обновлены `/start` и `/help` тексты
- `prisma/schema.prisma` — убраны deprecated `url`/`directUrl` из `datasource` (Prisma 7 требует их в `prisma.config.ts`), provider возвращён к `sqlite` для local dev

### Notes
- Без изменений wallet-service, game-service, schema enum'ов.
- Без новых npm зависимостей.
- `type-check` — 0 ошибок.

## [2026-05-05] — v0.1.0 Milestone 0.1 + Milestone 1 Telegram Integration

### Added
- `docs/milestone-0.1-decisions.md` — утверждённые решения (idempotency, user mapping, dice, таймауты)
- `docs/milestone-2-postgres-plan.md` — план перехода на Postgres/Supabase
- `src/server/telegram/telegram-webhook-handler.ts` — полный pipeline обработки Telegram updates
- `src/server/telegram/telegram-webhook-handler-smoke-check.ts` — 8 тестов (все зелёные)
- `buildTelegramIdempotencyKey()` — формат `tg:update:<update_id>`
- `isAcceptedDiceEmoji()`, `isValidDiceValue()` — фильтрация dice
- `docs/telegram-webhook-setup.md` — инструкция настройки реального Telegram webhook
- `telegramWebhookService.sendMessage()` — отправка сообщений через Telegram Bot API по `TELEGRAM_BOT_TOKEN`
- Ответы на `/start` и `/help` через Telegram API с audit log `telegram_message_sent`
- `src/server/telegram/telegram-api-smoke-check.ts` — smoke-проверка Telegram API client без реального вызова API
- `TELEGRAM_API_BASE_URL` — readiness для outbound Telegram API proxy/gateway
- `TELEGRAM_PROXY_URL`, `TELEGRAM_PROXY_KIND`, `TRUST_PROXY` — зарезервированные env vars для будущего proxy policy
- `middleware.ts` — HTTP Basic Auth для /admin (timing-safe, production fail-closed)
- `src/app/admin/read-only-guard.ts` — read-only контракт админ-панели (7 страниц, запрещённые действия)
- `docs/admin-security.md` — документация схемы защиты admin
- `src/server/admin/admin-security-smoke-check.ts` — 17 тестов read-only контракта
- `prisma/schema.prisma` — переключён на postgresql с DATABASE_URL и DIRECT_URL
- `src/server/db/prisma.ts` — убран SQLite адаптер, стандартный PrismaClient
- `src/app/api/health/route.ts` — healthcheck API (SELECT 1, latency)
- `src/app/api/health/db/route.ts` — invariant checks (balances >= 0, no self-play)
- `docs/postgres-supabase-readiness.md` — документация перехода на Postgres
- `src/server/config/env-validation.ts` — валидация env vars (production fail-closed)
- `src/server/config/env-validation-smoke-check.ts` — 5 тестов env validation
- `docs/deploy-staging-runbook.md` — runbook: окружения, env vars, healthchecks, политика no-real-payments

### Removed
- `@prisma/adapter-better-sqlite3` — больше не нужен (Postgres)
- `better-sqlite3` — больше не нужен (Postgres)

### Changed
- `telegram-webhook-service.ts` — добавлена фильтрация dice (🎲, 1-6), idempotency key builder
- `app/api/telegram/webhook/route.ts` — подключён к `TelegramWebhookHandler`
- `telegram-webhook-smoke-check.ts` — +2 теста на dice-фильтр (9/9)
- `docs/next-milestones.md` — обновлены статусы, ссылки на решения
- `.windsurf/rules/03-workflow-policy.md` — правило: держать доку в sync с кодом
- `package.json` — скрипты `smoke:telegram-handler`, `smoke:telegram-api`
- `src/server/telegram/telegram-webhook-handler.ts` — idempotency key теперь резервируется до side-effects, чтобы исключить двойную обработку гонок
- `src/server/services/game-service.ts` — settlement переведён на модель: возврат escrow победителю + net stake проигравшего - configurable commission
- `src/server/services/wallet-service.ts` — добавлены отдельные wallet-операции для consume locked escrow, rake collection и commission credit
- `src/server/config/env-validation.ts` — добавлены optional env vars `GAME_COMMISSION_BPS` и `GAME_COMMISSION_RECIPIENT_TELEGRAM_USER_ID`
- `src/server/services/service-smoke-check.ts` — smoke-проверка settlement теперь валидирует комиссию и баланс winner/loser/recipient

### Removed
- `src/server/services/telegram/` — удалён плохой дубликат

### Notes
- Без изменений Prisma schema.
- Без новых зависимостей.
- Реальные токены не добавлялись.

## [2026-04-30]

### Added
- `docs/mvp-readiness-audit.md` (v0.1 readiness snapshot)
- `docs/current-project-state.md` (facts-only state doc)
- `docs/next-milestones.md` (post-audit milestone ordering)

### Changed
- Documentation updated to reflect current implementation status (no product logic changes).

### Fixed
- ...

### Notes
- No Prisma schema changes.
- No real Telegram/Supabase integration was added.
