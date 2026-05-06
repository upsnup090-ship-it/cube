# Текущее состояние проекта (факт)

Дата фиксации: **2026-05-06**

---

## Стек

- Next.js 15 (App Router, Server Components, Server Actions)
- TypeScript
- Prisma 7.8 (driver adapter) + **Postgres** (Supabase или другой)
- `@prisma/adapter-pg` + `pg` для Postgres-подключений
- TailwindCSS

---

## Текущий режим

Проект сейчас в режиме **LOCAL MVP DEV**:

- локальный Next.js dev server;
- Supabase как удалённая dev-БД;
- Telegram webhook через локальный HTTPS tunnel;
- production deploy на сервер/VPS/Vercel отложен до полной обкатки механики.

См.:
- `docs/LOCAL_DEV.md`
- `docs/architecture-layers.md`
- `docs/telegram-local-testing.md`

---

## Карта кода (основное)

### Prisma / DB
| Файл | Описание |
|---|---|
| `prisma/schema.prisma` | Схема: User, Wallet, Game, GamePlayer, DiceRoll, LedgerEntry, AuditLog, IdempotencyKey. `provider = "postgresql"` |
| `prisma/migrations/20260506_init_postgres/` | Чистая Postgres-миграция (CREATE TYPE enum'ы, SERIAL, BIGINT, JSONB), применена к Supabase |
| `prisma/seed.ts` | Idempotent seed: 3 demo-пользователя × 1000 COIN. Проверен на Supabase |
| `prisma.config.ts` | Datasource: `DIRECT_URL ?? DATABASE_URL` (Prisma CLI для миграций). Для Supabase локально используется session pooler `:5432` |
| `src/server/db/prisma.ts` | Lazy Proxy + `@prisma/adapter-pg` для Postgres. Загружает `.env` для standalone smoke scripts |
| `src/generated/prisma/` | Сгенерированный клиент |

### Services (ядро)
| Файл | Описание |
|---|---|
| `src/server/services/wallet-service.ts` | manualCredit, manualDebit, lockEscrow, releaseEscrow, consumeLockedEscrow, collectRakeFromLocked, payout, creditCommission, refund |
| `src/server/services/game-service.ts` | createGame, joinGame, recordRoll, resolveGame, settleGame, cancelWaitingGame, refundExpiredGame, processExpiredGames. Проверяет user.status перед созданием/вступлением. |
| `src/server/services/service-smoke-check.ts` | 14 тестов: happy-path, idempotency, balance guard, blocked/under_review user rejection |

### Telegram
| Файл | Описание |
|---|---|
| `src/app/api/telegram/webhook/route.ts` | POST endpoint, проверяет `TELEGRAM_WEBHOOK_SECRET` |
| `src/server/telegram/telegram-webhook-service.ts` | Парсинг update → TelegramParsedUpdate |
| `src/server/telegram/telegram-webhook-handler.ts` | Обработка: /start /help /play /join /cancel /balance, dice roll → auto-resolve → auto-settle |
| `src/server/telegram/telegram-webhook-admin.ts` | set/get/delete webhook через Telegram API |
| `src/server/telegram/telegram-api-smoke-check.ts` | API client тесты |
| `src/server/telegram/telegram-webhook-smoke-check.ts` | Парсер тесты (9) |
| `src/server/telegram/telegram-webhook-handler-smoke-check.ts` | Handler тесты (15): все команды + blocked user |
| `src/server/telegram/telegram-webhook-admin-smoke-check.ts` | Admin webhook управление (4) |

### Background jobs
| Файл | Описание |
|---|---|
| `src/app/api/jobs/refund-expired/route.ts` | POST `/api/jobs/refund-expired` — рефанд просроченных WAITING-игр + флаг stuck ROLLING/RESOLVING → under_review. Защищён `CRON_JOB_SECRET`. |

### Admin dashboard
| Путь | Описание |
|---|---|
| `/admin` | Overview: users/games метрики, locked funds, Risk секция |
| `/admin/users` | Список пользователей (→ detail) |
| `/admin/users/[id]` | Детали: profile, wallet, game history, ledger, audit, Manual Credit/Debit форма, Block/Unblock/Under-review форма |
| `/admin/games` | Список игр (→ detail) |
| `/admin/games/[id]` | Детали: summary, dice rolls, ledger, audit |
| `/admin/wallets` | Список кошельков с total available/locked |
| `/admin/ledger` | Ledger с фильтрами (userId, gameId, type, direction) |
| `/admin/audit` | Audit logs с фильтрами (action, resourceType, actorId) + resourceId ссылки |
| `/admin/risk` | Risk & Review: blocked users, under_review users, failed/under_review games |

### Admin security
| Файл | Описание |
|---|---|
| `middleware.ts` | Basic Auth для `/admin/:path*`. Dev без vars = открытый. Prod без vars = 503. Timing-safe compare. |
| `src/app/admin/read-only-guard.ts` | Контракт allowed/forbidden маршрутов |
| `src/app/admin/users/[id]/actions.ts` | Server Actions: manualCreditAction, manualDebitAction, setUserStatusAction |
| `src/server/admin/admin-security-smoke-check.ts` | 17 тестов |

### Config
| Файл | Описание |
|---|---|
| `src/server/config/env-validation.ts` | Валидация env при старте. Prod: fail-closed. Dev: warn. |
| `.env.example` | Шаблон всех env-переменных |

---

## Скрипты

```bash
npm run dev                    # Next.js dev server
npm run build                  # Production build
npm run type-check             # tsc --noEmit
npm run lint                   # eslint .

npm run smoke:services         # 14 тестов: GameService + WalletService
npm run smoke:telegram-handler # 15 тестов: все Telegram команды
npm run smoke:telegram         # 9 тестов: webhook парсер
npm run smoke:telegram-admin   # 4 теста: webhook admin API
npm run smoke:admin-security   # 17 тестов: admin security contract
npm run smoke:env              # 6 тестов: env validation
# Всего: 65/65 PASS

npm run prisma:migrate         # npx prisma migrate dev
npm run prisma:seed            # npx prisma db seed
npm run prisma:studio          # npx prisma studio

npm run telegram:webhook:set   # Установить webhook URL
npm run telegram:webhook:info  # Получить статус webhook
npm run telegram:webhook:delete # Удалить webhook
```

---

## Локальный запуск

> **Требуется Postgres** (Supabase или другой). SQLite больше не поддерживается.
>
> Текущий локальный setup проверен с Supabase pooler:
> - `DATABASE_URL` — transaction pooler `:6543`
> - `DIRECT_URL` — session pooler `:5432`

```bash
# 1. Установить зависимости
npm install

# 2. Настроить .env (скопировать из .env.example)
#    Обязательны: DATABASE_URL, DIRECT_URL

# 3. Применить миграции к Postgres
npx prisma migrate deploy

# 4. Сидировать демо-данные
npm run prisma:seed

# 5. Запустить все smoke-тесты
npm run smoke:services && npm run smoke:telegram-handler

# 6. Запустить dev server
npm run dev
# → http://localhost:3000/play   (sandbox UI)
# → http://localhost:3000/admin  (admin dashboard)
# → http://localhost:3000/api/health
# → http://localhost:3000/api/health/db
```

Последняя проверка:
- `npx prisma migrate deploy` — pending migrations нет
- `npm run prisma:seed` — успешно
- `npm run smoke:services` — 14/14 PASS
- `npm run smoke:telegram-handler` — 15/15 PASS
- `npm run smoke:admin-security` — 17/17 PASS
- `npm run smoke:env` — 6/6 PASS
- `/api/health` — `status=ok`, `db=connected`
- `/api/health/db` — invariant checks passed

---

## Ключевые инварианты

- Балансы только через `WalletService` — никакого прямого `prisma.wallet.update`
- Ledger только append — никакого update/delete
- `blockAmount` / `availableBalance` никогда не становятся отрицательными
- Blocked / under_review пользователи не могут создавать или вступать в игры (`assertUserCanPlay`)
- Все операции идемпотентны по `idempotencyKey`
- Все sensitive операции создают `AuditLog`
