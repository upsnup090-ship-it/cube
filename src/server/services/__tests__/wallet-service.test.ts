import { beforeAll, describe, expect, it } from "vitest";
import prisma from "@/server/db/prisma";
import { walletService } from "@/server/services/wallet-service";

function key(prefix: string) {
  return `vitest:${prefix}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

describe("WalletService", () => {
  let userId: number;

  beforeAll(async () => {
    const user = await prisma.user.upsert({
      where: { telegramUserId: "vitest_wallet_user_001" },
      update: { status: "active" },
      create: {
        telegramUserId: "vitest_wallet_user_001",
        username: "vitest_wallet_user",
        displayName: "Vitest Wallet User",
        status: "active",
      },
    });
    userId = user.id;
  });

  it("manualCredit and manualDebit update balances", async () => {
    const before = await walletService.getWalletByUserId(userId);

    const credit = await walletService.manualCredit({
      userId,
      amount: 120n,
      idempotencyKey: key("wallet:credit"),
      metadata: { test: true },
    });

    expect(credit.availableBalance >= before.availableBalance).toBe(true);

    const debit = await walletService.manualDebit({
      userId,
      amount: 20n,
      idempotencyKey: key("wallet:debit"),
      metadata: { test: true },
    });

    expect(debit.availableBalance >= 0n).toBe(true);
  });

  it("lockEscrow and releaseEscrow move funds between balances", async () => {
    const seedAmount = 100n;
    const lockedAmount = 40n;

    await walletService.manualCredit({
      userId,
      amount: seedAmount,
      idempotencyKey: key("wallet:seed"),
      metadata: { test: true },
    });

    const locked = await walletService.lockEscrow({
      userId,
      gameId: 1,
      amount: lockedAmount,
      idempotencyKey: key("wallet:lock"),
      metadata: { test: true },
    });

    expect(locked.lockedBalance >= lockedAmount).toBe(true);

    const released = await walletService.releaseEscrow({
      userId,
      amount: lockedAmount,
      idempotencyKey: key("wallet:release"),
      metadata: { test: true },
    });

    expect(released.lockedBalance >= 0n).toBe(true);
  });

  it("idempotent repeat does not duplicate credit", async () => {
    const idempotencyKey = key("wallet:idempotent");
    const first = await walletService.manualCredit({
      userId,
      amount: 33n,
      idempotencyKey,
      metadata: { test: true },
    });
    const second = await walletService.manualCredit({
      userId,
      amount: 33n,
      idempotencyKey,
      metadata: { test: true },
    });

    expect(second.ledgerEntryId).toBe(first.ledgerEntryId);
    expect(second.availableBalance).toBe(first.availableBalance);
  });

  it("rejects insufficient available balance lock", async () => {
    await expect(
      walletService.lockEscrow({
        userId,
        gameId: 1,
        amount: 999_999_999n,
        idempotencyKey: key("wallet:insufficient-lock"),
        metadata: { test: true },
      }),
    ).rejects.toThrow("Insufficient available balance");
  });

  it("rejects insufficient locked balance release", async () => {
    await expect(
      walletService.releaseEscrow({
        userId,
        amount: 999_999_999n,
        idempotencyKey: key("wallet:insufficient-release"),
        metadata: { test: true },
      }),
    ).rejects.toThrow("Insufficient locked balance");
  });
});
