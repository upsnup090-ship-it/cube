# Следующие вехи (после readiness-аудита)

Дата: **2026-04-30**

Этот документ — про **порядок работ**, но без реализации новых продуктовых фич в рамках текущего PR.

## Milestone 0: MVP Readiness (закрыть блокеры)

Цель: получить состояние “можно начинать реальную интеграцию”, не ломая финансовую безопасность.

### 0.1 Telegram integration readiness (без Telegram API)
- Утвердить **idempotency key** формат для Telegram update processing.
- Утвердить модель **Telegram identity → User**:
  - источник: `from.id` (предпочтительно) + как вести audit trail
  - политика смены username/displayName.
- Утвердить “active game lookup”:
  - один активный матч или несколько
  - как матч выбирается по dice-event (chat/message/thread).
- Утвердить правила dice:
  - принимаемые emoji
  - допустимые значения/кол-во бросков
  - политика tie/reroll.
- Утвердить таймауты:
  - `WAITING` join timeout
  - `ROLLING` / `RESOLVING` timeout
  - refund policy и кто триггерит.

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

## Milestone 2: Postgres/Supabase (после Telegram)

- Перевод datasource на Postgres
- Миграции и проверки invariants
- Staging deploy с read-only admin и мониторингом.
