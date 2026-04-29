# Telegram Webhook Stub Verification

## Scope

Implemented safe Telegram webhook parser stubs only:

- Route: `POST /api/telegram/webhook`
- Types: minimal Telegram update/message/user/chat/dice types
- Service: parse + command/dice detection
- Optional smoke check for parser behavior and DB immutability

No real Telegram API calls, no webhook setup, no token usage, no game/wallet
mutations, and no Prisma schema changes.

## Implemented Behavior

1. JSON body is parsed safely.
2. Optional secret header check:
   - Header: `x-telegram-bot-api-secret-token`
   - Compared with `process.env.TELEGRAM_WEBHOOK_SECRET`
3. If secret is configured and mismatch occurs, returns `401`.
4. If secret env is missing, route remains safe and returns stub mode response.
5. Responses are JSON-only.
6. No secrets are echoed in responses.

## Parser Behavior

- `/start` -> command `start`
- `/help` -> command `help`
- message with `dice` -> dice payload detected
- unknown text -> safe unknown result
- malformed payload -> invalid update result
- update without message -> non-message result

## Safety

- No DB writes inside route/service.
- No calls to `GameService`.
- No calls to `WalletService` or `LedgerService`.
- No external network calls.
