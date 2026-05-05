# v0.1.0 — Milestone 0.1: Telegram Readiness

**Дата:** 2026-05-05

## Что сделано

### Утверждённые решения (см. `docs/milestone-0.1-decisions.md`)
- **Idempotency key**: `tg:update:<update_id>` + производные ключи
- **User mapping**: `from.id` → `User.telegramUserId`, username обновляется при каждом update
- **Active game lookup**: один активный матч на пользователя
- **Dice rules**: только 🎲, значения 1–6, tie → reroll
- **Таймауты**: WAITING=10мин, ROLLING=5мин, RESOLVING=2мин

### Код
- `telegram-webhook-handler.ts` — полный pipeline: parse → idempotency → upsert user → recordRoll → auto-resolve/settle
- `telegram-webhook-service.ts` — +idempotency key builder, +dice-фильтр
- `app/api/telegram/webhook/route.ts` — подключён к handler

### Тесты
- `telegram-webhook-handler-smoke-check.ts` — 8/8 ✅
- `telegram-webhook-smoke-check.ts` — 9/9 ✅

### Документация
- `docs/milestone-0.1-decisions.md`
- `docs/milestone-2-postgres-plan.md`
- `docs/next-milestones.md` — обновлён

## Что НЕ входит
- Реальное подключение к Telegram Bot API
- Отправка сообщений пользователю
- Postgres/Supabase (план готов, реализация — Milestone 2)
- Banker mode, payment интеграции

## Как запустить
```bash
npm run smoke:telegram-handler
npm run smoke:telegram
```
