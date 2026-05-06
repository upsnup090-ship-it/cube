# Architecture Layers

Этот документ фиксирует глобальные слои CubeChat, чтобы дальнейшая разработка шла без путаницы между UI, Telegram, сервисной логикой, базой и safety-инвариантами.

## Главный принцип

UI, Telegram handlers и API routes не должны напрямую выполнять финансовую, settlement или refund логику.

Высокорисковые операции проходят через service layer, Prisma transactions, idempotency checks, ledger entries и audit logs.

## 1. App layer

**Назначение:** Next.js UI, pages, route handlers, server actions.

Основные зоны:

- `src/app/play/**`
- `src/app/admin/**`
- `src/app/api/**`

Разрешено:

- читать данные для отображения;
- вызывать сервисы;
- валидировать форму/HTTP request на входе;
- возвращать UI или JSON responses.

Запрещено:

- напрямую менять wallet balances;
- напрямую создавать ledger entries;
- вручную проводить settlement/refund без service layer;
- обходить idempotency.

## 2. Telegram layer

**Назначение:** принять Telegram update, распарсить команду или dice event, вызвать сервисы и отправить ответ.

Основные файлы:

- `src/app/api/telegram/webhook/route.ts`
- `src/server/telegram/telegram-webhook-service.ts`
- `src/server/telegram/telegram-webhook-handler.ts`
- `src/server/telegram/telegram-webhook-admin.ts`

Ответственность:

- проверка `TELEGRAM_WEBHOOK_SECRET`;
- парсинг update;
- обработка `/start`, `/help`, `/balance`, `/play`, `/join`, `/cancel`;
- обработка Telegram dice 🎲;
- защита от duplicate update;
- отправка сообщений через Telegram API.

Telegram layer не является источником истины по балансам или settlement.

## 3. Service layer

**Назначение:** центральная бизнес-логика PvP Dices.

Основные файлы:

- `src/server/services/game-service.ts`
- `src/server/services/wallet-service.ts`
- `src/server/services/ledger-service.ts`

Ответственность:

- создание игры;
- join игры;
- escrow lock/release/consume;
- запись dice rolls;
- resolve winner/tie;
- settlement;
- refunds;
- commission logic;
- idempotent behavior.

Правила:

- balance-changing операции только через `WalletService`;
- ledger entries только append;
- game state transitions только через `GameService`;
- settlement/refund должны быть идемпотентны;
- ошибки должны оставлять систему в безопасном состоянии.

## 4. Persistence layer

**Назначение:** Prisma schema, generated client, Postgres persistence.

Основные файлы:

- `prisma/schema.prisma`
- `prisma/migrations/**`
- `prisma/seed.ts`
- `src/server/db/prisma.ts`
- `src/generated/prisma/**`

Источник истины:

- `LedgerEntry` — история движения баланса;
- `Wallet` — текущий snapshot баланса;
- `Game` — текущее состояние игры;
- `DiceRoll` — audit trail бросков;
- `AuditLog` — sensitive operations trail;
- `IdempotencyKey` — защита от duplicate side effects.

## 5. Admin layer

**Назначение:** наблюдение, ручные админ-действия и audit visibility.

Основные зоны:

- `src/app/admin/**`
- `src/app/admin/read-only-guard.ts`
- `src/server/admin/**`

Разрешено:

- смотреть users/wallets/games/ledger/audit;
- выполнять явно разрешённые server actions через service layer;
- фиксировать ручные операции в audit.

Запрещено:

- прямой update balances из UI;
- скрытые write-actions в read-only страницах;
- обход Basic Auth/guard правил.

## 6. Config layer

**Назначение:** env validation, runtime config, feature constants.

Основные файлы:

- `.env.example`
- `src/server/config/env-validation.ts`

Правила:

- реальные секреты только в `.env`;
- `.env` не коммитить;
- `.env.example` содержит только placeholders;
- production env должен fail-closed;
- local dev может warn, но не должен скрывать критические runtime ошибки.

## 7. Safety layer

**Назначение:** сквозные правила безопасности, которые важнее отдельного слоя.

Состав:

- idempotency keys;
- Prisma transactions;
- ledger append-only;
- audit logs;
- health/invariant checks;
- smoke tests;
- explicit game statuses.

Минимальные инварианты:

- `availableBalance >= 0`;
- `lockedBalance >= 0`;
- self-play запрещён;
- duplicate Telegram update не создаёт duplicate payout/refund;
- settlement и refund идемпотентны;
- blocked/under_review user не может играть.

## Allowed direction of dependencies

```text
App layer / Telegram layer / Admin layer
  → Service layer
    → Persistence layer
      → Postgres

Config layer → all runtime layers
Safety layer → all state-changing paths
```

Запрещённые направления:

```text
UI → direct wallet update
Telegram handler → direct ledger mutation
API route → manual settlement logic
Admin page → direct balance mutation
Persistence layer → UI concerns
```

## Перед любым новым feature

Проверить:

1. В каком слое живёт изменение?
2. Нужен ли service method вместо прямой DB операции?
3. Есть ли idempotency key?
4. Есть ли ledger/audit след?
5. Не нарушает ли это local dev vs future production границу?
6. Какие smoke checks надо прогнать?
