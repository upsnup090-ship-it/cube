# Текущее состояние проекта (факт)

Дата фиксации: **2026-04-30**

Этот документ описывает **то, что реально есть в репозитории** на текущий момент (без планов и “как должно быть”).

## Стек

- Next.js (App Router)
- TypeScript
- Prisma (driver adapter) + SQLite (`dev.db`) для локальной разработки

## Карта кода (основное)

### Prisma / DB
- Prisma schema: `prisma/schema.prisma`
- Prisma config: `prisma.config.ts` (datasource url: `file:./dev.db`)
- Prisma client (generated, committed): `src/generated/prisma/`
- Prisma singleton: `src/server/db/prisma.ts`

### Services (ядро MVP)
Файлы:
- `src/server/services/wallet-service.ts`
- `src/server/services/ledger-service.ts`
- `src/server/services/game-service.ts`

Smoke-проверка сквозного happy-path:
- `src/server/services/service-smoke-check.ts` (`npm run smoke:services`)

### Telegram (только stubs/роутинг)
Есть:
- Парсер webhook update → типизированное представление: `src/server/telegram/telegram-webhook-service.ts`
- Smoke-check парсера: `src/server/telegram/telegram-webhook-smoke-check.ts` (`npm run smoke:telegram`)
- Детекция команд `/start` и `/help` реализована внутри `TelegramWebhookService.detectCommand(...)`

Webhook endpoint (stub, без реальной обработки):
- `src/app/api/telegram/webhook/route.ts`

Важно:
- В endpoint нет вызовов Telegram API.
- При отсутствии `TELEGRAM_WEBHOOK_SECRET` endpoint отвечает “stub_no_secret_configured” и **ничего не делает** (только парсит/роутит).

### Admin (read-only)
Есть read-only страницы:
- `/admin` и списки по сущностям: `src/app/admin/*`

Нет:
- auth/guard на `/admin`
- detail pages по сущностям (страниц вида `/admin/users/[id]`)

## Скрипты (package.json)

Есть:
- `npm run smoke:services`
- `npm run smoke:telegram`
- `npm run type-check`
- `npm run lint`
- `npm run build`

Нет:
- `npm run test` (в проекте нет тестового фреймворка и нет тестов вне `node_modules`)

## Локальная проверка (минимальный runbook)

Команды:
- `npx prisma validate`
- `npx prisma migrate status`
- `npx prisma db seed`
- `npm run smoke:services`
- `npm run smoke:telegram`
- `npm run type-check`
- `npm run lint`
- `npm run build`

Примечания:
- `dev.db` и любые `*.db` должны оставаться локальными и не коммититься (см. `.gitignore`).
- Команды, которые пишут в SQLite, требуют прав на создание/удаление journal-файлов.
