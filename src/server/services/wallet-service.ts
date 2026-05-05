import prisma from "../db/prisma";
import type { Wallet } from "../../generated/prisma";

// ─── Types ───────────────────────────────────────────────────────────────────

export type WalletParams = {
  userId: number;
  idempotencyKey: string;
  amount: bigint | string;
  metadata?: Record<string, unknown>;
};

export type WalletParamsWithGame = WalletParams & {
  gameId: number;
};

export type WalletResult = {
  walletId: number;
  availableBalance: bigint;
  lockedBalance: bigint;
  ledgerEntryId: number;
  transactionId: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function validateAmount(amount: bigint): void {
  if (amount <= 0n) {
    throw new Error("Amount must be greater than zero");
  }
}

function toBigInt(value: bigint | string | number): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "" || isNaN(Number(trimmed))) {
      throw new Error(`Invalid bigint string: "${value}"`);
    }
    return BigInt(trimmed);
  }
  return BigInt(value);
}

async function getOrCreateWallet(userId: number): Promise<Wallet> {
  let wallet = await prisma.wallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        userId,
        currency: "COIN",
        availableBalance: BigInt(0),
        lockedBalance: BigInt(0),
      },
    });
  }

  return wallet;
}

// ─── WalletService ───────────────────────────────────────────────────────────

export class WalletService {
  /**
   * Get wallet by user id. Creates one if it does not exist.
   */
  async getWalletByUserId(userId: number): Promise<Wallet> {
    return getOrCreateWallet(userId);
  }

  /**
   * Manual credit — admin adds funds to user's available balance.
   */
  async manualCredit(params: WalletParams): Promise<WalletResult> {
    const amount = toBigInt(params.amount);
    validateAmount(amount);

    const wallet = await getOrCreateWallet(params.userId);

    // Check idempotency
    const existing = await prisma.ledgerEntry.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });

    if (existing) {
      const currentWallet = await prisma.wallet.findUnique({
        where: { id: existing.walletId },
      });
      return {
        walletId: existing.walletId,
        availableBalance: currentWallet!.availableBalance,
        lockedBalance: currentWallet!.lockedBalance,
        ledgerEntryId: existing.id,
        transactionId: existing.transactionId,
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update wallet
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: {
            increment: amount,
          },
        },
      });

      // Create ledger entry
      const entry = await tx.ledgerEntry.create({
        data: {
          transactionId: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId: params.userId,
          walletId: wallet.id,
          entryType: "admin_credit",
          direction: "credit",
          amount,
          currency: "COIN",
          idempotencyKey: params.idempotencyKey,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadata: (params.metadata ?? {}) as any,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          actorType: "system",
          actorId: "system",
          action: "manual_credit",
          resourceType: "wallet",
          resourceId: String(wallet.id),
          metadata: {
            userId: params.userId,
            amount: amount.toString(),
            idempotencyKey: params.idempotencyKey,
            ...(params.metadata ?? {}),
          },
        },
      });

      return {
        walletId: updatedWallet.id,
        availableBalance: updatedWallet.availableBalance,
        lockedBalance: updatedWallet.lockedBalance,
        ledgerEntryId: entry.id,
        transactionId: entry.transactionId,
      };
    });

    return result;
  }

  /**
   * Manual debit — admin removes funds from user's available balance.
   */
  async manualDebit(params: WalletParams): Promise<WalletResult> {
    const amount = toBigInt(params.amount);
    validateAmount(amount);

    const wallet = await getOrCreateWallet(params.userId);

    // Check idempotency
    const existing = await prisma.ledgerEntry.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });

    if (existing) {
      const currentWallet = await prisma.wallet.findUnique({
        where: { id: existing.walletId },
      });
      return {
        walletId: existing.walletId,
        availableBalance: currentWallet!.availableBalance,
        lockedBalance: currentWallet!.lockedBalance,
        ledgerEntryId: existing.id,
        transactionId: existing.transactionId,
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Check sufficient available balance
      const currentWallet = await tx.wallet.findUnique({
        where: { id: wallet.id },
        select: { availableBalance: true, version: true },
      });

      if (!currentWallet || currentWallet.availableBalance < amount) {
        throw new Error("Insufficient available balance for debit");
      }

      // Update wallet
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: {
            decrement: amount,
          },
        },
      });

      // Create ledger entry
      const entry = await tx.ledgerEntry.create({
        data: {
          transactionId: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId: params.userId,
          walletId: wallet.id,
          entryType: "admin_debit",
          direction: "debit",
          amount,
          currency: "COIN",
          idempotencyKey: params.idempotencyKey,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadata: (params.metadata ?? {}) as any,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          actorType: "system",
          actorId: "system",
          action: "manual_debit",
          resourceType: "wallet",
          resourceId: String(wallet.id),
          metadata: {
            userId: params.userId,
            amount: amount.toString(),
            idempotencyKey: params.idempotencyKey,
            ...(params.metadata ?? {}),
          },
        },
      });

      return {
        walletId: updatedWallet.id,
        availableBalance: updatedWallet.availableBalance,
        lockedBalance: updatedWallet.lockedBalance,
        ledgerEntryId: entry.id,
        transactionId: entry.transactionId,
      };
    });

    return result;
  }

  /**
   * Lock escrow — move funds from available to locked balance.
   */
  async lockEscrow(params: WalletParamsWithGame): Promise<WalletResult> {
    const amount = toBigInt(params.amount);
    validateAmount(amount);

    const wallet = await getOrCreateWallet(params.userId);

    // Check idempotency
    const existing = await prisma.ledgerEntry.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });

    if (existing) {
      const currentWallet = await prisma.wallet.findUnique({
        where: { id: existing.walletId },
      });
      return {
        walletId: existing.walletId,
        availableBalance: currentWallet!.availableBalance,
        lockedBalance: currentWallet!.lockedBalance,
        ledgerEntryId: existing.id,
        transactionId: existing.transactionId,
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Check sufficient available balance
      const currentWallet = await tx.wallet.findUnique({
        where: { id: wallet.id },
        select: { availableBalance: true },
      });

      if (!currentWallet || currentWallet.availableBalance < amount) {
        throw new Error("Insufficient available balance for escrow lock");
      }

      // Update wallet — decrement available, increment locked
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: {
            decrement: amount,
          },
          lockedBalance: {
            increment: amount,
          },
        },
      });

      // Create ledger entry
      const entry = await tx.ledgerEntry.create({
        data: {
          transactionId: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId: params.userId,
          walletId: wallet.id,
          gameId: params.gameId,
          entryType: "escrow_lock",
          direction: "debit",
          amount,
          currency: "COIN",
          idempotencyKey: params.idempotencyKey,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadata: (params.metadata ?? {}) as any,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          actorType: "system",
          actorId: "system",
          action: "lock_escrow",
          resourceType: "wallet",
          resourceId: String(wallet.id),
          metadata: {
            userId: params.userId,
            gameId: params.gameId,
            amount: amount.toString(),
            idempotencyKey: params.idempotencyKey,
            ...(params.metadata ?? {}),
          },
        },
      });

      return {
        walletId: updatedWallet.id,
        availableBalance: updatedWallet.availableBalance,
        lockedBalance: updatedWallet.lockedBalance,
        ledgerEntryId: entry.id,
        transactionId: entry.transactionId,
      };
    });

    return result;
  }

  /**
   * Release escrow — move funds from locked to available balance.
   */
  async releaseEscrow(params: WalletParams): Promise<WalletResult> {
    const amount = toBigInt(params.amount);
    validateAmount(amount);

    const wallet = await getOrCreateWallet(params.userId);

    // Check idempotency
    const existing = await prisma.ledgerEntry.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });

    if (existing) {
      const currentWallet = await prisma.wallet.findUnique({
        where: { id: existing.walletId },
      });
      return {
        walletId: existing.walletId,
        availableBalance: currentWallet!.availableBalance,
        lockedBalance: currentWallet!.lockedBalance,
        ledgerEntryId: existing.id,
        transactionId: existing.transactionId,
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Check sufficient locked balance
      const currentWallet = await tx.wallet.findUnique({
        where: { id: wallet.id },
        select: { lockedBalance: true },
      });

      if (!currentWallet || currentWallet.lockedBalance < amount) {
        throw new Error("Insufficient locked balance for escrow release");
      }

      // Update wallet — decrement locked, increment available
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          lockedBalance: {
            decrement: amount,
          },
          availableBalance: {
            increment: amount,
          },
        },
      });

      // Create ledger entry
      const entry = await tx.ledgerEntry.create({
        data: {
          transactionId: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId: params.userId,
          walletId: wallet.id,
          entryType: "escrow_release",
          direction: "credit",
          amount,
          currency: "COIN",
          idempotencyKey: params.idempotencyKey,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadata: (params.metadata ?? {}) as any,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          actorType: "system",
          actorId: "system",
          action: "release_escrow",
          resourceType: "wallet",
          resourceId: String(wallet.id),
          metadata: {
            userId: params.userId,
            amount: amount.toString(),
            idempotencyKey: params.idempotencyKey,
            ...(params.metadata ?? {}),
          },
        },
      });

      return {
        walletId: updatedWallet.id,
        availableBalance: updatedWallet.availableBalance,
        lockedBalance: updatedWallet.lockedBalance,
        ledgerEntryId: entry.id,
        transactionId: entry.transactionId,
      };
    });

    return result;
  }

  async consumeLockedEscrow(params: WalletParamsWithGame): Promise<WalletResult> {
    const amount = toBigInt(params.amount);
    validateAmount(amount);

    const wallet = await getOrCreateWallet(params.userId);

    const existing = await prisma.ledgerEntry.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });

    if (existing) {
      const currentWallet = await prisma.wallet.findUnique({
        where: { id: existing.walletId },
      });
      return {
        walletId: existing.walletId,
        availableBalance: currentWallet!.availableBalance,
        lockedBalance: currentWallet!.lockedBalance,
        ledgerEntryId: existing.id,
        transactionId: existing.transactionId,
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      const currentWallet = await tx.wallet.findUnique({
        where: { id: wallet.id },
        select: { lockedBalance: true },
      });

      if (!currentWallet || currentWallet.lockedBalance < amount) {
        throw new Error("Insufficient locked balance for escrow consumption");
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          lockedBalance: {
            decrement: amount,
          },
        },
      });

      const entry = await tx.ledgerEntry.create({
        data: {
          transactionId: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId: params.userId,
          walletId: wallet.id,
          gameId: params.gameId,
          entryType: "adjustment",
          direction: "debit",
          amount,
          currency: "COIN",
          idempotencyKey: params.idempotencyKey,
          metadata: (params.metadata ?? {}) as any,
        },
      });

      await tx.auditLog.create({
        data: {
          actorType: "system",
          actorId: "system",
          action: "consume_locked_escrow",
          resourceType: "wallet",
          resourceId: String(wallet.id),
          metadata: {
            userId: params.userId,
            gameId: params.gameId,
            amount: amount.toString(),
            idempotencyKey: params.idempotencyKey,
            ...(params.metadata ?? {}),
          },
        },
      });

      return {
        walletId: updatedWallet.id,
        availableBalance: updatedWallet.availableBalance,
        lockedBalance: updatedWallet.lockedBalance,
        ledgerEntryId: entry.id,
        transactionId: entry.transactionId,
      };
    });

    return result;
  }

  async collectRakeFromLocked(params: WalletParamsWithGame): Promise<WalletResult> {
    const amount = toBigInt(params.amount);
    validateAmount(amount);

    const wallet = await getOrCreateWallet(params.userId);

    const existing = await prisma.ledgerEntry.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });

    if (existing) {
      const currentWallet = await prisma.wallet.findUnique({
        where: { id: existing.walletId },
      });
      return {
        walletId: existing.walletId,
        availableBalance: currentWallet!.availableBalance,
        lockedBalance: currentWallet!.lockedBalance,
        ledgerEntryId: existing.id,
        transactionId: existing.transactionId,
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      const currentWallet = await tx.wallet.findUnique({
        where: { id: wallet.id },
        select: { lockedBalance: true },
      });

      if (!currentWallet || currentWallet.lockedBalance < amount) {
        throw new Error("Insufficient locked balance for rake collection");
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          lockedBalance: {
            decrement: amount,
          },
        },
      });

      const entry = await tx.ledgerEntry.create({
        data: {
          transactionId: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId: params.userId,
          walletId: wallet.id,
          gameId: params.gameId,
          entryType: "rake_debit",
          direction: "debit",
          amount,
          currency: "COIN",
          idempotencyKey: params.idempotencyKey,
          metadata: (params.metadata ?? {}) as any,
        },
      });

      await tx.auditLog.create({
        data: {
          actorType: "system",
          actorId: "system",
          action: "collect_rake_from_locked",
          resourceType: "wallet",
          resourceId: String(wallet.id),
          metadata: {
            userId: params.userId,
            gameId: params.gameId,
            amount: amount.toString(),
            idempotencyKey: params.idempotencyKey,
            ...(params.metadata ?? {}),
          },
        },
      });

      return {
        walletId: updatedWallet.id,
        availableBalance: updatedWallet.availableBalance,
        lockedBalance: updatedWallet.lockedBalance,
        ledgerEntryId: entry.id,
        transactionId: entry.transactionId,
      };
    });

    return result;
  }

  async payout(params: WalletParamsWithGame): Promise<WalletResult> {
    const amount = toBigInt(params.amount);
    validateAmount(amount);

    const wallet = await getOrCreateWallet(params.userId);

    // Check idempotency
    const existing = await prisma.ledgerEntry.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });

    if (existing) {
      const currentWallet = await prisma.wallet.findUnique({
        where: { id: existing.walletId },
      });
      return {
        walletId: existing.walletId,
        availableBalance: currentWallet!.availableBalance,
        lockedBalance: currentWallet!.lockedBalance,
        ledgerEntryId: existing.id,
        transactionId: existing.transactionId,
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update wallet — increment available balance
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: {
            increment: amount,
          },
        },
      });

      // Create ledger entry
      const entry = await tx.ledgerEntry.create({
        data: {
          transactionId: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId: params.userId,
          walletId: wallet.id,
          gameId: params.gameId,
          entryType: "payout_credit",
          direction: "credit",
          amount,
          currency: "COIN",
          idempotencyKey: params.idempotencyKey,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadata: (params.metadata ?? {}) as any,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          actorType: "system",
          actorId: "system",
          action: "payout",
          resourceType: "wallet",
          resourceId: String(wallet.id),
          metadata: {
            userId: params.userId,
            gameId: params.gameId,
            amount: amount.toString(),
            idempotencyKey: params.idempotencyKey,
            ...(params.metadata ?? {}),
          },
        },
      });

      return {
        walletId: updatedWallet.id,
        availableBalance: updatedWallet.availableBalance,
        lockedBalance: updatedWallet.lockedBalance,
        ledgerEntryId: entry.id,
        transactionId: entry.transactionId,
      };
    });

    return result;
  }

  async creditCommission(params: WalletParamsWithGame): Promise<WalletResult> {
    const amount = toBigInt(params.amount);
    validateAmount(amount);

    const wallet = await getOrCreateWallet(params.userId);

    const existing = await prisma.ledgerEntry.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });

    if (existing) {
      const currentWallet = await prisma.wallet.findUnique({
        where: { id: existing.walletId },
      });
      return {
        walletId: existing.walletId,
        availableBalance: currentWallet!.availableBalance,
        lockedBalance: currentWallet!.lockedBalance,
        ledgerEntryId: existing.id,
        transactionId: existing.transactionId,
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: {
            increment: amount,
          },
        },
      });

      const entry = await tx.ledgerEntry.create({
        data: {
          transactionId: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId: params.userId,
          walletId: wallet.id,
          gameId: params.gameId,
          entryType: "adjustment",
          direction: "credit",
          amount,
          currency: "COIN",
          idempotencyKey: params.idempotencyKey,
          metadata: (params.metadata ?? {}) as any,
        },
      });

      await tx.auditLog.create({
        data: {
          actorType: "system",
          actorId: "system",
          action: "credit_commission",
          resourceType: "wallet",
          resourceId: String(wallet.id),
          metadata: {
            userId: params.userId,
            gameId: params.gameId,
            amount: amount.toString(),
            idempotencyKey: params.idempotencyKey,
            ...(params.metadata ?? {}),
          },
        },
      });

      return {
        walletId: updatedWallet.id,
        availableBalance: updatedWallet.availableBalance,
        lockedBalance: updatedWallet.lockedBalance,
        ledgerEntryId: entry.id,
        transactionId: entry.transactionId,
      };
    });

    return result;
  }

  async refund(params: WalletParamsWithGame): Promise<WalletResult> {
    const amount = toBigInt(params.amount);
    validateAmount(amount);

    const wallet = await getOrCreateWallet(params.userId);

    // Check idempotency
    const existing = await prisma.ledgerEntry.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });

    if (existing) {
      const currentWallet = await prisma.wallet.findUnique({
        where: { id: existing.walletId },
      });
      return {
        walletId: existing.walletId,
        availableBalance: currentWallet!.availableBalance,
        lockedBalance: currentWallet!.lockedBalance,
        ledgerEntryId: existing.id,
        transactionId: existing.transactionId,
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Check sufficient locked balance
      const currentWallet = await tx.wallet.findUnique({
        where: { id: wallet.id },
        select: { lockedBalance: true },
      });

      if (!currentWallet || currentWallet.lockedBalance < amount) {
        throw new Error("Insufficient locked balance for refund");
      }

      // Update wallet — decrement locked, increment available
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          lockedBalance: {
            decrement: amount,
          },
          availableBalance: {
            increment: amount,
          },
        },
      });

      // Create ledger entry
      const entry = await tx.ledgerEntry.create({
        data: {
          transactionId: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId: params.userId,
          walletId: wallet.id,
          gameId: params.gameId,
          entryType: "refund_credit",
          direction: "credit",
          amount,
          currency: "COIN",
          idempotencyKey: params.idempotencyKey,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadata: (params.metadata ?? {}) as any,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          actorType: "system",
          actorId: "system",
          action: "refund",
          resourceType: "wallet",
          resourceId: String(wallet.id),
          metadata: {
            userId: params.userId,
            gameId: params.gameId,
            amount: amount.toString(),
            idempotencyKey: params.idempotencyKey,
            ...(params.metadata ?? {}),
          },
        },
      });

      return {
        walletId: updatedWallet.id,
        availableBalance: updatedWallet.availableBalance,
        lockedBalance: updatedWallet.lockedBalance,
        ledgerEntryId: entry.id,
        transactionId: entry.transactionId,
      };
    });

    return result;
  }
}

export const walletService = new WalletService();