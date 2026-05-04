import prisma from "../db/prisma";
import { DiceRollSource } from "../../generated/prisma";
import { walletService } from "../services/wallet-service";
import { gameService } from "../services/game-service";

export type DevPlayerSimulatorResult = {
  runKey: string;
  gameId: number;
  publicCode: string;
  winnerUserId: number;
  loserUserId: number;
  settledStatus: string;
  creatorUserId: number;
  opponentUserId: number;
  creatorWallet: { availableBalance: string; lockedBalance: string };
  opponentWallet: { availableBalance: string; lockedBalance: string };
};

function requireSimulatorEnabled() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Dev player simulator is disabled in production");
  }

  if (process.env.DEV_PLAYER_SIMULATOR_ENABLED !== "1") {
    throw new Error("DEV_PLAYER_SIMULATOR_ENABLED must be set to 1");
  }
}

function buildRunKey() {
  const now = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `devsim:${now}:${rand}`;
}

async function ensureDemoUsers() {
  const creator = await prisma.user.upsert({
    where: { telegramUserId: "devsim_creator_001" },
    update: { status: "active" },
    create: {
      telegramUserId: "devsim_creator_001",
      username: "devsim_creator",
      displayName: "DevSim Creator",
      status: "active",
    },
  });

  const opponent = await prisma.user.upsert({
    where: { telegramUserId: "devsim_opponent_001" },
    update: { status: "active" },
    create: {
      telegramUserId: "devsim_opponent_001",
      username: "devsim_opponent",
      displayName: "DevSim Opponent",
      status: "active",
    },
  });

  await prisma.wallet.upsert({
    where: { userId: creator.id },
    update: {},
    create: {
      userId: creator.id,
      currency: "COIN",
      availableBalance: 0n,
      lockedBalance: 0n,
    },
  });

  await prisma.wallet.upsert({
    where: { userId: opponent.id },
    update: {},
    create: {
      userId: opponent.id,
      currency: "COIN",
      availableBalance: 0n,
      lockedBalance: 0n,
    },
  });

  return { creatorId: creator.id, opponentId: opponent.id };
}

export async function runDevPlayerSimulator(): Promise<DevPlayerSimulatorResult> {
  requireSimulatorEnabled();

  const runKey = buildRunKey();
  const users = await ensureDemoUsers();

  await walletService.manualCredit({
    userId: users.creatorId,
    amount: 200n,
    idempotencyKey: `${runKey}:credit:creator`,
    metadata: { simulator: true },
  });

  await walletService.manualCredit({
    userId: users.opponentId,
    amount: 200n,
    idempotencyKey: `${runKey}:credit:opponent`,
    metadata: { simulator: true },
  });

  const created = await gameService.createGame({
    creatorUserId: users.creatorId,
    betAmount: 50n,
    diceCount: 1,
    idempotencyKey: `${runKey}:game:create`,
    timeoutMinutes: 15,
  });

  const joined = await gameService.joinGame({
    gameId: created.id,
    opponentUserId: users.opponentId,
    idempotencyKey: `${runKey}:game:join`,
  });

  await gameService.recordRoll({
    gameId: joined.id,
    userId: users.creatorId,
    diceValue: 6,
    diceCount: 1,
    totalValue: 6,
    source: DiceRollSource.system_test,
    rawPayload: { simulator: true, roller: "creator" },
  });

  await gameService.recordRoll({
    gameId: joined.id,
    userId: users.opponentId,
    diceValue: 2,
    diceCount: 1,
    totalValue: 2,
    source: DiceRollSource.system_test,
    rawPayload: { simulator: true, roller: "opponent" },
  });

  const resolved = await gameService.resolveGame({ gameId: joined.id });
  if (resolved.outcome !== "winner_determined") {
    throw new Error("Simulator expected deterministic non-tie rolls");
  }

  const settled = await gameService.settleGame({
    gameId: joined.id,
    idempotencyKey: `${runKey}:game:settle`,
  });

  const creatorWallet = await prisma.wallet.findUniqueOrThrow({
    where: { userId: users.creatorId },
    select: { availableBalance: true, lockedBalance: true },
  });

  const opponentWallet = await prisma.wallet.findUniqueOrThrow({
    where: { userId: users.opponentId },
    select: { availableBalance: true, lockedBalance: true },
  });

  return {
    runKey,
    gameId: settled.id,
    publicCode: settled.publicCode,
    winnerUserId: resolved.winnerUserId,
    loserUserId: resolved.loserUserId,
    settledStatus: settled.status,
    creatorUserId: users.creatorId,
    opponentUserId: users.opponentId,
    creatorWallet: {
      availableBalance: creatorWallet.availableBalance.toString(),
      lockedBalance: creatorWallet.lockedBalance.toString(),
    },
    opponentWallet: {
      availableBalance: opponentWallet.availableBalance.toString(),
      lockedBalance: opponentWallet.lockedBalance.toString(),
    },
  };
}
