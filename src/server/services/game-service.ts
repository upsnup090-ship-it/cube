import prisma from "../db/prisma";
import { DiceRollSource, GameStatus, Prisma } from "../../generated/prisma";
import { walletService } from "./wallet-service";

type CreateGameParams = {
  creatorUserId: number;
  betAmount: bigint | number | string;
  diceCount: number;
  idempotencyKey: string;
  expiresAt?: Date;
  timeoutMinutes?: number;
};

type JoinGameParams = {
  gameId?: number;
  publicCode?: string;
  opponentUserId: number;
  idempotencyKey: string;
};

type CancelWaitingGameParams = {
  gameId: number;
  requesterUserId: number;
  idempotencyKey: string;
};

type RecordRollParams = {
  gameId: number;
  userId: number;
  diceValue: number;
  diceCount: number;
  totalValue: number;
  source: DiceRollSource;
  telegramChatId?: string;
  telegramMessageId?: string;
  rawPayload?: unknown;
  idempotencyKey?: string;
};

type ResolveGameParams = {
  gameId: number;
};

type SettleGameParams = {
  gameId: number;
  idempotencyKey: string;
};

type ResolveGameResult =
  | {
      outcome: "winner_determined";
      winnerUserId: number;
      loserUserId: number;
      rollRound: number;
    }
  | {
      outcome: "tie_requires_reroll";
      rollRound: number;
    };

function toBigInt(value: bigint | number | string): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  const trimmed = value.trim();
  if (trimmed === "" || Number.isNaN(Number(trimmed))) {
    throw new Error(`Invalid bigint string: "${value}"`);
  }
  return BigInt(trimmed);
}

function createPublicCode(): string {
  return `G${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}

function isUniqueError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { code?: string };
  return candidate.code === "P2002";
}

export class GameService {
  private async getIdempotentResource(key: string, operation: string) {
    return prisma.idempotencyKey.findUnique({
      where: { key },
      select: { operation: true, resourceId: true },
    }).then((entry) => {
      if (!entry || entry.operation !== operation) return null;
      return entry.resourceId;
    });
  }

  async createGame(params: CreateGameParams) {
    const betAmount = toBigInt(params.betAmount);
    if (betAmount <= 0n) throw new Error("Bet amount must be greater than zero");
    if (params.diceCount !== 1 && params.diceCount !== 2) {
      throw new Error("Dice count must be 1 or 2");
    }

    const existingResourceId = await this.getIdempotentResource(params.idempotencyKey, "create_game");
    if (existingResourceId) {
      const gameId = Number(existingResourceId);
      return prisma.game.findUniqueOrThrow({
        where: { id: gameId },
        include: { gamePlayers: true },
      });
    }

    await prisma.idempotencyKey.create({
      data: {
        key: params.idempotencyKey,
        operation: "create_game",
        resourceType: "game",
      },
    }).catch((error: unknown) => {
      if (!isUniqueError(error)) throw error;
    });

    const duplicateResourceId = await this.getIdempotentResource(params.idempotencyKey, "create_game");
    if (duplicateResourceId) {
      return prisma.game.findUniqueOrThrow({
        where: { id: Number(duplicateResourceId) },
        include: { gamePlayers: true },
      });
    }

    const expiresAt =
      params.expiresAt ??
      new Date(Date.now() + (params.timeoutMinutes ?? 10) * 60 * 1000);

    let createdGameId: number | null = null;

    try {
      const game = await prisma.$transaction(async (tx) => {
        const created = await tx.game.create({
          data: {
            publicCode: createPublicCode(),
            creatorUserId: params.creatorUserId,
            status: GameStatus.waiting,
            betAmount,
            diceCount: params.diceCount,
            expiresAt,
          },
        });

        createdGameId = created.id;

        await tx.gamePlayer.create({
          data: {
            gameId: created.id,
            userId: params.creatorUserId,
            role: "creator",
            escrowLockedAmount: betAmount,
          },
        });

        await tx.auditLog.create({
          data: {
            actorType: "user",
            actorId: String(params.creatorUserId),
            action: "create_game",
            resourceType: "game",
            resourceId: String(created.id),
            metadata: {
              idempotencyKey: params.idempotencyKey,
              betAmount: betAmount.toString(),
              diceCount: params.diceCount,
            },
          },
        });

        return created;
      });

      await walletService.lockEscrow({
        userId: params.creatorUserId,
        gameId: game.id,
        amount: betAmount,
        idempotencyKey: `game:create:${params.idempotencyKey}:creator_lock`,
        metadata: {
          gameId: game.id,
          reason: "create_game_escrow_lock",
        },
      });

      await prisma.idempotencyKey.update({
        where: { key: params.idempotencyKey },
        data: { resourceId: String(game.id) },
      });

      return prisma.game.findUniqueOrThrow({
        where: { id: game.id },
        include: { gamePlayers: true },
      });
    } catch (error) {
      if (createdGameId) {
        await prisma.game.update({
          where: { id: createdGameId },
          data: {
            status: GameStatus.failed,
            resultReason: "create_game_failed_after_lock_attempt",
          },
        }).catch(() => undefined);
      }

      await prisma.idempotencyKey.delete({
        where: { key: params.idempotencyKey },
      }).catch(() => undefined);

      throw error;
    }
  }

  async joinGame(params: JoinGameParams) {
    if (!params.gameId && !params.publicCode) {
      throw new Error("Either gameId or publicCode is required");
    }

    const existingResourceId = await this.getIdempotentResource(params.idempotencyKey, "join_game");
    if (existingResourceId) {
      return prisma.game.findUniqueOrThrow({
        where: { id: Number(existingResourceId) },
        include: { gamePlayers: true },
      });
    }

    await prisma.idempotencyKey.create({
      data: {
        key: params.idempotencyKey,
        operation: "join_game",
        resourceType: "game",
      },
    }).catch((error: unknown) => {
      if (!isUniqueError(error)) throw error;
    });

    const duplicateResourceId = await this.getIdempotentResource(params.idempotencyKey, "join_game");
    if (duplicateResourceId) {
      return prisma.game.findUniqueOrThrow({
        where: { id: Number(duplicateResourceId) },
        include: { gamePlayers: true },
      });
    }

    let joinedGameId: number | null = null;

    try {
      const game = await prisma.$transaction(async (tx) => {
        const existing = await tx.game.findFirst({
          where: params.gameId ? { id: params.gameId } : { publicCode: params.publicCode },
          include: { gamePlayers: true },
        });

        if (!existing) throw new Error("Game not found");
        if (existing.creatorUserId === params.opponentUserId) {
          throw new Error("Creator cannot join own game");
        }
        if (existing.status !== GameStatus.waiting) {
          throw new Error("Game is not waiting");
        }
        if (existing.expiresAt <= new Date()) {
          throw new Error("Game is expired");
        }

        const claim = await tx.game.updateMany({
          where: {
            id: existing.id,
            status: GameStatus.waiting,
            opponentUserId: null,
            expiresAt: { gt: new Date() },
          },
          data: {
            opponentUserId: params.opponentUserId,
            status: GameStatus.matched,
          },
        });

        if (claim.count !== 1) {
          throw new Error("Game already joined");
        }

        await tx.gamePlayer.create({
          data: {
            gameId: existing.id,
            userId: params.opponentUserId,
            role: "opponent",
            escrowLockedAmount: existing.betAmount,
          },
        });

        await tx.auditLog.create({
          data: {
            actorType: "user",
            actorId: String(params.opponentUserId),
            action: "join_game",
            resourceType: "game",
            resourceId: String(existing.id),
            metadata: {
              idempotencyKey: params.idempotencyKey,
              opponentUserId: params.opponentUserId,
            },
          },
        });

        joinedGameId = existing.id;
        return tx.game.findUniqueOrThrow({
          where: { id: existing.id },
          include: { gamePlayers: true },
        });
      });

      await walletService.lockEscrow({
        userId: params.opponentUserId,
        gameId: game.id,
        amount: game.betAmount,
        idempotencyKey: `game:join:${params.idempotencyKey}:opponent_lock`,
        metadata: {
          gameId: game.id,
          reason: "join_game_escrow_lock",
        },
      });

      await prisma.idempotencyKey.update({
        where: { key: params.idempotencyKey },
        data: { resourceId: String(game.id) },
      });

      return game;
    } catch (error) {
      if (joinedGameId) {
        await prisma.game.update({
          where: { id: joinedGameId },
          data: {
            status: GameStatus.under_review,
            resultReason: "join_game_failed_after_lock_attempt",
          },
        }).catch(() => undefined);
      }

      await prisma.idempotencyKey.delete({
        where: { key: params.idempotencyKey },
      }).catch(() => undefined);

      throw error;
    }
  }

  async cancelWaitingGame(params: CancelWaitingGameParams) {
    const existingResourceId = await this.getIdempotentResource(params.idempotencyKey, "cancel_game");
    if (existingResourceId) {
      return prisma.game.findUniqueOrThrow({ where: { id: Number(existingResourceId) } });
    }

    await prisma.idempotencyKey.create({
      data: {
        key: params.idempotencyKey,
        operation: "cancel_game",
        resourceType: "game",
        resourceId: String(params.gameId),
      },
    }).catch((error: unknown) => {
      if (!isUniqueError(error)) throw error;
    });

    const game = await prisma.game.findUnique({
      where: { id: params.gameId },
    });
    if (!game) throw new Error("Game not found");
    if (game.creatorUserId !== params.requesterUserId) {
      throw new Error("Only creator can cancel game");
    }
    if (game.status !== GameStatus.waiting) {
      throw new Error("Only waiting games can be cancelled");
    }
    if (game.opponentUserId !== null) {
      throw new Error("Cannot cancel after opponent joined");
    }

    await walletService.refund({
      userId: game.creatorUserId,
      gameId: game.id,
      amount: game.betAmount,
      idempotencyKey: `game:cancel:${params.idempotencyKey}:creator_refund`,
      metadata: {
        gameId: game.id,
        reason: "cancel_waiting_game",
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.game.update({
        where: { id: game.id },
        data: {
          status: GameStatus.refunded,
          resultReason: "cancelled_by_creator",
        },
      });

      await tx.auditLog.create({
        data: {
          actorType: "user",
          actorId: String(params.requesterUserId),
          action: "cancel_game",
          resourceType: "game",
          resourceId: String(game.id),
          metadata: {
            idempotencyKey: params.idempotencyKey,
            refundApplied: true,
          },
        },
      });
    });

    return prisma.game.findUniqueOrThrow({ where: { id: game.id } });
  }

  async recordRoll(params: RecordRollParams) {
    if (params.diceCount !== 1 && params.diceCount !== 2) {
      throw new Error("Dice count must be 1 or 2");
    }
    if (params.totalValue < params.diceCount || params.totalValue > params.diceCount * 6) {
      throw new Error("Invalid total value for given dice count");
    }
    if (params.diceValue < 1 || params.diceValue > 6) {
      throw new Error("Dice value must be from 1 to 6");
    }

    if (params.telegramMessageId) {
      const existingByMessage = await prisma.diceRoll.findFirst({
        where: {
          gameId: params.gameId,
          userId: params.userId,
          telegramMessageId: params.telegramMessageId,
        },
      });
      if (existingByMessage) return existingByMessage;
    }

    const game = await prisma.game.findUnique({
      where: { id: params.gameId },
      include: { gamePlayers: true },
    });
    if (!game) throw new Error("Game not found");
    if (
      game.status !== GameStatus.matched &&
      game.status !== GameStatus.rolling &&
      game.status !== GameStatus.resolving
    ) {
      throw new Error("Game is not in rollable state");
    }
    if (game.diceCount !== params.diceCount) {
      throw new Error("Roll dice count does not match game dice count");
    }

    const isPlayer = game.gamePlayers.some((gp) => gp.userId === params.userId);
    if (!isPlayer) throw new Error("User is not a player in this game");

    const roll = await prisma.$transaction(async (tx) => {
      const latest = await tx.diceRoll.findFirst({
        where: { gameId: params.gameId },
        orderBy: [{ rollRound: "desc" }, { createdAt: "desc" }],
      });
      const latestRound = latest?.rollRound ?? 1;

      const latestRoundRolls = await tx.diceRoll.findMany({
        where: { gameId: params.gameId, rollRound: latestRound },
      });
      const playerCount = await tx.gamePlayer.count({ where: { gameId: params.gameId } });

      const targetRound = latestRoundRolls.length >= playerCount ? latestRound + 1 : latestRound;

      const userAlreadyRolled = latestRoundRolls.some((r) => r.userId === params.userId)
        && targetRound === latestRound;
      if (userAlreadyRolled) {
        throw new Error("User already rolled in current round");
      }

      const createdRoll = await tx.diceRoll.create({
        data: {
          gameId: params.gameId,
          userId: params.userId,
          rollRound: targetRound,
          telegramChatId: params.telegramChatId,
          telegramMessageId: params.telegramMessageId,
          diceValue: params.diceValue,
          diceCount: params.diceCount,
          totalValue: params.totalValue,
          source: params.source,
          rawPayload:
            params.rawPayload === undefined
              ? Prisma.JsonNull
              : (params.rawPayload as Prisma.InputJsonValue),
        },
      });

      if (game.status === GameStatus.matched) {
        await tx.game.update({
          where: { id: game.id },
          data: { status: GameStatus.rolling },
        });
      }

      await tx.auditLog.create({
        data: {
          actorType: "user",
          actorId: String(params.userId),
          action: "record_roll",
          resourceType: "game",
          resourceId: String(game.id),
          metadata: {
            gameId: game.id,
            rollRound: targetRound,
            source: params.source,
            idempotencyKey: params.idempotencyKey ?? null,
            telegramMessageId: params.telegramMessageId ?? null,
          },
        },
      });

      return createdRoll;
    });

    return roll;
  }

  async resolveGame(params: ResolveGameParams): Promise<ResolveGameResult> {
    const game = await prisma.game.findUnique({
      where: { id: params.gameId },
      include: { gamePlayers: true },
    });
    if (!game) throw new Error("Game not found");
    if (game.gamePlayers.length !== 2) {
      throw new Error("Game must have exactly two players to resolve");
    }

    const latestRound = await prisma.diceRoll.findFirst({
      where: { gameId: game.id },
      orderBy: [{ rollRound: "desc" }, { createdAt: "desc" }],
    });
    if (!latestRound) throw new Error("No rolls recorded");

    const roundRolls = await prisma.diceRoll.findMany({
      where: { gameId: game.id, rollRound: latestRound.rollRound },
    });
    if (roundRolls.length < 2) {
      throw new Error("Both players must roll before resolving");
    }

    const creatorRoll = roundRolls.find((r) => r.userId === game.creatorUserId);
    const opponentRoll = roundRolls.find((r) => r.userId === game.opponentUserId);
    if (!creatorRoll || !opponentRoll) {
      throw new Error("Missing roll for one of the players");
    }

    if (creatorRoll.totalValue === opponentRoll.totalValue) {
      await prisma.game.update({
        where: { id: game.id },
        data: {
          status: GameStatus.rolling,
          resultReason: "tie_requires_reroll",
        },
      });

      await prisma.auditLog.create({
        data: {
          actorType: "system",
          actorId: "system",
          action: "resolve_game_tie",
          resourceType: "game",
          resourceId: String(game.id),
          metadata: {
            rollRound: latestRound.rollRound,
            creatorTotal: creatorRoll.totalValue,
            opponentTotal: opponentRoll.totalValue,
          },
        },
      });

      return {
        outcome: "tie_requires_reroll",
        rollRound: latestRound.rollRound,
      };
    }

    const creatorWon = creatorRoll.totalValue > opponentRoll.totalValue;
    const winnerUserId = creatorWon ? game.creatorUserId : (game.opponentUserId as number);
    const loserUserId = creatorWon ? (game.opponentUserId as number) : game.creatorUserId;

    await prisma.$transaction(async (tx) => {
      await tx.game.update({
        where: { id: game.id },
        data: {
          status: GameStatus.resolving,
          winnerUserId,
          loserUserId,
          resultReason: "winner_determined_by_roll",
        },
      });

      await tx.auditLog.create({
        data: {
          actorType: "system",
          actorId: "system",
          action: "resolve_game",
          resourceType: "game",
          resourceId: String(game.id),
          metadata: {
            rollRound: latestRound.rollRound,
            winnerUserId,
            loserUserId,
          },
        },
      });
    });

    return {
      outcome: "winner_determined",
      winnerUserId,
      loserUserId,
      rollRound: latestRound.rollRound,
    };
  }

  async settleGame(params: SettleGameParams) {
    const existingResourceId = await this.getIdempotentResource(params.idempotencyKey, "settle_game");
    if (existingResourceId) {
      return prisma.game.findUniqueOrThrow({ where: { id: Number(existingResourceId) } });
    }

    await prisma.idempotencyKey.create({
      data: {
        key: params.idempotencyKey,
        operation: "settle_game",
        resourceType: "game",
        resourceId: String(params.gameId),
      },
    }).catch((error: unknown) => {
      if (!isUniqueError(error)) throw error;
    });

    const game = await prisma.game.findUnique({
      where: { id: params.gameId },
    });
    if (!game) throw new Error("Game not found");
    if (game.status === GameStatus.settled) return game;
    if (game.status !== GameStatus.matched && game.status !== GameStatus.resolving) {
      throw new Error("Game cannot be settled from current state");
    }

    let winnerUserId = game.winnerUserId;
    let loserUserId = game.loserUserId;

    if (!winnerUserId || !loserUserId) {
      const resolveResult = await this.resolveGame({ gameId: game.id });
      if (resolveResult.outcome === "tie_requires_reroll") {
        throw new Error("Cannot settle tie; reroll required");
      }
      winnerUserId = resolveResult.winnerUserId;
      loserUserId = resolveResult.loserUserId;
    }

    const payoutAmount = game.betAmount * 2n;

    await walletService.releaseEscrow({
      userId: game.creatorUserId,
      amount: game.betAmount,
      idempotencyKey: `game:settle:${params.idempotencyKey}:release_creator`,
      metadata: {
        gameId: game.id,
        reason: "settlement_release_creator",
      },
    });
    await walletService.releaseEscrow({
      userId: loserUserId,
      amount: game.betAmount,
      idempotencyKey: `game:settle:${params.idempotencyKey}:release_opponent`,
      metadata: {
        gameId: game.id,
        reason: "settlement_release_opponent",
      },
    });
    await walletService.payout({
      userId: winnerUserId,
      gameId: game.id,
      amount: payoutAmount,
      idempotencyKey: `game:settle:${params.idempotencyKey}:payout_winner`,
      metadata: {
        gameId: game.id,
        loserUserId,
        reason: "settlement_payout",
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.game.update({
        where: { id: game.id },
        data: {
          status: GameStatus.settled,
          winnerUserId,
          loserUserId,
          resultReason: "settled",
          settledAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorType: "system",
          actorId: "system",
          action: "settle_game",
          resourceType: "game",
          resourceId: String(game.id),
          metadata: {
            idempotencyKey: params.idempotencyKey,
            winnerUserId,
            loserUserId,
            payoutAmount: payoutAmount.toString(),
          },
        },
      });
    });

    return prisma.game.findUniqueOrThrow({ where: { id: game.id } });
  }
}

export const gameService = new GameService();
