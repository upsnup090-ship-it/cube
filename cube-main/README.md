# BigPlayBot Dices

## Описание
Базовый скелет проекта на **Next.js 13+**, **TypeScript**, **Tailwind CSS** и **ESLint**.  
Содержит минимальную админ‑панель и домашнюю страницу, но без реализации логики кошелька, игр и интеграции Telegram.

## Локальная установка

```bash
# Клонировать репозиторий (если ещё не сделано)
git clone <repo-url>
cd CubeChat

# Установить зависимости
npm install

# Запустить в режиме разработки
npm run dev
```

## Скрипты

- `dev` – запуск `next dev`
- `build` – сборка проекта
- `start` – запуск продакшн‑сервера
- `lint` – проверка ESLint
- `type-check` – проверка TypeScript без генерации файлов

## Переменные окружения
Скопируйте `.env.example` в `.env.local` и заполните нужные переменные.
**Не коммитьте реальные токены!**

Ключевые переменные:
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — Basic Auth для `/admin/*` (см. ниже).
- `TELEGRAM_WEBHOOK_SECRET` — секрет для проверки заголовка `x-telegram-bot-api-secret-token`.
- `TELEGRAM_BOT_TOKEN` — токен бота от `@BotFather`.

## Доступ к админ-панели

Маршрут `/admin/*` защищён HTTP Basic Auth через `src/middleware.ts`.

### Поведение по окружениям

| `NODE_ENV`   | `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Результат                       |
|--------------|-------------------------------------|---------------------------------|
| production   | оба заданы                          | Требуется Basic Auth            |
| production   | хотя бы одна не задана              | `503 Service Unavailable`       |
| development  | оба заданы                          | Требуется Basic Auth            |
| development  | хотя бы одна не задана              | Открытый доступ (для удобства)  |

### Сгенерировать сильный пароль

```bash
openssl rand -base64 24
```

Затем добавить в `.env.local`:

```dotenv
ADMIN_USERNAME=admin
ADMIN_PASSWORD=сюда-вставить-сгенерированный-пароль
```

### Проверка

```bash
# 401 — без креденшелов
curl -i http://localhost:3000/admin

# 200 — с правильными креденшелами
curl -i -u admin:ваш-пароль http://localhost:3000/admin
```

Для production-grade авторизации (Telegram Login Widget / Mini App initData)
см. `docs/action-plan.md` пункт **P2-6**.

## Важно
- Реальная логика кошелька, игр, платежей и Telegram‑бота **частично реализована** (см. `docs/mvp-readiness-audit.md`).
- Проект предназначен только для демонстрации инфраструктуры MVP, не для реальных денег.
- План доведения проекта до production: `docs/action-plan.md`.