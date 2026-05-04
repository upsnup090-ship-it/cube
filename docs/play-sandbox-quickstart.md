# Play Sandbox Quickstart (Local Only)

This document describes how to run the **/play sandbox** flow locally using **demo users** and the existing services.

## Safety (Read First)

This is **sandbox / demo only**.

- No real payments
- No production gambling
- Not connected to Telegram
- Dice rolls are manual test values (1–6), **not** real Telegram dice results
- Money movement goes through `GameService` → `WalletService` (no direct wallet mutations from UI)

## 1) Prepare Local DB

Run Prisma checks and seed demo users/wallets:

```bash
npx prisma validate
npx prisma migrate status
npx prisma db seed
```

Expected result:
- Prisma schema validates
- Migrations are up to date
- Demo users exist (e.g. `demo_creator_001`, `demo_opponent_001`, `demo_admin_001`)

## 2) Start App

Start the dev server:

```bash
npm run dev
```

## 3) Open Sandbox

Open:

- `http://localhost:3000/play`

## 4) Manual Sandbox Flow (Playable PvP Dices)

1. Go to `/play`.
2. Click **Create game**.
3. Select a **creator demo user**, set **bet amount**, set **dice count** (1 or 2), submit.
4. Copy the displayed `publicCode`.
5. Go to **Join game**.
6. Paste `publicCode`, select an **opponent demo user** (different from creator), submit.
7. Open the game page: `/play/games/[id]`.
8. Record rolls (manual test values):
   - **Record creator roll** (value 1–6, source `system_test` or `admin_test`)
   - **Record opponent roll** (value 1–6, source `system_test` or `admin_test`)
9. Click **Resolve**.
10. Click **Settle**.
11. Inspect admin dashboards:
   - `/admin/games`
   - `/admin/ledger`

Notes:
- A tie may require another roll round (record rolls again and resolve).
- Settlement is idempotent (repeat settle should not double-pay).

## 5) Troubleshooting

### Seed: missing demo users

If `/play` shows no demo users, re-run:

```bash
npx prisma db seed
```

### Insufficient balance

If `create` or `join` fails with insufficient funds, ensure seed ran successfully and demo wallets have balance.

You can also run the service smoke check to top up demo users via `WalletService.manualCredit`:

```bash
npm run smoke:services
```

### Duplicate settle / double click

Settlement uses an idempotency key on the server side, so repeating settle should not double-payout.
If you see an error, refresh the game page and confirm the game status and ledger entries.

### Game already joined

If join fails with “already joined” / “not waiting”, verify:
- you are using the correct `publicCode`
- the game is still in `waiting` state and not expired

### Build / lint / type-check

Run the standard local verification commands:

```bash
npm run type-check
npm run lint
npm run build
```

