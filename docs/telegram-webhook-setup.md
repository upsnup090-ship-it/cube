# Telegram Webhook Setup

Этот документ описывает настройку реального Telegram webhook для CubeChat Dices.

## Required env vars

```text
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=...
TELEGRAM_WEBHOOK_URL=https://your-domain.example/api/telegram/webhook
TELEGRAM_API_BASE_URL=https://api.telegram.org
TELEGRAM_PROXY_URL=...
TELEGRAM_PROXY_KIND=none|http|socks5
TRUST_PROXY=false
```

- `TELEGRAM_BOT_TOKEN` — токен бота из BotFather.
- `TELEGRAM_WEBHOOK_SECRET` — секретный header `x-telegram-bot-api-secret-token`.
- `TELEGRAM_WEBHOOK_URL` — публичный HTTPS URL webhook endpoint.
- `TELEGRAM_API_BASE_URL` — base URL Telegram API. По умолчанию `https://api.telegram.org`; можно заменить на внутренний outbound proxy/gateway.
- `TELEGRAM_PROXY_URL` — зарезервировано для будущего HTTP/SOCKS proxy agent.
- `TELEGRAM_PROXY_KIND` — зарезервировано для выбора типа outbound proxy.
- `TRUST_PROXY` — зарезервировано для inbound reverse proxy policy.

Не коммитьте реальные значения в репозиторий.

## Proxy readiness

Интеграция заранее учитывает два направления proxy:

### Outbound proxy: backend → Telegram API

Метод `telegramWebhookService.sendMessage()` использует:

```text
TELEGRAM_API_BASE_URL/bot<TELEGRAM_BOT_TOKEN>/sendMessage
```

По умолчанию:

```text
https://api.telegram.org
```

Если окружение требует proxy/gateway, можно указать:

```text
TELEGRAM_API_BASE_URL=https://telegram-proxy.example
```

Полноценные HTTP/SOCKS proxy agents (`TELEGRAM_PROXY_URL`, `TELEGRAM_PROXY_KIND`) пока только зарезервированы, чтобы не добавлять зависимости без подтверждённой инфраструктуры.

### Inbound proxy: Telegram → webhook endpoint

Webhook endpoint может стоять за reverse proxy/CDN/tunnel:

- Nginx
- Cloudflare
- Vercel/Netlify edge
- ngrok для локального теста

Reverse proxy должен прокидывать:

```text
x-forwarded-for
x-forwarded-proto
host
x-telegram-bot-api-secret-token
```

На MVP endpoint доверяет только `x-telegram-bot-api-secret-token`; IP allowlist и `TRUST_PROXY` policy должны быть добавлены отдельным безопасным шагом.

## Endpoint

```text
POST /api/telegram/webhook
```

Endpoint принимает Telegram updates, проверяет secret header, затем вызывает `TelegramWebhookHandler`.

## Webhook management (npm scripts)

```bash
npm run telegram:webhook:set    # set webhook using TELEGRAM_WEBHOOK_URL + TELEGRAM_WEBHOOK_SECRET
npm run telegram:webhook:info   # get current webhook info
npm run telegram:webhook:delete # delete webhook
```

Все команды используют `TELEGRAM_BOT_TOKEN` и `TELEGRAM_API_BASE_URL` из env.

## Set webhook (manual)

```powershell
$body = @{
  url = $env:TELEGRAM_WEBHOOK_URL
  secret_token = $env:TELEGRAM_WEBHOOK_SECRET
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "https://api.telegram.org/bot$env:TELEGRAM_BOT_TOKEN/setWebhook" `
  -ContentType "application/json" `
  -Body $body
```

## Check webhook (manual)

```powershell
Invoke-RestMethod "https://api.telegram.org/bot$env:TELEGRAM_BOT_TOKEN/getWebhookInfo"
```

## Delete webhook (manual)

```powershell
Invoke-RestMethod -Method Post "https://api.telegram.org/bot$env:TELEGRAM_BOT_TOKEN/deleteWebhook"
```

## Local testing with tunnel

Для локального тестирования нужен публичный HTTPS tunnel, например ngrok:

```powershell
ngrok http 3000
```

Затем установите:

```text
TELEGRAM_WEBHOOK_URL=https://<ngrok-domain>/api/telegram/webhook
```

## Supported commands

- `/start` — приветствие.
- `/help` — справка.

## Audit

Исходящие ответы на команды пишутся в `AuditLog` с `action = telegram_message_sent`.
