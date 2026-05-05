# CHANGELOG

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

### Changed
- `telegram-webhook-service.ts` — добавлена фильтрация dice (🎲, 1-6), idempotency key builder
- `app/api/telegram/webhook/route.ts` — подключён к `TelegramWebhookHandler`
- `telegram-webhook-smoke-check.ts` — +2 теста на dice-фильтр (9/9)
- `docs/next-milestones.md` — обновлены статусы, ссылки на решения
- `.windsurf/rules/03-workflow-policy.md` — правило: держать доку в sync с кодом
- `package.json` — скрипты `smoke:telegram-handler`, `smoke:telegram-api`

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
