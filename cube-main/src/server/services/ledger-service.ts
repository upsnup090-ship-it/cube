import prisma from "../db/prisma";
import type { LedgerEntryType, LedgerDirection, LedgerEntry } from "../../generated/prisma";

export type LedgerEntryCreateInput = {
  userId: number;
  walletId: number;
  gameId?: number;
  entryType: LedgerEntryType;
  direction: LedgerDirection;
  amount: bigint | string;
  currency?: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

export class LedgerService {
  /**
   * Create a single ledger entry.
   * Throws if idempotencyKey already exists.
   */
  async appendEntry(input: LedgerEntryCreateInput): Promise<LedgerEntry> {
    const amount = this.toBigInt(input.amount);

    if (amount <= 0n) {
      throw new Error("Ledger entry amount must be greater than zero");
    }

    const entry = await prisma.ledgerEntry.create({
      data: {
        transactionId: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId: input.userId,
        walletId: input.walletId,
        gameId: input.gameId ?? null,
        entryType: input.entryType,
        direction: input.direction,
        amount,
        currency: input.currency ?? "COIN",
        idempotencyKey: input.idempotencyKey,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: (input.metadata ?? {}) as any,
      },
    });

    return entry;
  }

  /**
   * Create a ledger entry, returning existing one if idempotencyKey is duplicate.
   */
  async appendEntrySafe(input: LedgerEntryCreateInput): Promise<LedgerEntry> {
    const amount = this.toBigInt(input.amount);

    if (amount <= 0n) {
      throw new Error("Ledger entry amount must be greater than zero");
    }

    try {
      return await this.appendEntry(input);
    } catch (err: unknown) {
      // Check if it's a unique constraint violation on idempotencyKey
      const error = err as { code?: string | number; meta?: { code?: string | number } };
      const isUniqueViolation =
        error.code === "P2002" || error.code === 2002 ||
        error.meta?.code === "P2002" || error.meta?.code === 2002;

      if (isUniqueViolation) {
        const existing = await prisma.ledgerEntry.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
        });

        if (!existing) {
          throw err;
        }

        return existing;
      }

      throw err;
    }
  }

  /**
   * Query ledger entries by user.
   */
  async getEntriesByUser(userId: number, options?: { take?: number; skip?: number }) {
    return prisma.ledgerEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: options?.take ?? 50,
      skip: options?.skip ?? 0,
    });
  }

  /**
   * Query ledger entries by wallet.
   */
  async getEntriesByWallet(walletId: number, options?: { take?: number; skip?: number }) {
    return prisma.ledgerEntry.findMany({
      where: { walletId },
      orderBy: { createdAt: "desc" },
      take: options?.take ?? 50,
      skip: options?.skip ?? 0,
    });
  }

  /**
   * Query ledger entries by game.
   */
  async getEntriesByGame(gameId: number) {
    return prisma.ledgerEntry.findMany({
      where: { gameId },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Get a single entry by idempotency key.
   */
  async getEntryByKey(idempotencyKey: string) {
    return prisma.ledgerEntry.findUnique({
      where: { idempotencyKey },
    });
  }

  private toBigInt(value: bigint | string | number): bigint {
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
}

export const ledgerService = new LedgerService();