# Milestone 0.1 — Telegram Readiness: Утверждённые решения

Дата: **2026-05-05**

Цель: зафиксировать ключевые решения, чтобы разблокировать реальную Telegram-интеграцию.

---

## 1. Idempotency key для Telegram updates

**Формат:** `tg:update:<update_id>`

- `update_id` — целое число из Telegram update payload.
- Пример: `tg:update:123456789`.
- Ключ проверяется в таблице `IdempotencyKey` **до** любой обработки.
- Если ключ существует — возвращаем сохранённый результат, новых side-effects нет.
- Операции, производные от update, используют составные ключи:
  - Dice roll: `tg:update:<update_id>:dice_roll`
  - User upsert: `tg:update:<update_id>:user_upsert`

**Где в коде:**
- Проверка: `TelegramWebhookHandler.handleUpdate()` — первая строка.
- Запись: после успешной обработки, в той же транзакции.

---

## 2. Маппинг Telegram user → внутренний User

**Primary identity:** `from.id` (Telegram user ID, число).

- Хранится в поле `User.telegramUserId` (тип `String`, уникальный).
- `from.id` — стабильный и не меняется.

**Username и displayName:**
- `username` и `displayName` **обновляются** при каждом входящем update (upsert-стратегия).
- Если `username` отсутствует — поле остаётся `null`. Это **не блокирует** обработку.
- Смена username логируется в `AuditLog` с `action: "user_profile_updated"`.

**Upsert-логика:**
```
findOrCreate User by telegramUserId = String(from.id)
if user exists AND (username changed OR displayName changed):
  update user fields
  log audit entry
```

**Создание кошелька:**
- Wallet создаётся автоматически при первом upsert через `WalletService.getWalletByUserId()`.

---

## 3. Active game lookup

**Правило:** один активный матч на пользователя.

- Пользователь не может участвовать в двух играх одновременно, если хотя бы одна в статусе `waiting`, `matched`, `rolling` или `resolving`.
- Проверка: при `/start` или join — ищем `GamePlayer` с `userId`, где `Game.status IN (waiting, matched, rolling, resolving)`.

**Lookup по dice-event:**
- Dice event приходит из конкретного chat.
- Поиск: `Game` в активном статусе, где пользователь — участник (`GamePlayer`).
- Если нет активной игры — dice игнорируется (не ошибка).
- Если найдена одна игра — привязываем roll к ней.

---

## 4. Dice acceptance rules

**Принимаемые emoji:** только `🎲` (стандартный dice).

- Другие Telegram dice (`🎯`, `🏀`, `⚽`, `🎳`, `🎰`) — **игнорируются**.
- Фильтрация: `message.dice.emoji === "🎲"`.

**Допустимые значения:**
- Значение dice: `1–6` (целое число).
- `dice_count` определяется игрой: `1` или `2`.
- Каждый Telegram dice event — это один бросок (`diceValue`).
- При `diceCount = 2` — нужно 2 отдельных dice event от игрока в одном раунде.
- `totalValue` = сумма всех `diceValue` за раунд.

**Политика tie/reroll:**
- При равенстве `totalValue` обоих игроков — автоматический reroll.
- Игра переходит в статус `rolling` с `resultReason: "tie_requires_reroll"`.
- Новый раунд (`rollRound + 1`).
- Максимум раундов: **не ограничено** (но можно добавить лимит позже).

---

## 5. Таймауты и триггеры refund

### TTL по статусам

| Статус | TTL | Действие при истечении |
|---|---|---|
| `waiting` | **10 минут** (настраиваемо через `Game.expiresAt`) | Refund creator escrow, статус → `refunded` |
| `rolling` | **5 минут** с момента перехода в `rolling` | Статус → `under_review`, alert в admin |
| `resolving` | **2 минуты** с момента перехода в `resolving` | Статус → `under_review`, alert в admin |

### Кто триггерит refund

**Механизм:** Background job (scheduler).

- Периодичность: каждые **60 секунд**.
- Job ищет игры с `status = waiting` AND `expiresAt < NOW()`.
- Для каждой: вызывает `GameService.cancelWaitingGame()` с idempotency key `game:auto_expire:<gameId>`.
- Job идемпотентен — повторный запуск безопасен.

**Stuck game detection:**
- Job ищет `rolling`/`resolving` игры старше TTL.
- Переводит в `under_review` с audit log.
- **Не делает** автоматический refund для `rolling`/`resolving` — только admin review.

### Refund policy

- Refund возможен **только** из `waiting` (до join opponent).
- Из `matched`/`rolling`/`resolving` — **нет автоматического refund**, только через admin.
- Refund идемпотентен через `WalletService.refund()`.

---

## 6. Webhook processing pipeline

```
Telegram Update
  │
  ├─ 1. Validate payload (TelegramWebhookService.parseUpdate)
  ├─ 2. Check idempotency key: tg:update:<update_id>
  │     └─ exists? → return cached response
  ├─ 3. Upsert User by from.id
  ├─ 4. Route by parsed kind:
  │     ├─ dice → find active game → recordRoll → auto-resolve if ready
  │     ├─ command /start → (future: create/join game flow)
  │     ├─ command /help → (future: send help message)
  │     └─ other → ignore
  ├─ 5. Store raw payload in DiceRoll.rawPayload (для аудита)
  └─ 6. Write idempotency key + audit log
```

---

## Что НЕ входит в Milestone 0.1

- Реальное подключение к Telegram Bot API.
- Отправка сообщений пользователю.
- Реальный webhook endpoint (будет в Milestone 1).
- Banker mode.
- Payment интеграции.
