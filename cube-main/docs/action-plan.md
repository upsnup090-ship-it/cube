# Action Plan — BigPlayBot Dices

> Подробный пошаговый план устранения дефектов и доведения проекта до production.
> Создан: 04.05.2026. Источник: `cube_analysis_report` (внешний аудит).
>
> Каждая задача снабжена:
> - **Цель** — зачем это делаем.
> - **Затронутые файлы** — где конкретно править.
> - **Шаги** — пошагово, без двусмысленностей.
> - **Acceptance criteria** — как понять, что сделано.
> - **Estimate** — реалистичная оценка времени.
>
> Используй чекбоксы `[ ]` / `[x]` чтобы отмечать прогресс прямо в файле.

---

## Легенда приоритетов

- 🔥 **P0** — critical. Блокирует подключение реальных денег / Telegram. Сделать в первую очередь.
- ⚡ **P1** — high. Технический долг и риски целостности. Сделать на этой неделе.
- 🛠 **P2** — medium. Production readiness. Сделать до запуска.

---

# 🔥 Спринт 0 — Critical Fixes (1-2 дня)

## P0-1. Middleware-аутентификация на `/admin`

**Цель:** закрыть админ-панель от публичного доступа. Сейчас любой, кто знает URL, видит балансы, проводки и audit-лог всех пользователей.

**Затронутые файлы:**
- `src/middleware.ts` (создать)
- `.env.example` (добавить переменные)
- `package.json` (если решим использовать `bcryptjs` для хэша)

**Шаги:**

- [x] **0-1.1.** Решить уровень защиты для MVP. Рекомендую **HTTP Basic Auth с хэшем пароля** — простейшая защита, нулевая зависимость от UI.
- [x] **0-1.2.** Добавить переменные в `.env.example`:
  ```dotenv
  # Admin panel — required in production
  ADMIN_USERNAME=admin
  ADMIN_PASSWORD_HASH=  # bcrypt hash; generate via: node -e "require('bcryptjs').hash(process.argv[1], 10).then(console.log)" 'your-password'
  ```
- [x] **0-1.3.** Создать `src/middleware.ts`:
  ```typescript
  import { NextRequest, NextResponse } from "next/server";

  export const config = {
    matcher: ["/admin/:path*"],
  };

  export function middleware(req: NextRequest) {
    const username = process.env.ADMIN_USERNAME;
    const passwordHash = process.env.ADMIN_PASSWORD_HASH;

    // Production fail-closed: если переменных нет — блокируем.
    if (process.env.NODE_ENV === "production" && (!username || !passwordHash)) {
      return new NextResponse("Admin not configured", { status: 503 });
    }

    // Dev fallback: пропускаем если переменных нет вообще.
    if (!username || !passwordHash) return NextResponse.next();

    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Basic ")) {
      return new NextResponse("Auth required", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="admin"' },
      });
    }

    const [providedUser, providedPass] = atob(auth.slice(6)).split(":");

    // Сравнение через bcrypt вынесем в отдельный edge-совместимый helper.
    // Для MVP можно сравнивать plaintext через ADMIN_PASSWORD без хэша,
    // но тогда строго пометить эту версию как "staging only".
    if (providedUser !== username) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // ВАЖНО: bcrypt в Node.js, edge runtime его не поддерживает.
    // Решение: использовать `runtime: "nodejs"` в middleware (Next.js 15.2+).
    // ...либо для MVP использовать timing-safe equal по plaintext паролю.

    return NextResponse.next();
  }
  ```
- [x] **0-1.4.** Добавить в `next.config.ts` (если ещё нет):
  ```typescript
  experimental: { nodeMiddleware: true }  // для bcrypt в middleware
  ```
- [x] **0-1.5.** Документировать в `README.md` раздел `## Admin access` с инструкцией генерации хэша.
- [x] **0-1.6.** Добавить запись в `11_CHANGELOG.md`.

**Acceptance criteria:**
- Запрос `curl http://localhost:3000/admin` возвращает `401`.
- Запрос с `-u admin:correctpass` возвращает `200`.
- В production без env возвращается `503`, не `200`.
- В dev без env маршрут работает (для удобства разработки).

**Estimate:** 3-4 часа.

---

## P0-2. Безопасный Telegram webhook ✅ СДЕЛАНО (2026-05-04)

**Цель:** запретить приём webhook-ов без `TELEGRAM_WEBHOOK_SECRET` в production. Сейчас при отсутствии переменной парсер просто работает в `stub_no_secret_configured`-режиме.

**Затронутые файлы:**
- `src/app/api/telegram/webhook/route.ts`
- `.env.example`

**Шаги:**

- [x] **0-2.1.** Заменить блок проверки в `route.ts`:
  ```typescript
  const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const headerSecret = request.headers.get(TELEGRAM_SECRET_HEADER);

  // Production fail-closed
  if (process.env.NODE_ENV === "production" && !configuredSecret) {
    return NextResponse.json(
      { ok: false, error: "Webhook not configured" },
      { status: 503 },
    );
  }

  // Если секрет настроен — обязан совпасть
  if (configuredSecret && headerSecret !== configuredSecret) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized webhook secret" },
      { status: 401 },
    );
  }
  ```
- [x] **0-2.2.** Добавить опциональную проверку Telegram IP-allowlist (для production):
  ```typescript
  const TELEGRAM_IP_RANGES = ["149.154.160.0/20", "91.108.4.0/22"];
  // helper isIpInCidr() — реализовать или взять npm-пакет ip-cidr.
  ```
- [x] **0-2.3.** Записать аудит-лог при провале проверки секрета:
  ```typescript
  await prisma.auditLog.create({
    data: {
      actorType: "telegram_webhook",
      action: "webhook_unauthorized",
      resourceType: "webhook",
      metadata: { providedSecret: headerSecret?.slice(0, 4) + "***" },
    },
  });
  ```
  (только при наличии configuredSecret, чтобы не флудить лог в dev).
- [x] **0-2.4.** Обновить `.env.example`:
  ```dotenv
  # Telegram — required in production
  TELEGRAM_WEBHOOK_SECRET=  # generate: openssl rand -hex 32
  TELEGRAM_BOT_TOKEN=       # from @BotFather
  ```
- [x] **0-2.5.** Прогнать `npm run smoke:telegram` — убедиться, что smoke-тесты не сломались.

**Acceptance criteria:**
- В production без `TELEGRAM_WEBHOOK_SECRET` запрос возвращает `503`.
- В production с секретом, но без правильного header — `401`.
- Audit-лог записывает попытки с неверным секретом.

**Estimate:** 2 часа.

---

## P0-3. Retry-логика на коллизию `publicCode` ✅ СДЕЛАНО (2026-05-04)

**Цель:** избежать `P2002` Prisma unique violation при гонке двух `createGame` в одну миллисекунду.

**Затронутые файлы:**
- `src/server/services/game-service.ts`
- `package.json` (добавить `nanoid`)

**Шаги:**

- [x] **0-3.1.** Установить `nanoid`:
  ```bash
  npm install nanoid
  ```
- [x] **0-3.2.** Заменить функцию `createPublicCode`:
  ```typescript
  import { customAlphabet } from "nanoid";

  // Без похожих символов: убрали 0, O, 1, I, L
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  const generateCode = customAlphabet(alphabet, 8);

  function createPublicCode(): string {
    return `G${generateCode()}`;
  }
  ```
- [x] **0-3.3.** Обернуть `tx.game.create` в retry на `P2002`:
  ```typescript
  async function createGameWithRetry(
    tx: Prisma.TransactionClient,
    data: Prisma.GameCreateInput,
    maxAttempts = 3,
  ) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await tx.game.create({
          data: { ...data, publicCode: createPublicCode() },
        });
      } catch (err) {
        if (isUniqueError(err) && attempt < maxAttempts) continue;
        throw err;
      }
    }
    throw new Error("Failed to generate unique publicCode after retries");
  }
  ```
- [x] **0-3.4.** Использовать в `createGame`.
- [x] **0-3.5.** Добавить smoke-тест «1000 параллельных createGame не падают» (см. P1-2).

**Acceptance criteria:**
- 1000 одновременных вызовов `createGame` создают 1000 уникальных `publicCode` без падений.
- Алфавит `publicCode` не содержит легко путаемых символов (полезно для UX в Telegram).

**Estimate:** 1.5 часа.

---

## P0-4. Логирование compensation failures

**Цель:** убрать молчаливые `catch(() => undefined)` — когда компенсация падает, мы должны об этом узнать.

**Затронутые файлы:**
- `src/server/services/game-service.ts:202, 207, 336, 341`
- `src/server/utils/audit.ts` (создать)

**Шаги:**

- [ ] **0-4.1.** Создать helper `src/server/utils/audit.ts`:
  ```typescript
  import prisma from "../db/prisma";

  export async function logCompensationFailure(params: {
    operation: string;
    resourceType: string;
    resourceId: string;
    error: unknown;
    metadata?: Record<string, unknown>;
  }) {
    const errorMsg = params.error instanceof Error ? params.error.message : String(params.error);
    try {
      await prisma.auditLog.create({
        data: {
          actorType: "system",
          actorId: "system",
          action: "compensation_failed",
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          metadata: {
            operation: params.operation,
            error: errorMsg,
            ...(params.metadata ?? {}),
          },
        },
      });
    } catch (auditErr) {
      // Last resort — пишем в stderr
      console.error("[CRITICAL] compensation_failed audit log failed:", auditErr, errorMsg);
    }
  }
  ```
- [ ] **0-4.2.** Заменить все 4 случая `catch(() => undefined)` в `game-service.ts`:
  ```typescript
  // Было:
  await prisma.game.update({...}).catch(() => undefined);

  // Стало:
  await prisma.game.update({...}).catch(async (err) => {
    await logCompensationFailure({
      operation: "create_game_mark_failed",
      resourceType: "game",
      resourceId: String(createdGameId),
      error: err,
    });
  });
  ```
- [ ] **0-4.3.** То же для `prisma.idempotencyKey.delete`:
  ```typescript
  await prisma.idempotencyKey.delete({...}).catch(async (err) => {
    await logCompensationFailure({
      operation: "create_game_cleanup_idempotency",
      resourceType: "idempotency_key",
      resourceId: params.idempotencyKey,
      error: err,
    });
  });
  ```
- [ ] **0-4.4.** Добавить в admin-страницу `/admin/audit` фильтр по `action = "compensation_failed"`.

**Acceptance criteria:**
- В коде нет `catch(() => undefined)` (`grep -rn "catch.*undefined"` пуст).
- При искусственном падении компенсации в `AuditLog` появляется запись с `action: "compensation_failed"`.

**Estimate:** 2-3 часа.

---

## P0-5. Удалить мёртвый `version` select или внедрить optimistic locking

**Цель:** в `wallet-service.ts:189` selectится поле `version`, которое не используется. Это либо забытая фича, либо рудимент.

**Затронутые файлы:**
- `src/server/services/wallet-service.ts`
- `prisma/schema.prisma` (если решим использовать version)

**Шаги:**

- [ ] **0-5.1.** Принять решение: **внедрить optimistic locking** (правильно для финансов) или **удалить поле** (упростит код).
- [ ] **0-5.2.** **Если внедряем optimistic locking** (рекомендую):
  ```typescript
  // В каждой mutation:
  const updatedWallet = await tx.wallet.update({
    where: {
      id: wallet.id,
      version: currentWallet.version,  // оптимистичная блокировка
    },
    data: {
      availableBalance: { decrement: amount },
      lockedBalance: { increment: amount },
      version: { increment: 1 },
    },
  }).catch((err) => {
    if (isUniqueError(err) || err.code === "P2025") {
      throw new Error("Wallet was modified concurrently, please retry");
    }
    throw err;
  });
  ```
- [ ] **0-5.3.** **Если удаляем version**:
  - Убрать `version Int @default(1)` из `prisma/schema.prisma`.
  - `npx prisma migrate dev --name remove-wallet-version`.
  - Убрать `version: true` из всех `select`-ов.

**Acceptance criteria:**
- Если выбрали locking — concurrent test (две одновременные `lockEscrow` на один кошелёк) показывает: одна успешна, другая бросает `Wallet was modified concurrently`.
- Если выбрали удаление — `version` нет в схеме, миграция применена.

**Estimate:** 2 часа (locking) или 30 минут (удаление).

---

# ⚡ Спринт 1 — Целостность и тесты (5-7 дней)

## P1-1. Атомарность `createGame` + `lockEscrow`

**Цель:** объединить создание игры и блокировку эскроу в **одну** транзакцию. Сейчас между ними окно неконсистентности.

**Затронутые файлы:**
- `src/server/services/game-service.ts` (`createGame`, `joinGame`)
- `src/server/services/wallet-service.ts` (новый внутренний метод `lockEscrowInTx`)

**Шаги:**

- [ ] **1-1.1.** Добавить в `wallet-service.ts` версию методов, принимающую `tx`:
  ```typescript
  async lockEscrowInTx(
    tx: Prisma.TransactionClient,
    params: WalletParamsWithGame,
  ): Promise<WalletResult> {
    // Та же логика что lockEscrow, но без открытия своей транзакции.
    // Идемпотентность через ledgerEntry.findUnique с idempotencyKey.
    // ...
  }
  ```
- [ ] **1-1.2.** Аналогично для `releaseEscrowInTx`, `payoutInTx`, `refundInTx`.
- [ ] **1-1.3.** Отрефакторить публичные методы как тонкие обёртки:
  ```typescript
  async lockEscrow(params: WalletParamsWithGame): Promise<WalletResult> {
    return prisma.$transaction((tx) => this.lockEscrowInTx(tx, params));
  }
  ```
- [ ] **1-1.4.** Переписать `createGame`:
  ```typescript
  const result = await prisma.$transaction(async (tx) => {
    // 1. Создать idempotencyKey (или вернуть существующий)
    // 2. Создать game со статусом waiting
    // 3. Создать gamePlayer
    // 4. Залочить эскроу через lockEscrowInTx
    // 5. Записать audit
    // 6. Обновить idempotencyKey.resourceId
    // 7. Вернуть результат
  }, { timeout: 10_000, isolationLevel: "Serializable" });  // для Postgres
  ```
- [ ] **1-1.5.** Аналогично для `joinGame` — `findFirst` → проверка баланса в той же tx → `updateMany` (claim) → `gamePlayer.create` → `lockEscrowInTx` → `auditLog.create` — всё одной транзакцией.
- [ ] **1-1.6.** Удалить весь блок compensation в `catch` — он больше не нужен, транзакция откатится сама.
- [ ] **1-1.7.** Прогнать `npm run smoke:services`.

**Acceptance criteria:**
- `createGame` и `joinGame` не содержат внешних `await` между `$transaction` и финальным return.
- При искусственном падении `lockEscrow` в БД нет ни `Game`, ни `GamePlayer`, ни `AuditLog` записи.
- Smoke-тесты проходят.

**Estimate:** 1 день.

> ⚠️ **Caveat для SQLite:** `prisma.$transaction` в SQLite сериализует writers глобально. Это норма для MVP, но при миграции на Postgres проверить, что `isolationLevel: Serializable` адекватен под нагрузку — возможно, `RepeatableRead` будет достаточно.

---

## P1-2. Vitest + первые 10 финансовых инвариант-тестов

**Цель:** автоматизированные тесты, которые поймают регрессии в финансовой логике.

**Затронутые файлы:**
- `vitest.config.ts` (создать)
- `package.json` (добавить scripts и deps)
- `tests/` (создать директорию)
- `tests/setup.ts`, `tests/utils/db.ts`, `tests/services/*.test.ts`

**Шаги:**

- [ ] **1-2.1.** Установить:
  ```bash
  npm install -D vitest @vitest/ui @vitest/coverage-v8
  ```
- [ ] **1-2.2.** Создать `vitest.config.ts`:
  ```typescript
  import { defineConfig } from "vitest/config";
  import path from "path";

  export default defineConfig({
    test: {
      environment: "node",
      setupFiles: ["./tests/setup.ts"],
      pool: "forks",  // изоляция БД между тестами
      poolOptions: { forks: { singleFork: true } },
      testTimeout: 30_000,
    },
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
  });
  ```
- [ ] **1-2.3.** Добавить scripts в `package.json`:
  ```json
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
  ```
- [ ] **1-2.4.** Создать `tests/setup.ts` — сброс БД перед каждым тестом через `prisma migrate reset`.
- [ ] **1-2.5.** Написать **10 тестов** в `tests/services/wallet-service.test.ts` и `tests/services/game-service.test.ts`:
  1. `lockEscrow` уменьшает available и увеличивает locked на ту же сумму.
  2. `lockEscrow` бросает при `availableBalance < amount`.
  3. `lockEscrow` идемпотентна — повтор с тем же ключом не меняет баланс.
  4. `releaseEscrow` ↔ `lockEscrow` — баланс возвращается к исходному.
  5. `payout` правильно начисляет на available.
  6. **Инвариант:** `available + locked == sum(ledger по direction)` для произвольной последовательности операций.
  7. `createGame` создаёт ровно одну запись в каждой из таблиц `Game`, `GamePlayer`, `LedgerEntry` (escrow_lock), `AuditLog` (create_game).
  8. `joinGame` запрещает второму opponent войти в уже matched игру.
  9. `joinGame` запрещает creator-у войти в свою же игру.
  10. `settleGame` идемпотентна — повтор не меняет балансы.
- [ ] **1-2.6.** Прогнать `npm test` — все 10 зелёные.
- [ ] **1-2.7.** Добавить тесты в `npm run` цепочку pre-push hook (см. P2-4 CI).

**Acceptance criteria:**
- `npm test` проходит за < 30 секунд.
- Coverage по `src/server/services/` > 60%.
- При искусственной мутации (например, убрать `decrement` в `lockEscrow`) хотя бы 3 теста падают.

**Estimate:** 1.5-2 дня.

---

## P1-3. Рефакторинг `WalletService` — общий helper

**Цель:** убрать 6-кратное дублирование кода в методах кошелька.

**Затронутые файлы:**
- `src/server/services/wallet-service.ts`

**Шаги:**

- [ ] **1-3.1.** Спроектировать общий helper:
  ```typescript
  type WalletMutation = {
    userId: number;
    amount: bigint;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
    gameId?: number;
    entryType: LedgerEntryType;
    direction: LedgerDirection;
    auditAction: string;
    balanceMutation: (current: Wallet) => {
      data: Prisma.WalletUpdateInput;
      preCheck?: () => void;  // throw если не пройдёт
    };
  };

  private async executeWalletMutation(m: WalletMutation): Promise<WalletResult> {
    // 1. Идемпотентность через ledger.findUnique
    // 2. $transaction:
    //    - find current wallet
    //    - вызвать m.balanceMutation(current).preCheck()
    //    - обновить через .data
    //    - создать ledger entry
    //    - создать audit log
    // 3. Вернуть WalletResult
  }
  ```
- [ ] **1-3.2.** Переписать каждый из 6 методов как тонкую обёртку:
  ```typescript
  async lockEscrow(params: WalletParamsWithGame): Promise<WalletResult> {
    return this.executeWalletMutation({
      ...params,
      entryType: "escrow_lock",
      direction: "debit",
      auditAction: "lock_escrow",
      balanceMutation: (current) => ({
        preCheck: () => {
          if (current.availableBalance < params.amount) {
            throw new Error("Insufficient available balance for escrow lock");
          }
        },
        data: {
          availableBalance: { decrement: params.amount },
          lockedBalance: { increment: params.amount },
        },
      }),
    });
  }
  ```
- [ ] **1-3.3.** Прогнать `npm test` — все тесты из P1-2 должны остаться зелёными.
- [ ] **1-3.4.** Удалить все `// eslint-disable-next-line @typescript-eslint/no-explicit-any` — типизировать metadata через `Prisma.JsonObject`.

**Acceptance criteria:**
- `wallet-service.ts` < 250 строк (сейчас 627).
- Каждый публичный метод < 30 строк.
- Тесты P1-2 зелёные.
- Нет `any`-cast.

**Estimate:** 4-6 часов.

---

## P1-4. Утилиты в `src/server/utils/`

**Цель:** убрать дублирование `toBigInt`, magic numbers, ID-генераторов.

**Затронутые файлы:**
- `src/server/utils/bigint.ts` (создать)
- `src/server/utils/transaction-id.ts` (создать)
- `src/server/config.ts` (создать)
- `src/server/services/*.ts` (использовать утилиты)

**Шаги:**

- [ ] **1-4.1.** Создать `src/server/utils/bigint.ts`:
  ```typescript
  export function toBigInt(value: bigint | string | number): bigint {
    if (typeof value === "bigint") return value;
    if (typeof value === "number") {
      if (!Number.isInteger(value)) throw new Error(`Non-integer number: ${value}`);
      return BigInt(value);
    }
    const trimmed = value.trim();
    if (trimmed === "" || !/^-?\d+$/.test(trimmed)) {
      throw new Error(`Invalid bigint string: "${value}"`);
    }
    return BigInt(trimmed);
  }
  ```
  (Заметь — более строгая валидация, чем сейчас: только integer-строки.)
- [ ] **1-4.2.** Создать `src/server/utils/transaction-id.ts`:
  ```typescript
  import { customAlphabet } from "nanoid";
  const id = customAlphabet("0123456789abcdef", 12);
  export function newTransactionId(): string {
    return `tx_${Date.now()}_${id()}`;
  }
  ```
- [ ] **1-4.3.** Создать `src/server/config.ts`:
  ```typescript
  export const config = {
    game: {
      defaultTimeoutMinutes: 10,
      maxBetAmount: 1_000_000n,
      minBetAmount: 1n,
    },
    pagination: {
      defaultTake: 50,
      maxTake: 200,
    },
    publicCode: {
      length: 8,
      alphabet: "23456789ABCDEFGHJKMNPQRSTUVWXYZ",
    },
  } as const;
  ```
- [ ] **1-4.4.** Заменить во всех 3 сервисах вызовы на утилиты, удалить дубли.
- [ ] **1-4.5.** Прогнать `npm test` + `npm run lint` + `npm run type-check`.

**Acceptance criteria:**
- `grep -n "function toBigInt" src/` — только в `utils/bigint.ts`.
- `grep -n "tx_\${Date.now" src/` — пусто.
- Magic numbers (10, 50, 1000000) в коде сервисов отсутствуют.

**Estimate:** 3 часа.

---

## P1-5. Заполнить документы контекста

**Цель:** превратить пустые шаблоны в реальную карту состояния проекта.

**Затронутые файлы:**
- `context/known_issues.md`
- `context/priorities.md`
- `context/constraints.md`
- `context/current_state.md`

**Шаги:**

- [ ] **1-5.1.** Заполнить `known_issues.md` — перенести все «🔴 Критично» и «🟠 Серьёзно» из аудита.
- [ ] **1-5.2.** Заполнить `priorities.md` — этот action plan в виде верхнего уровня + freeze zone (Prisma schema до миграции на Postgres, ledger contracts).
- [ ] **1-5.3.** Заполнить `constraints.md` — SQLite-only до P2-1, no real money flow до тестов, only demo users в `/play`.
- [ ] **1-5.4.** Обновить `current_state.md` — после каждого выполненного P0/P1.

**Acceptance criteria:**
- Все 4 файла содержат осмысленный контент, нет шаблонных `[ ]`.

**Estimate:** 1-2 часа.

---

# 🛠 Спринт 2 — Production Readiness (2-4 недели)

## P2-1. Миграция SQLite → Postgres

**Цель:** уйти от single-writer SQLite. Без этого реальная нагрузка невозможна.

**Затронутые файлы:**
- `prisma/schema.prisma` (`datasource`)
- `src/server/db/prisma.ts` (адаптер)
- `package.json` (убрать `@prisma/adapter-better-sqlite3`, добавить `pg`)
- `.env.example`
- `docker-compose.yml` (создать для local dev)

**Шаги:**

- [ ] **2-1.1.** Выбрать провайдера: **Supabase** (если нужен auth + storage) или **Neon** (если нужен только Postgres + serverless). Для MVP с Telegram-аутентификацией — **Neon** проще.
- [ ] **2-1.2.** Создать аккаунт, получить `DATABASE_URL`.
- [ ] **2-1.3.** Поменять `provider` в `prisma/schema.prisma`:
  ```prisma
  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }
  ```
- [ ] **2-1.4.** Удалить адаптер из `prisma.ts`:
  ```typescript
  export const prisma = globalForPrisma.prisma ?? new PrismaClient();
  ```
- [ ] **2-1.5.** Создать `docker-compose.yml` для local dev:
  ```yaml
  services:
    postgres:
      image: postgres:16-alpine
      environment:
        POSTGRES_PASSWORD: dev
        POSTGRES_DB: cube_dev
      ports: ["5432:5432"]
      volumes: ["pgdata:/var/lib/postgresql/data"]
  volumes:
    pgdata:
  ```
- [ ] **2-1.6.** Удалить старые SQLite-миграции, сгенерировать Postgres-миграции:
  ```bash
  rm -rf prisma/migrations
  npx prisma migrate dev --name init
  ```
- [ ] **2-1.7.** Прогнать seed: `npm run prisma:seed`.
- [ ] **2-1.8.** Прогнать smoke + tests.
- [ ] **2-1.9.** Обновить README с инструкциями локального запуска через docker-compose.
- [ ] **2-1.10.** Проверить, что BigInt сериализуется корректно (в Postgres это `bigint`, в JS `bigint`).

**Acceptance criteria:**
- `docker compose up -d` поднимает Postgres локально.
- `npm test` работает на Postgres.
- Smoke-тесты проходят на Postgres.
- На staging развёрнут Neon/Supabase, миграции применены.

**Estimate:** 1-2 дня.

---

## P2-2. Property-based тесты concurrency

**Цель:** доказать корректность под параллельной нагрузкой.

**Затронутые файлы:**
- `tests/concurrency/*.test.ts` (создать)
- `package.json` (добавить `fast-check`)

**Шаги:**

- [ ] **2-2.1.** `npm install -D fast-check`
- [ ] **2-2.2.** Написать тест: «100 параллельных `joinGame` к одной игре → ровно один winner».
  ```typescript
  test("only one opponent can join a waiting game", async () => {
    const game = await gameService.createGame({...});
    const results = await Promise.allSettled(
      Array.from({ length: 100 }, (_, i) =>
        gameService.joinGame({ publicCode: game.publicCode, opponentUserId: opponents[i].id, idempotencyKey: `t-${i}` })
      )
    );
    const successes = results.filter(r => r.status === "fulfilled");
    expect(successes).toHaveLength(1);
  });
  ```
- [ ] **2-2.3.** Property test: после произвольной последовательности `lockEscrow` / `releaseEscrow` / `payout` / `refund` инвариант `available + locked == sum(ledger)` всегда выполняется.
- [ ] **2-2.4.** Тест: 50 параллельных `recordRoll` от одного юзера → не больше одного roll в текущем round-е.

**Acceptance criteria:**
- 5+ concurrency-тестов в `tests/concurrency/`.
- Все стабильно зелёные на 10 запусках.

**Estimate:** 1 день.

---

## P2-3. Reconciliation job + alert

**Цель:** периодически проверять расхождение между `Wallet`-снапшотом и агрегатом `LedgerEntry`. Если расхождение — алерт.

**Затронутые файлы:**
- `src/server/jobs/reconciliation.ts` (создать)
- `src/app/api/cron/reconciliation/route.ts` (создать, для Vercel Cron / Neon)

**Шаги:**

- [ ] **2-3.1.** Реализовать функцию:
  ```typescript
  export async function reconcileWallets(): Promise<ReconciliationReport> {
    const wallets = await prisma.wallet.findMany();
    const mismatches = [];
    for (const w of wallets) {
      const aggregates = await prisma.ledgerEntry.groupBy({
        by: ["direction"],
        where: { walletId: w.id },
        _sum: { amount: true },
      });
      const credits = aggregates.find(a => a.direction === "credit")?._sum.amount ?? 0n;
      const debits = aggregates.find(a => a.direction === "debit")?._sum.amount ?? 0n;
      const expected = credits - debits;
      const actual = w.availableBalance + w.lockedBalance;
      if (expected !== actual) {
        mismatches.push({ walletId: w.id, expected, actual, diff: actual - expected });
      }
    }
    return { mismatches, checkedAt: new Date() };
  }
  ```
- [ ] **2-3.2.** Создать cron-endpoint `/api/cron/reconciliation` с защитой через secret header.
- [ ] **2-3.3.** При наличии расхождений — отправить уведомление в Telegram-канал админа (через Bot API).
- [ ] **2-3.4.** Запланировать в Vercel `vercel.json`:
  ```json
  { "crons": [{ "path": "/api/cron/reconciliation", "schedule": "0 * * * *" }] }
  ```
- [ ] **2-3.5.** Записывать каждый запуск в `AuditLog` (`action: "reconciliation_run"`).

**Acceptance criteria:**
- Запуск через `curl -H "x-cron-secret: ..." /api/cron/reconciliation` возвращает JSON-отчёт.
- При искусственном расхождении (вручную поменять `availableBalance`) приходит алерт.

**Estimate:** 1 день.

---

## P2-4. CI на GitHub Actions

**Цель:** не пускать в main код, который ломает lint, types или тесты.

**Затронутые файлы:**
- `.github/workflows/ci.yml` (создать)
- `.github/workflows/security.yml` (создать)

**Шаги:**

- [ ] **2-4.1.** Создать `.github/workflows/ci.yml`:
  ```yaml
  name: CI
  on:
    pull_request:
    push: { branches: [main] }
  jobs:
    test:
      runs-on: ubuntu-latest
      services:
        postgres:
          image: postgres:16
          env: { POSTGRES_PASSWORD: test, POSTGRES_DB: test }
          ports: ["5432:5432"]
          options: --health-cmd pg_isready
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: 20, cache: npm }
        - run: npm ci
        - run: npx prisma migrate deploy
          env: { DATABASE_URL: postgresql://postgres:test@localhost:5432/test }
        - run: npm run lint
        - run: npm run type-check
        - run: npm test
        - run: npm run smoke:services
        - run: npm run smoke:telegram
  ```
- [ ] **2-4.2.** Создать `.github/workflows/security.yml`:
  ```yaml
  name: Security
  on:
    schedule: [{ cron: "0 6 * * 1" }]  # weekly Mon 06:00 UTC
    pull_request:
  jobs:
    audit:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: 20 }
        - run: npm audit --audit-level=high
  ```
- [ ] **2-4.3.** Включить branch protection в GitHub Settings: require CI green перед merge.

**Acceptance criteria:**
- На каждый PR появляются 2 status check (CI, Security).
- Сломанный тест блокирует merge.

**Estimate:** 4 часа.

---

## P2-5. Sentry + structured logging

**Цель:** видеть ошибки в проде, иметь корреляционные ID для дебага.

**Затронутые файлы:**
- `src/server/utils/logger.ts` (создать)
- `instrumentation.ts` (создать в корне для Sentry)
- `package.json` (`@sentry/nextjs`, `pino`)

**Шаги:**

- [ ] **2-5.1.** `npm install @sentry/nextjs pino pino-pretty`
- [ ] **2-5.2.** `npx @sentry/wizard@latest -i nextjs` — автоматическая настройка.
- [ ] **2-5.3.** Создать `src/server/utils/logger.ts` с pino:
  ```typescript
  import pino from "pino";
  export const logger = pino({
    level: process.env.LOG_LEVEL ?? "info",
    transport: process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty" }
      : undefined,
  });
  ```
- [ ] **2-5.4.** Заменить все `console.log` / `console.error` на `logger.info` / `logger.error` со структурированными полями.
- [ ] **2-5.5.** Добавить `requestId` в Server Actions через `headers()` и логировать его в каждой записи.

**Acceptance criteria:**
- Бросок исключения в Server Action попадает в Sentry с трейсом.
- Логи в проде в JSON-формате, в dev — pretty.

**Estimate:** 1 день.

---

## P2-6. Telegram authentication

**Цель:** реальный игрок аутентифицируется через Telegram, не через `assertDemoUser`.

**Затронутые файлы:**
- `src/server/auth/telegram.ts` (создать)
- `src/app/api/auth/telegram/route.ts` (создать)
- `src/server/services/user-service.ts` (создать или расширить)

**Шаги:**

- [ ] **2-6.1.** Решить: **Telegram Mini App initData** (если делается WebApp внутри Telegram) или **Login Widget** (если внешний веб-сайт).
- [ ] **2-6.2.** Для Mini App — реализовать валидацию `initData`:
  ```typescript
  import crypto from "crypto";

  export function verifyTelegramInitData(initData: string, botToken: string): TelegramUser | null {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    params.delete("hash");
    const dataCheckString = [...params.entries()]
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
    const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
    const computed = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
    if (computed !== hash) return null;
    return JSON.parse(params.get("user") ?? "null");
  }
  ```
- [ ] **2-6.3.** Создать сервис `userService.findOrCreateFromTelegram({ telegramUserId, username, displayName })`.
- [ ] **2-6.4.** Заменить `assertDemoUser` в production-actions на `getCurrentTelegramUser` (через cookie/JWT с initData).
- [ ] **2-6.5.** Добавить middleware для защиты `/play` от несанкционированного доступа.
- [ ] **2-6.6.** Добавить тесты на валидацию initData (включая попытку подделки).

**Acceptance criteria:**
- Корректный initData → сессия создаётся.
- Поддельный hash → 401.
- Истёкший initData (`auth_date` > 24h назад) → 401.

**Estimate:** 2 дня.

---

## P2-7. Rate limiting

**Цель:** защита от флуда на webhook и Server Actions.

**Затронутые файлы:**
- `src/server/utils/rate-limit.ts` (создать)
- `src/middleware.ts` (расширить)
- `src/app/play/actions.ts` (применить)

**Шаги:**

- [ ] **2-7.1.** Решить: in-memory (для одного инстанса) или Upstash Redis (для распределённого).
- [ ] **2-7.2.** Для production рекомендую `@upstash/ratelimit`:
  ```bash
  npm install @upstash/ratelimit @upstash/redis
  ```
- [ ] **2-7.3.** Создать `src/server/utils/rate-limit.ts`:
  ```typescript
  import { Ratelimit } from "@upstash/ratelimit";
  import { Redis } from "@upstash/redis";

  const redis = Redis.fromEnv();

  export const webhookLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "10 s"),  // 30 req / 10 sec / IP
  });

  export const actionLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "60 s"),  // 10 actions / min / userId
  });
  ```
- [ ] **2-7.4.** Применить в webhook-route:
  ```typescript
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = await webhookLimiter.limit(ip);
  if (!success) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  ```
- [ ] **2-7.5.** Применить в каждой Server Action — лимит на `userId`.
- [ ] **2-7.6.** Добавить тест: 50 быстрых вызовов → последние получают 429.

**Acceptance criteria:**
- Нагрузочный тест (`ab -n 100 -c 50`) на webhook показывает 429 после порога.
- Server Action `createGameAction` с 11+ запросами в минуту от одного юзера блокируется.

**Estimate:** 4-6 часов.

---

# Сводная таблица estimate

| Фаза | Задач | Суммарно |
|---|---|---|
| 🔥 P0 | 5 | 1.5-2 дня |
| ⚡ P1 | 5 | 5-7 дней |
| 🛠 P2 | 7 | 8-12 дней |
| **ИТОГО** | **17** | **~3 недели** |

---

# Чек-лист «можем ли мы запустить с реальными деньгами?»

- [ ] P0 полностью закрыт.
- [ ] P1-1 (атомарность createGame) закрыт.
- [ ] P1-2 (тесты) закрыт, coverage сервисов > 70%.
- [ ] P2-1 (Postgres) закрыт.
- [ ] P2-2 (concurrency) закрыт.
- [ ] P2-3 (reconciliation) закрыт.
- [ ] P2-5 (Sentry) закрыт.
- [ ] Юридически проработан вопрос гемблинг-лицензии в РФ/ЕС.
- [ ] Проведён внешний security audit третьей стороной.
- [ ] Bug bounty объявлен (HackerOne / Immunefi).

**До закрытия всего этого чек-листа — запускать только на виртуальные `COIN`-токены без реальной денежной ценности.**

---

# Соглашения

- Каждая задача = 1 PR.
- Каждый PR проходит CI (после P2-4) и review.
- Каждый PR обновляет `11_CHANGELOG.md` и соответствующую запись в этом файле (`[ ]` → `[x]`).
- Изменения Prisma schema = миграция + бэкап БД на staging перед deploy.
- Никаких прямых правок `availableBalance` или `lockedBalance` без LedgerEntry — это инвариант проекта.
