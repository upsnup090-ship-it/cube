# Deploy/Staging Runbook

Дата: **2026-05-05**

## Окружения

| Окружение | База | Доступ | URL |
|---|---|---|---|
| dev | Локальный Postgres | Полный | localhost:3000 |
| staging | Supabase staging | Read-only admin | staging.cubechat.app |
| prod | Supabase production | Read-only admin (MVP) | cubechat.app |

## Обязательные env vars

### Все окружения

```text
NODE_ENV=production|development
DATABASE_URL=postgresql://user:pass@host:5432/db?pgbouncer=true
DIRECT_URL=postgresql://user:pass@host:5432/db
```

### Production / Staging (обязательно)

```text
TELEGRAM_BOT_TOKEN=<bot-token>
TELEGRAM_WEBHOOK_SECRET=<random-secret>
TELEGRAM_WEBHOOK_URL=https://<host>/api/telegram/webhook
ADMIN_USERNAME=<username>
ADMIN_PASSWORD=<password>
```

### Опциональные

```text
TELEGRAM_API_BASE_URL=https://api.telegram.org
TELEGRAM_PROXY_URL=         # зарезервировано
TELEGRAM_PROXY_KIND=        # зарезервировано
TRUST_PROXY=                # зарезервировано
SUPABASE_PROJECT_REF=
SUPABASE_SERVICE_ROLE_KEY=
```

## Healthchecks

- `GET /api/health` — проверка подключения к БД (`SELECT 1`), latency
- `GET /api/health/db` — invariant checks (балансы ≥ 0, нет self-play)

## Deploy на Vercel (staging)

```bash
# 1. Установить Vercel CLI
npm i -g vercel

# 2. Привязать проект
vercel link

# 3. Настроить env vars
vercel env add DATABASE_URL
vercel env add DIRECT_URL
vercel env add TELEGRAM_BOT_TOKEN
vercel env add TELEGRAM_WEBHOOK_SECRET
vercel env add ADMIN_USERNAME
vercel env add ADMIN_PASSWORD

# 4. Деплой
vercel --prod

# 5. Проверить healthcheck
curl https://staging.cubechat.app/api/health
```

## Настройка Telegram webhook (после deploy)

```bash
npm run telegram:webhook:set -- <webhook-url> <secret>
# или
npx tsx src/server/telegram/telegram-webhook-admin.ts set <url> <secret>
```

## Миграции БД

```bash
# Создать миграцию (dev)
npx prisma migrate dev --name <name>

# Применить миграции (staging/prod)
npx prisma migrate deploy
```

## Логирование и Audit Trail

Все критические операции логируются в `AuditLog`:

| Событие | actorType | action |
|---|---|---|
| Webhook unauthorized | telegram_webhook | webhook_unauthorized |
| Telegram message sent | telegram_webhook | telegram_message_sent |
| Dice roll recorded | telegram_webhook | dice_roll_recorded |
| Game created | system | game_created |
| Game settled | system | game_settled |
| Refund issued | system | refund_issued |

Просмотр логов: `/admin/audit` (read-only, Basic Auth).

## Политика "No Real Payments / No Gambling"

**Строго до MVP launch:**

- Все транзакции в валюте `COIN` (виртуальная, не имеет реальной стоимости).
- Нет возможности пополнения/вывода реальных денег.
- Нет интеграции с платёжными системами.
- Нет gambling-механик с реальными ставками.
- Admin panel — `read-only-guard.ts` документирует контракт; write-операции (credit/debit/block) разрешены только через явно описанные Server Actions на `/admin/users/[id]`.
- Прямые POST/PUT/DELETE на admin-маршруты (settle, bulk-actions и т.п.) запрещены guard-контрактом.

**Для перехода в production с реальными деньгами:**

1. Лицензия на gambling (если применимо).
2. Замена Basic Auth на Telegram Login Widget / Mini App.
3. Включение admin write-операций с двухфакторной авторизацией.
4. Полный аудит финансовой логики.

## Smoke-тесты

```bash
npm run smoke:services           # GameService + WalletService (14 тестов)
npm run smoke:telegram-handler   # webhook handler, все команды (15 тестов)
npm run smoke:telegram           # парсинг/роутинг (9 тестов)
npm run smoke:telegram-admin     # webhook admin API (4 теста)
npm run smoke:admin-security     # admin security contract (17 тестов)
npm run smoke:env                # env validation (6 тестов)
# Всего: 65/65
```

## Откат

```bash
# Vercel: откат к предыдущему деплою
vercel rollback

# БД: откат миграции (только dev!)
npx prisma migrate resolve --rolled-back <migration-name>
```
