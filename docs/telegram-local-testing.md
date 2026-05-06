# Telegram Local Testing

Этот документ описывает локальную проверку реального Telegram bot flow через tunnel к `localhost:3000`.

## Цель

Проверить настоящую механику Telegram-first PvP Dices до production deploy:

- `/start`
- `/balance`
- `/play <amount> [diceCount]`
- `/join <code>`
- Telegram dice 🎲
- auto resolve
- auto settle
- wallets
- ledger
- audit
- idempotency на duplicate webhook update

## Предусловия

Локальная среда должна быть готова по `docs/LOCAL_DEV.md`:

- Supabase доступен;
- миграции применены;
- seed выполнен;
- `npm run smoke:services` проходит;
- `npm run dev` запущен на `http://localhost:3000`.

## Env

В `.env` должны быть:

```env
TELEGRAM_BOT_TOKEN=<token-from-botfather>
TELEGRAM_WEBHOOK_SECRET=<random-secret>
TELEGRAM_WEBHOOK_URL=https://<tunnel-domain>/api/telegram/webhook
TELEGRAM_API_BASE_URL=https://api.telegram.org
```

Не коммитить `.env`.

## Tunnel

Текущий рабочий вариант для локального теста:

```powershell
npx --yes localtunnel --port 3000
```

Команда выдаёт URL вида:

```text
https://<random-subdomain>.loca.lt
```

После каждого перезапуска tunnel URL может измениться. Тогда нужно обновить `TELEGRAM_WEBHOOK_URL` в `.env` и заново выполнить `npm run telegram:webhook:set`.

## Установка webhook

```powershell
npm run telegram:webhook:set
npm run telegram:webhook:info
```

Ожидаемо:

- `setWebhook` возвращает success;
- `getWebhookInfo` показывает актуальный `url`;
- `pending_update_count` не растёт бесконечно;
- `last_error_message` отсутствует.

## Ручной сценарий проверки

### 1. Start/help

В Telegram отправить:

```text
/start
/help
```

Проверить:

- бот отвечает;
- ошибок в dev server console нет;
- audit log пишет outgoing message events.

### 2. Balance

Отправить:

```text
/balance
```

Проверить:

- user создаётся/находится по Telegram id;
- wallet существует;
- баланс отображается корректно.

### 3. Create game

Отправить от игрока A:

```text
/play 100 1
```

Проверить:

- игра создана в `waiting`;
- creator escrow locked;
- public code показан пользователю;
- ledger содержит escrow entry;
- audit содержит sensitive action.

### 4. Join game

Отправить от игрока B:

```text
/join <CODE>
```

Проверить:

- игра переходит в `matched`;
- opponent escrow locked;
- self-play невозможен;
- blocked/under_review users не могут играть.

### 5. Dice roll

Оба игрока отправляют стандартный Telegram dice 🎲.

Проверить:

- `DiceRoll` создаётся для каждого игрока;
- duplicate dice update не создаёт второй roll;
- после двух roll игра resolve-ится;
- при winner outcome запускается settlement;
- при tie применяется ожидаемая логика проекта.

### 6. Settlement checks

После завершения игры проверить в `/admin`:

- `Game.status = settled` или ожидаемый terminal status;
- winner/loser заполнены;
- locked balances вернулись к ожидаемому состоянию;
- ledger entries отражают escrow consume, payout, commission/refund;
- audit logs есть.

### 7. Idempotency duplicate checks

Повторить потенциально дублируемые действия:

- тот же webhook update;
- повторный dice event;
- повторный `/join`;
- повторный settlement через service smoke или admin inspection.

Ожидание:

- нет double payout;
- нет double refund;
- нет отрицательных balances;
- duplicate update возвращает безопасный результат.

## Admin inspection URLs

Во время теста смотреть:

- `http://localhost:3000/admin`
- `http://localhost:3000/admin/users`
- `http://localhost:3000/admin/wallets`
- `http://localhost:3000/admin/games`
- `http://localhost:3000/admin/ledger`
- `http://localhost:3000/admin/audit`
- `http://localhost:3000/api/health/db`

## После теста

Зафиксировать:

- что прошло;
- что сломалось;
- какие idempotency/ledger/audit вопросы возникли;
- какие изменения нужны в service layer, Telegram layer или admin layer.

Не исправлять хаотично: каждый баг сначала классифицировать по `docs/architecture-layers.md`.
