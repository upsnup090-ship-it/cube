# Следующие вехи

Дата: **2026-05-06**

---

## Статус Milestone 0 (MVP Readiness)

Все подпункты закрыты:

| Пункт | Статус |
|---|---|
| 0.1 Telegram integration | ✅ `telegram-webhook-handler.ts` реализован полностью |
| 0.2 Admin security (Basic Auth + guard) | ✅ `middleware.ts` + `read-only-guard.ts` |
| 0.3 Postgres/Supabase readiness docs | ✅ `docs/postgres-supabase-readiness.md` + `docs/milestone-2-postgres-plan.md` |
| 0.4 Deploy/staging runbook | ✅ `docs/deploy-staging-runbook.md` + `.env.example` |

---

## Milestone 1 — Staging Deploy

**Цель:** живой staging на реальной Postgres с настоящим Telegram webhook.

### 1.1 Postgres migration — ✅ Готово
- ✅ Сменён `provider` на `"postgresql"` в `prisma/schema.prisma`
- ✅ Обновлён `prisma.config.ts` — `DIRECT_URL` для миграций, `DATABASE_URL` для runtime
- ✅ Удалены старые SQLite-миграции, создана чистая Postgres-миграция `20260506_init_postgres`
- ✅ `src/server/db/prisma.ts` — `@prisma/adapter-pg` + `pg.Pool` для Postgres
- ✅ `prisma/seed.ts` — универсальный `createPrismaClient` для Postgres
- ✅ `BigInt(0)` → `0n` в `wallet-service.ts` и `service-smoke-check.ts`
- ✅ Установлены `@prisma/adapter-pg`, `pg`, `@types/pg`
- ✅ `npm run build` + `npx tsc --noEmit` + `npm run lint` — 0 ошибок
- ✅ Supabase проект создан и подключён через pooler URL
- ✅ `npx prisma migrate deploy` — успешно, pending migrations нет
- ✅ `npm run prisma:seed` — успешно
- ✅ Локальный запуск проверен: `/play`, `/admin`, `/api/health`, `/api/health/db`
- ✅ Smoke: services 14/14, telegram-handler 15/15, admin-security 17/17, env 6/6

### 1.2 Vercel/hosting deploy
- Создать проект в Vercel (или другом хостинге)
- Задать все env vars по `.env.example`
- Запустить `vercel --prod` (см. `docs/deploy-staging-runbook.md`)
- Проверить `GET /api/health`

### 1.3 Telegram webhook setup
- Локально подключить реальный bot token из BotFather
- Поднять localtunnel к `localhost:3000`
- Запустить `npm run telegram:webhook:set`
- Проверить `npm run telegram:webhook:info`
- Пройти сценарий из `docs/telegram-local-testing.md`

### 1.4 Smoke on staging
- Прогнать `npm run smoke:services` против staging DB (только через локальный `tsx`)
- Проверить `/admin` с Basic Auth
- Убедиться что `/api/jobs/refund-expired` доступен только с `CRON_JOB_SECRET`

---

## Milestone 2 — Production hardening

### 2.1 Admin auth upgrade
- Заменить Basic Auth на Telegram Login Widget или Mini App `initData` верификацию
- Добавить rate-limiting на `/admin`

### 2.2 Vitest unit tests
- Добавить `vitest` + изолированные unit-тесты для:
  - `WalletService` (все методы + edge cases)
  - `GameService` (state machine transitions)
  - `assertUserCanPlay` edge cases

### 2.3 Cron scheduler
- Настроить регулярный вызов `/api/jobs/refund-expired` (Vercel Cron / external scheduler)
- Мониторинг результатов: `expiredRefunded`, `stuckFlagged`

### 2.4 Monitoring / alerting
- Алерт при `gamesFailed > 0` или `gamesUnderReview > 0`
- Логирование ошибок settlement в внешний sink (Sentry / Datadog)

---

## Milestone 3 — Real money (требует отдельных решений)

**Не начинать без:**
1. Gambling лицензии (если применимо в юрисдикции)
2. Замены COIN на реальную валюту с платёжным шлюзом
3. 2FA на admin write-операции
4. Полного финансового аудита всей ledger логики
5. Compliance review: AML, KYC, responsible gambling

---

## Known gaps (сейчас)

| Gap | Приоритет | Notes |
|---|---|---|
| Telegram webhook через tunnel | Высокий | Следующий шаг для проверки реального bot flow локально |
| Vitest unit tests | Средний | Smoke checks покрывают критические пути |
| Admin rate limiting | Средний | Перед публичным staging |
| Cron для refund job | Средний | Сейчас только manual POST |
| Acceptance п.184 "no rake" | Низкий | Код берёт 50bps — осознанное решение, не баг |
