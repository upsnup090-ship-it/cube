# Admin Security

Документ описывает минимальную схему защиты админ-панели CubeChat Dices.

## Схема защиты

Выбрана **HTTP Basic Auth** как минимальная схема для MVP staging:

| NODE_ENV    | ADMIN_USERNAME / ADMIN_PASSWORD | Результат                    |
|-------------|--------------------------------|------------------------------|
| production  | оба заданы                     | Basic Auth обязателен        |
| production  | хотя бы один отсутствует       | 503 Service Unavailable      |
| development | оба заданы                     | Basic Auth обязателен        |
| development | хотя бы один отсутствует       | открыт (удобство локальной разработки) |

## Почему Basic Auth

- Edge runtime (Next.js middleware) не поддерживает `node:crypto` bcrypt.
- Для MVP staging панели plaintext-in-env + timing-safe сравнение приемлемо.
- При переходе в production с реальными пользователями заменить на Telegram Login Widget или Mini App initData.

## Env vars

```text
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
```

Не коммитьте реальные значения.

## Read-only контракт

Файл `src/app/admin/read-only-guard.ts` определяет:

- **7 разрешённых страниц** (все GET-only, readOnly=true):
  - `/admin` — дашборд
  - `/admin/users` — список пользователей
  - `/admin/users/:id` — детали пользователя
  - `/admin/wallets` — кошельки
  - `/admin/games` — игры
  - `/admin/games/:id` — детали игры
  - `/admin/ledger` — журнал операций
  - `/admin/audit` — аудит логи

- **Запрещённые действия**: любые POST/PUT/DELETE на admin-эндпоинты (credit, debit, settle, refund, manual-adjustment и т.д.)

## Middleware

Файл `middleware.ts` в корне проекта:

- Матчер: `/admin/:path*`
- Timing-safe сравнение credentials (защита от timing attacks)
- Production fail-closed: без настроек → 503

## Проверка

```bash
npm run smoke:admin-security
```
