# Postgres/Supabase Readiness

Документ описывает переход с SQLite на Postgres (Supabase).

## Schema

`prisma/schema.prisma` переключён на `postgresql`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## Env vars

```text
DATABASE_URL=postgresql://user:pass@host:5432/db?pgbouncer=true
DIRECT_URL=postgresql://user:pass@host:5432/db
SUPABASE_PROJECT_REF=...
SUPABASE_SERVICE_ROLE_KEY=...
```

- `DATABASE_URL` — pooled connection (через pgbouncer), для приложения.
- `DIRECT_URL` — прямое подключение, для миграций.
- Не коммитьте реальные значения.

## Миграции

```bash
npx prisma migrate dev --name switch_to_postgres
npx prisma migrate deploy
```

## Prisma client

`src/server/db/prisma.ts` — убран `PrismaBetterSqlite3` адаптер:

```ts
new PrismaClient();
```

## Healthchecks

- `GET /api/health` — проверка подключения к БД (`SELECT 1`), возвращает статус и latency.
- `GET /api/health/db` — invariant checks:
  - `available_balance >= 0`
  - `locked_balance >= 0`
  - `creatorUserId != opponentUserId`

## Invariant checks

| Инвариант | Проверка |
|---|---|
| `available_balance >= 0` | `SELECT count(*) FROM wallets WHERE available_balance < 0` |
| `locked_balance >= 0` | `SELECT count(*) FROM wallets WHERE locked_balance < 0` |
| `creatorUserId != opponentUserId` | `SELECT count(*) FROM games WHERE creator_user_id = opponent_user_id` |

## Окружения

| Окружение | База | Доступ |
|---|---|---|
| dev | Локальный Postgres | Полный |
| staging | Supabase staging | Read-only admin |
| prod | Supabase production | Read-only admin (MVP) |

## Что НЕ делаем

- Перенос демо-данных из SQLite.
- Production deploy.
- Автоматический CI/CD.
- Полноценный мониторинг.
