# Следующие вехи (после readiness-аудита)

Дата: **2026-04-30**

Этот документ — про **порядок работ**, но без реализации новых продуктовых фич в рамках текущего PR.

## Milestone 0: MVP Readiness (закрыть блокеры)

Цель: получить состояние “можно начинать реальную интеграцию”, не ломая финансовую безопасность.

### 0.1 Telegram integration readiness (РЕШЕНО — см. [milestone-0.1-decisions.md](./milestone-0.1-decisions.md))
- **idempotency key**: `tg:update:<update_id>` + производные ключи.
- **Telegram identity → User**: `from.id` как primary identity, username обновляется при каждом update.
- **Active game lookup**: один активный матч на пользователя, поиск по `GamePlayer`.
- **Правила dice**: только , значения 1–6, tie → reroll.
- **Таймауты**: WAITING=10мин, ROLLING=5мин, RESOLVING=2мин. Refund через background job.
- **Код**: `telegram-webhook-handler.ts` + `route.ts` реализованы.

### 0.2 Admin security readiness
- Выбрать минимальную схему защиты admin:
  - allowlist по IP / basic auth / oidc (решение зависит от окружения)
- Зафиксировать “read-only contract”:
  - какие страницы допустимы
  - какие действия запрещены и как это enforced (на уровне кода/роутов).

### 0.3 Postgres/Supabase readiness
- Сформировать документ:
  - целевой `DATABASE_URL` формат
  - список env vars (без значений)
  - стратегия миграции данных (если будет перенос демо-данных)
  - BigInt/Decimal политика и индексы.

### 0.4 Deploy/staging readiness
- Сформировать runbook:
  - окружения (dev/staging/prod)
  - healthchecks
  - список обязательных env vars (без секретов)
  - требования к логированию и audit trail
  - политика “no real payments / no gambling features”.

## Milestone 1: Реальная Telegram интеграция (после решения блокеров)

Вне рамок текущего PR, но логичный следующий шаг:
- Реальный webhook handler (с идемпотентностью)
- Intent → service-layer оркестрация (`GameService`/`WalletService`)
- Store of raw Telegram payload для аудита
- Набор unit/integration тестов для идемпотентности и state machine.

## Milestone 2: Postgres/Supabase (после Telegram) — [план](./milestone-2-postgres-plan.md)

- Перевод datasource на Postgres
- Миграции и проверки invariants
- Staging deploy с read-only admin и мониторингом.
