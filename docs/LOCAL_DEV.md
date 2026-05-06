# LOCAL MVP DEV

Этот документ фиксирует текущий режим проекта: локальная разработка MVP с Supabase как dev-БД и Telegram webhook через локальный tunnel.

## Текущий режим

Проект сейчас находится в фазе **LOCAL MVP DEV**.

Это означает:

- приложение запускается локально через `npm run dev`;
- Postgres используется через Supabase как удалённая dev-БД;
- Telegram webhook тестируется через публичный tunnel к `localhost:3000`;
- production deploy на сервер/VPS/Vercel отложен;
- все решения должны быть совместимы с будущим сервером, но не должны усложнять локальную обкатку механики.

## Что сейчас делаем

1. Поддерживаем локально запускаемый проект.
2. Используем Supabase как dev-БД.
3. Подключаем Telegram bot через локальный tunnel.
4. Обкатываем всю механику PvP Dices.
5. Документируем архитектурные слои и правила.
6. Избегаем путаницы между local dev и future production.

## Что сейчас не делаем

- Не деплоим приложение на production.
- Не переносим проект на VPS/сервер.
- Не настраиваем nginx, PM2, SSL, Docker production pipeline.
- Не добавляем real-money, crypto, fiat, casino/banker режимы.
- Не усложняем инфраструктуру без необходимости для локальной механики.
- Не сбрасываем Supabase БД без явного решения.

## Локальная инфраструктура

| Компонент | Текущий выбор | Назначение |
|---|---|---|
| App runtime | Next.js dev server | `http://localhost:3000` |
| Database | Supabase Postgres | dev-БД для локальной обкатки |
| Prisma runtime | `@prisma/adapter-pg` + `pg` | доступ к Postgres |
| Tunnel | localtunnel / альтернативно ngrok/cloudflared | публичный HTTPS URL для Telegram webhook |
| Telegram | BotFather bot token в `.env` | ручная проверка команд и dice flow |

## Env policy

`.env` — локальный секретный файл. Его нельзя коммитить.

Минимум для локальной работы:

```env
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.<project-ref>:<password>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
```

Для Telegram через tunnel:

```env
TELEGRAM_BOT_TOKEN=<token-from-botfather>
TELEGRAM_WEBHOOK_SECRET=<random-secret>
TELEGRAM_WEBHOOK_URL=https://<tunnel-domain>/api/telegram/webhook
TELEGRAM_API_BASE_URL=https://api.telegram.org
```

## Локальный порядок запуска

1. Проверить `.env`.
2. Запустить миграции:

```powershell
npx prisma migrate deploy
```

3. Заполнить демо-данные:

```powershell
npm run prisma:seed
```

4. Прогнать smoke:

```powershell
npm run smoke:services
npm run smoke:telegram-handler
npm run smoke:admin-security
npm run smoke:env
```

5. Запустить приложение:

```powershell
npm run dev
```

6. Проверить:

- `http://localhost:3000/play`
- `http://localhost:3000/admin`
- `http://localhost:3000/api/health`
- `http://localhost:3000/api/health/db`

## Критерии готовности local dev

Локальная среда считается готовой, если:

- `npx prisma migrate deploy` не имеет pending/failed миграций;
- `npm run prisma:seed` успешен;
- `npm run smoke:services` проходит `14/14 PASS`;
- `/api/health` возвращает `status=ok` и `db=connected`;
- `/api/health/db` возвращает passed invariant checks;
- `/play` и `/admin` рендерятся;
- Telegram webhook может быть временно установлен на tunnel URL.

## Правило разделения local dev и future production

Любое новое решение должно явно относиться к одному из режимов:

- **Local dev now** — нужно для обкатки механики сейчас.
- **Future production later** — важно в будущем, но не должно блокировать локальную механику.

Если решение относится к future production, оно фиксируется в docs/roadmap, но не внедряется без отдельного решения.
