# Milestone 2 — Postgres/Supabase: План перехода

Дата: **2026-05-05**

Цель: перевод datasource с SQLite на Postgres (Supabase), миграции, staging deploy.

---

## 1. Перевод datasource на Postgres

### Изменения в `prisma/schema.prisma`

```diff
datasource db {
-  provider = "sqlite"
+  provider = "postgresql"
+  url      = env("DATABASE_URL")
}
```

### Новые env vars (без значений)

```text
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...          # для миграций (если используется pooled connection)
SUPABASE_PROJECT_REF=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Что меняется в коде

- **`src/server/db/prisma.ts`** — убрать `PrismaBetterSqlite3` адаптер.
  ```diff
  - import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
  - const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
  - new PrismaClient({ adapter });
  + new PrismaClient();
  ```

- **BigInt**: SQLite хранит BigInt как строку, Postgres — как `bigint`. Prisma автоматически маппит, но нужно проверить все места с `BigInt(...)`.

- **`@unique` на `LedgerEntry.idempotencyKey`** — работает одинаково.

---

## 2. Миграции

### Порядок действий

1. Создать новую миграцию:
   ```bash
   npx prisma migrate dev --name switch_to_postgres
   ```
2. Проверить SQL в сгенерированной миграции:
   - Все `BigInt` → `bigint` / `numeric`
   - `@default(autoincrement())` → `SERIAL` / `BIGSERIAL`
   - Enum'ы → нативные Postgres enum'ы
3. Применить на staging:
   ```bash
   npx prisma migrate deploy
   ```

### Проверки invariants (после миграции)

| Инвариант | Проверка |
|---|---|
| `available_balance >= 0` | `SELECT count(*) FROM wallets WHERE available_balance < 0` |
| `locked_balance >= 0` | `SELECT count(*) FROM wallets WHERE locked_balance < 0` |
| Сумма ledger = wallet | Сверить `SUM(ledger) vs wallet.available + wallet.locked` |
| Нет дублей idempotencyKey | `@unique` гарантирует |
| `Game.creatorUserId != opponentUserId` | `SELECT count(*) FROM games WHERE creator_user_id = opponent_user_id` |

---

## 3. Staging deploy

### Окружения

| Окружение | База | Доступ |
|---|---|---|
| `dev` | Локальный Postgres / SQLite | Полный |
| `staging` | Supabase staging project | Read-only admin |
| `prod` | Supabase production | Read-only admin (MVP) |

### Healthchecks

- `GET /api/health` — проверка подключения к БД.
- `GET /api/health/db` — `SELECT 1`.

### Мониторинг (минимальный)

- Количество игр по статусам (каждые 5 мин).
- Количество `failed` / `under_review` игр.
- Баланс locked vs available.

---

## 4. Что НЕ делаем в Milestone 2

- Перенос демо-данных из SQLite (опционально, отдельным шагом).
- Production deploy.
- Автоматический CI/CD.
- Полноценный мониторинг (только базовые healthchecks).
