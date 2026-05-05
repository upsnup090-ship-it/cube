# MVP Readiness Audit (v0.1 — updated 2026-05-06)

Цель: фактическое состояние репозитория после всех foundation-итераций. Актуальная версия.
Предыдущий аудит: 2026-04-30 (исходная версия).

---

## Итог (коротко)

| Блок | Статус |
|---|---|
| Prisma + SQLite + миграции | **DONE** |
| Seed (idempotent) | **DONE** |
| WalletService | **DONE** |
| GameService | **DONE** |
| User status enforcement (block/review → can't play) | **DONE** |
| Telegram webhook handler + all commands | **DONE** |
| Background refund job (`/api/jobs/refund-expired`) | **DONE** |
| Admin overview (metrics, risk section) | **DONE** |
| Admin detail pages (game/user) | **DONE** |
| Admin manual credit/debit UI | **DONE** |
| Admin block/unblock/under-review UI | **DONE** |
| Ledger + Audit filters | **DONE** |
| Risk & Review page | **DONE** |
| Service smoke checks | **DONE** (14/14) |
| Telegram handler smoke checks | **DONE** (15/15) |
| All smoke checks combined | **DONE** (59/59) |
| Type-check | **PASS** |
| Admin auth/guard | **NOT STARTED** — `/admin` открыт без логина |
| Vitest/unit tests | **NOT STARTED** |
| Postgres/Supabase migration | **NOT STARTED** |

---

## Smoke test matrix

| Script | Tests | Result |
|---|---|---|
| `npm run smoke:services` | 14 | PASS |
| `npm run smoke:telegram-handler` | 15 | PASS |
| `npm run smoke:admin-security` | 17 | PASS |
| `npm run smoke:telegram` | 9 | PASS |
| `npm run smoke:telegram-admin` | 4 | PASS |
| `npm run smoke:env` | 6 | PASS |
| **Total** | **65** | **PASS** |

---

## Acceptance coverage

### Core MVP acceptance (п.1-16)

| # | Item | Status |
|---|---|---|
| 1 | Users mapped to Telegram identities | ✓ |
| 2 | Wallet available + locked balances | ✓ |
| 3 | Immutable ledger history | ✓ |
| 4 | Admin manual credit | ✓ UI + service + audit |
| 5 | Admin manual debit | ✓ UI + service + audit |
| 6 | PvP game creation | ✓ |
| 7 | Escrow lock on creation | ✓ |
| 8 | Opponent join | ✓ |
| 9 | Escrow lock on join | ✓ |
| 10 | Dice roll recording | ✓ |
| 11 | Winner resolution | ✓ |
| 12 | Settlement | ✓ |
| 13 | Expired game refund | ✓ background job + audit |
| 14 | Admin dashboard visibility | ✓ |
| 15 | Audit logs for sensitive actions | ✓ |
| 16 | Idempotency protection | ✓ |

### User / wallet acceptance

| # | Item | Status |
|---|---|---|
| 1-3 | User-Telegram mapping, unique, admin-visible | ✓ |
| 4-5 | Blocked / under_review cannot create or join | ✓ enforced in `assertUserCanPlay` |
| 6-9 | Balances visible, integer, no float | ✓ |
| 10-11 | No negative available/locked | ✓ WalletService guards |

### Admin dashboard acceptance (п.1-10 + visual)

| Item | Status |
|---|---|
| Users, Wallets, Games | ✓ |
| Game details (rolls, ledger, audit) | ✓ `/admin/games/[id]` |
| Dice rolls | ✓ |
| Ledger entries | ✓ with filters |
| Audit logs | ✓ with filters + resourceId |
| Manual credits/debits | ✓ forms with reason |
| Failed / under-review games | ✓ Risk & Review page |
| Available + Locked balance | ✓ |
| Game status, bet, players, winner | ✓ |
| Settlement status | ✓ |
| Ledger transaction ids | ✓ |
| Risk / review status | ✓ |

### Audit acceptance (13 actions)

All actions logged with actorType/actorId/action/resourceType/resourceId/metadata/timestamp:
`manual_credit`, `manual_debit`, `user_block`, `user_unblock`, `user_mark_review`,
`create_game`, `join_game`, `cancel_game`, `refund`, `record_roll`,
`resolve_game`, `settle_game`, `stuck_game_flagged_by_job`.

### Compliance placeholders

Fields present in schema and admin UI: `status`, `ageConfirmed`, `regionCode`, `responsibleLimitPerDay`.
Not editable via admin (placeholders only — acceptance requires visibility, not editing).

---

## Known gaps / не реализовано (вне текущего scope)

| Gap | Notes |
|---|---|
| Admin auth guard | `/admin` открыт локально. Для staging нужен basic auth или OIDC. Блокер перед публичным staging. |
| Vitest/Jest unit tests | Нет тестового фреймворка. Smoke checks покрывают критические пути. |
| Postgres/Supabase migration | SQLite → Postgres: нужен `datasource` switch + проверка типов BigInt. Docs в `docs/milestone-2-postgres-plan.md`. |
| ADMIN_USERNAME / ADMIN_PASSWORD | В env-validation как required в prod, но middleware guard не реализован. |
| `/admin` rate limiting | Нет. |
| Real Telegram token | Нет и не нужен для local dev. Для staging — см. `docs/telegram-webhook-setup.md`. |
| Acceptance п.184 "no rake" | Расхождение: код берёт 50 bps комиссию по умолчанию (env-configurable). Принято как архитектурное решение. |

---

## Verification (текущий прогон)

```
npm run type-check      → 0 errors
npm run smoke:services  → 14/14 PASS
npm run smoke:telegram-handler → 15/15 PASS
npm run smoke:admin-security   → 17/17 PASS
npm run smoke:telegram         → 9/9 PASS
npm run smoke:telegram-admin   → 4/4 PASS
npm run smoke:env              → 6/6 PASS
```

Не запускались (нет скриптов / внешние зависимости):
- `npm run build` — не запускался в этой сессии (не деплоим)

```
npx eslint src/ prisma/ --max-warnings 0  → 0 errors, 0 warnings
```
