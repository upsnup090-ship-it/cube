# MVP Readiness Audit (v0.1)

Дата: **2026-04-30**

Цель: зафиксировать **фактическое** состояние репозитория после foundation-PR’ов, пометить готовность по чек-листу и собрать блокеры перед реальной интеграцией Telegram/Supabase.

Ограничения (важно):
- Не добавляем продуктовые фичи.
- Не подключаем реальный Telegram API.
- Не подключаем реальный Supabase/Postgres.
- Не трогаем секреты и `.env`.
- Не деплоим.
- Prisma schema не меняем (если это не абсолютный блокер).

## Итог (коротко)

- Prisma/SQLite + миграции: **DONE**
- Seed: **DONE** (idempotent)
- `WalletService` / `LedgerService`: **DONE** (базовый функционал + идемпотентность)
- `GameService`: **DONE** (базовый happy-path + защитные проверки)
- Service smoke checks: **DONE** (см. `npm run smoke:services`)
- Telegram webhook stubs: **DONE** (Next API route, без реальной обработки)
- Telegram smoke checks: **DONE** (парсинг/роутинг без вызовов Telegram)
- Telegram command routing: **PARTIAL** (в webhook service есть детекция `/start` и `/help`, но нет intent-router и нет сервисной обработки команд)
- Admin read-only dashboard: **DONE**
- Admin detail pages: **NOT STARTED** (есть только list/табличные страницы)
- Admin guard shell: **NOT STARTED** (защиты /admin нет)
- Dev simulator: **NOT STARTED**
- Vitest service tests: **NOT STARTED** (в проекте нет vitest/jest и нет тест-файлов вне `node_modules`)
- Postgres/Supabase readiness docs: **NOT STARTED**
- Staging/deploy readiness docs: **NOT STARTED**

## Проверка реализации (evidence map)

### Prisma + migrations
- Schema: `prisma/schema.prisma`
- Prisma config (datasource): `prisma.config.ts`
- Migrations: `prisma/migrations/`
- Команда: `npx prisma migrate status` → **Database schema is up to date**

### Seed
- `prisma/seed.ts` (upsert + stable `idempotencyKey`)
- Команда: `npx prisma db seed`

### WalletService / LedgerService / GameService
- `src/server/services/wallet-service.ts`
- `src/server/services/ledger-service.ts`
- `src/server/services/game-service.ts`

### Service smoke checks
- `src/server/services/service-smoke-check.ts`
- Команда: `npm run smoke:services`
- Проверяет: демо-пользователи, credit, create/join, record rolls, resolve, settle idempotency, insufficient balance guard

### Telegram webhook stubs + routing
- Webhook stub route: `src/app/api/telegram/webhook/route.ts`
- Parse: `src/server/telegram/telegram-webhook-service.ts`

### Telegram smoke checks
- `src/server/telegram/telegram-webhook-smoke-check.ts` (`npm run smoke:telegram`)

### Admin read-only dashboard
- Overview: `src/app/admin/page.tsx`
- Lists: `src/app/admin/users/page.tsx`, `src/app/admin/wallets/page.tsx`, `src/app/admin/games/page.tsx`, `src/app/admin/ledger/page.tsx`, `src/app/admin/audit/page.tsx`

## Статусы по чек-листу

Лейблы:
- **DONE** — есть в коде и пройдены проверки (где применимо)
- **PARTIAL** — есть часть сквозного пути или скелет
- **NOT STARTED** — отсутствует
- **BLOCKED** — нельзя завершить без внешних решений/доступов
- **NEEDS DECISION** — нужно решение, чтобы выбрать правильный путь

| Item | Status | Notes / Evidence |
|---|---|---|
| Bootstrap (project bootstrapped) | DONE | Next.js + Tailwind в `package.json`, `src/app/*` |
| Prisma + migrations | DONE | `prisma/*`, `npx prisma migrate status` |
| Prisma seed | DONE | `prisma/seed.ts`, `npx prisma db seed` |
| WalletService / LedgerService | DONE | `src/server/services/*` |
| GameService | DONE | `src/server/services/game-service.ts` |
| Service smoke checks | DONE | `npm run smoke:services` |
| Telegram webhook stubs | DONE | `src/app/api/telegram/webhook/route.ts` |
| Telegram smoke checks | DONE | `npm run smoke:telegram` |
| Telegram command routing | PARTIAL | Детекция `/start` и `/help` в `TelegramWebhookService`, но нет intent-router и нет обработки команд через services |
| Admin read-only dashboard | DONE | `src/app/admin/*` |
| Admin detail pages | NOT STARTED | Нет `src/app/admin/**/[id]/page.tsx` и т.п. |
| Admin guard shell | NOT STARTED | Нет auth/guard для `/admin` |
| Dev simulator | NOT STARTED | В main нет симулятора |
| Vitest service tests | NOT STARTED | Нет `vitest`, нет `test` script, нет тестов вне `node_modules` |
| Postgres/Supabase readiness docs | NOT STARTED | В `docs/` отсутствуют |
| Staging/deploy readiness docs | NOT STARTED | В `docs/` отсутствуют |

## Блокеры перед реальной интеграцией

### Telegram (реальное подключение)
- **NEEDS DECISION:** формат и политика **idempotency key** для Telegram updates (пример: `tg:update:<update_id>` + namespace/операция).
- **BLOCKED:** маппинг Telegram user → внутренний `User`:
  - что считается identity: `from.id` vs `chat.id` vs username?
  - как обрабатываем отсутствие `username`/смену username?
- **NEEDS DECISION:** правила “active game lookup”:
  - один активный матч на пользователя или несколько?
  - как выбираем матч по dice-event (по chat/thread/message)?
- **NEEDS DECISION:** dice acceptance rules:
  - какие emoji принимаем (только 🎲?) и как валидируем diceCount/round?
  - тай-брейк и reroll политика.
- **NEEDS DECISION:** refund/cancel timeout rules:
  - точные TTL для `WAITING`, `MATCHED`, `ROLLING`
  - кто и как триггерит refund (scheduler/cron/webhook retries).

### Supabase/Postgres migration
- **NEEDS DECISION:** стратегия миграции SQLite → Postgres:
  - миграции Prisma в Postgres (новая datasource) vs отдельная ветка схемы
  - политика типов (BigInt/Decimal), индексы, ограничения уникальности.
- **BLOCKED:** окружения и переменные для staging/prod (без секретов в репо, но список переменных нужен).

### Admin / безопасность
- **BLOCKED:** hardening admin auth:
  - минимальный auth (пароль/oidc/allowlist) для staging
  - read-only гарантии на уровне маршрутов + сервисов.

### Compliance / платежи
- **NEEDS DECISION:** явные ограничения “no real payments / gambling restrictions” для production:
  - какие фичи должны быть “hard disabled” конфигом
  - audit trail для любых ручных админ-операций (если появятся).

## Verification results (факт)

Успешно выполнено:
- `npx prisma validate`
- `npx prisma migrate status`
- `npx prisma db seed`
- `npm run smoke:services`
- `npm run smoke:telegram`
- `npm run type-check`
- `npm run lint`
- `npm run build`

Не выполнено (потому что отсутствует в `package.json`, не “додумываем”):
- `npm run smoke:telegram-router` — **нет** скрипта, и в main нет intent-router smoke-check файла
- `npm run test` — **нет** скрипта `test` и нет тестового фреймворка в devDependencies

Примечание по среде агента:
- DB-writing команды могут требовать прав на создание/удаление SQLite journal-файлов. В песочнице агента это может падать как `SQLITE_IOERR_DELETE`. Для аудита использовалось выполнение вне песочницы там, где нужно.

## Cleanup notes

### deep-research-report
Фактическое состояние в `docs/`:
- `docs/deep-research-report.md` — **отсутствует** (файла нет в рабочем дереве).
- `docs/deep-research-report (1).md` — **отслеживается git-ом** (tracked) и не модифицировался в рамках этого аудита.

Рекомендация: принять решение, нужен ли rename на “каноническое” имя и как избежать появления дублей (удаление/переименование — только с явным подтверждением).

### ignore files
Проверено, что игнор-листы продолжают защищать от случайного коммита локальных/секретных артефактов:
- `.env` (и `.env.*`), `node_modules/`, `.next/`, `dev.db`, `src/generated/`, `*.tsbuildinfo` присутствуют в `.gitignore` / `.cursorignore`.
