import prisma from "../db/prisma";
import { DiceRollSource } from "../../generated/prisma";
import { walletService } from "./wallet-service";
import { gameService } from "./game-service";

type DemoUsers = {
  creatorId: number;
  opponentId: number;
};

type CheckResult = {
  name: string;
  passed: boolean;
  details: string;
};

const now = Date.now();
const runKey = `smoke:${now}`;
const commissionBps = Number.parseInt(process.env.GAME_COMMISSION_BPS ?? "50", 10);
const commissionRecipientTelegramUserId = process.env.GAME_COMMISSION_RECIPIENT_TELEGRAM_USER_ID ?? "1093943977";

function key(suffix: string): string {
  return `${runKey}:${suffix}`;
}

async function ensureDemoUsers(): Promise<DemoUsers> {
  const creator = await prisma.user.upsert({
    where: { telegramUserId: "demo_creator_001" },
    update: { status: "active" },
    create: {
      telegramUserId: "demo_creator_001",
      username: "demo_creator",
      displayName: "Demo Creator",
      status: "active",
    },
  });

  const opponent = await prisma.user.upsert({
    where: { telegramUserId: "demo_opponent_001" },
    update: { status: "active" },
    create: {
      telegramUserId: "demo_opponent_001",
      username: "demo_opponent",
      displayName: "Demo Opponent",
      status: "active",
    },
  });

  await prisma.wallet.upsert({
    where: { userId: creator.id },
    update: {},
    create: {
      userId: creator.id,
      currency: "COIN",
      availableBalance: BigInt(0),
      lockedBalance: BigInt(0),
    },
  });

  await prisma.wallet.upsert({
    where: { userId: opponent.id },
    update: {},
    create: {
      userId: opponent.id,
      currency: "COIN",
      availableBalance: BigInt(0),
      lockedBalance: BigInt(0),
    },
  });

  return { creatorId: creator.id, opponentId: opponent.id };
}

async function main() {
  const checks: CheckResult[] = [];
  const addResult = (name: string, passed: boolean, details: string) => {
    checks.push({ name, passed, details });
    const mark = passed ? "PASS" : "FAIL";
    console.log(`[${mark}] ${name} - ${details}`);
  };

  let hasFatalFailure = false;

  try {
    const users = await ensureDemoUsers();
    addResult("Ensure demo users and wallets", true, `creator=${users.creatorId}, opponent=${users.opponentId}`);

    const topUpAmount = 2000n;
    const betAmount = 1000n;
    const expectedCommissionAmount = betAmount * BigInt(commissionBps) / 10_000n;
    const expectedOpponentNetPayout = betAmount - expectedCommissionAmount;
    await walletService.manualCredit({
      userId: users.creatorId,
      amount: topUpAmount,
      idempotencyKey: key("credit:creator"),
      metadata: { smoke: true },
    });
    await walletService.manualCredit({
      userId: users.opponentId,
      amount: topUpAmount,
      idempotencyKey: key("credit:opponent"),
      metadata: { smoke: true },
    });
    addResult("Credit demo users via WalletService", true, `amount=${topUpAmount.toString()}`);

    const createdGame = await gameService.createGame({
      creatorUserId: users.creatorId,
      betAmount,
      diceCount: 1,
      idempotencyKey: key("game:create"),
      timeoutMinutes: 15,
    });
    addResult("Create game via GameService", createdGame.status === "waiting", `gameId=${createdGame.id}`);

    const joinedGame = await gameService.joinGame({
      gameId: createdGame.id,
      opponentUserId: users.opponentId,
      idempotencyKey: key("game:join"),
    });
    addResult("Join game via GameService", joinedGame.status === "matched", `gameId=${joinedGame.id}`);

    let doubleJoinRejected = false;
    try {
      await gameService.joinGame({
        gameId: createdGame.id,
        opponentUserId: users.opponentId,
        idempotencyKey: key("game:join:second"),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      doubleJoinRejected = message.includes("not waiting") || message.includes("already joined");
    }
    addResult("Double join is rejected", doubleJoinRejected, "second join attempt blocked");

    await gameService.recordRoll({
      gameId: createdGame.id,
      userId: users.creatorId,
      diceValue: 6,
      diceCount: 1,
      totalValue: 6,
      source: DiceRollSource.system_test,
      rawPayload: { smoke: true, roller: "creator" },
    });
    await gameService.recordRoll({
      gameId: createdGame.id,
      userId: users.opponentId,
      diceValue: 2,
      diceCount: 1,
      totalValue: 2,
      source: DiceRollSource.system_test,
      rawPayload: { smoke: true, roller: "opponent" },
    });
    addResult("Record both players rolls", true, "rolls recorded");

    const resolved = await gameService.resolveGame({ gameId: createdGame.id });
    const winnerDetermined = resolved.outcome === "winner_determined";
    addResult("Resolve game", winnerDetermined, winnerDetermined ? `winner=${resolved.winnerUserId}` : "tie");
    if (!winnerDetermined) {
      throw new Error("Smoke flow expects non-tie deterministic rolls");
    }

    const commissionRecipientBeforeUser = await prisma.user.findUnique({
      where: { telegramUserId: commissionRecipientTelegramUserId },
      select: { id: true },
    });
    const commissionWalletBefore = commissionRecipientBeforeUser
      ? await prisma.wallet.findUnique({
        where: { userId: commissionRecipientBeforeUser.id },
        select: { availableBalance: true, lockedBalance: true },
      })
      : null;

    const beforeFirstSettle = await prisma.wallet.findUniqueOrThrow({
      where: { userId: resolved.winnerUserId },
      select: { availableBalance: true, lockedBalance: true },
    });
    const loserBeforeFirstSettle = await prisma.wallet.findUniqueOrThrow({
      where: { userId: resolved.loserUserId },
      select: { availableBalance: true, lockedBalance: true },
    });

    const settleKey = key("game:settle");
    const settledOnce = await gameService.settleGame({
      gameId: createdGame.id,
      idempotencyKey: settleKey,
    });
    const afterFirstSettle = await prisma.wallet.findUniqueOrThrow({
      where: { userId: resolved.winnerUserId },
      select: { availableBalance: true, lockedBalance: true },
    });
    const loserAfterFirstSettle = await prisma.wallet.findUniqueOrThrow({
      where: { userId: resolved.loserUserId },
      select: { availableBalance: true, lockedBalance: true },
    });
    const commissionRecipientAfterUser = await prisma.user.findUniqueOrThrow({
      where: { telegramUserId: commissionRecipientTelegramUserId },
      select: { id: true },
    });
    const commissionWalletAfterFirstSettle = await prisma.wallet.findUniqueOrThrow({
      where: { userId: commissionRecipientAfterUser.id },
      select: { availableBalance: true, lockedBalance: true },
    });

    const settledTwice = await gameService.settleGame({
      gameId: createdGame.id,
      idempotencyKey: settleKey,
    });
    const afterSecondSettle = await prisma.wallet.findUniqueOrThrow({
      where: { userId: resolved.winnerUserId },
      select: { availableBalance: true, lockedBalance: true },
    });

    const firstSettleWinnerDeltaCorrect =
      afterFirstSettle.availableBalance - beforeFirstSettle.availableBalance
        === betAmount + expectedOpponentNetPayout
      && beforeFirstSettle.lockedBalance - afterFirstSettle.lockedBalance === betAmount;
    const firstSettleLoserDeltaCorrect =
      loserAfterFirstSettle.availableBalance === loserBeforeFirstSettle.availableBalance
      && loserBeforeFirstSettle.lockedBalance - loserAfterFirstSettle.lockedBalance === betAmount;
    const commissionBeforeAvailable = commissionWalletBefore?.availableBalance ?? 0n;
    const firstSettleCommissionCorrect =
      commissionWalletAfterFirstSettle.availableBalance - commissionBeforeAvailable === expectedCommissionAmount
      && commissionWalletAfterFirstSettle.lockedBalance === (commissionWalletBefore?.lockedBalance ?? 0n);
    const secondSettleNoChange =
      afterSecondSettle.availableBalance === afterFirstSettle.availableBalance &&
      afterSecondSettle.lockedBalance === afterFirstSettle.lockedBalance &&
      settledOnce.status === "settled" &&
      settledTwice.status === "settled";

    addResult("Settlement returns winner escrow plus net opponent stake", firstSettleWinnerDeltaCorrect, "winner delta matches commission model");
    addResult("Settlement drains loser escrow without refund", firstSettleLoserDeltaCorrect, "loser available unchanged and locked drained");
    addResult("Settlement credits commission recipient", firstSettleCommissionCorrect, `commission=${expectedCommissionAmount.toString()}`);
    addResult("Second settle with same key has no double payout", secondSettleNoChange, "wallet unchanged on repeat");

    let insufficientLockRejected = false;
    try {
      await walletService.lockEscrow({
        userId: users.opponentId,
        gameId: createdGame.id,
        amount: 999_999_999n,
        idempotencyKey: key("lock:insufficient"),
        metadata: { smoke: true },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      insufficientLockRejected = message.includes("Insufficient available balance");
    }
    addResult("Insufficient balance lock is rejected", insufficientLockRejected, "lockEscrow rejected oversized lock");
  } catch (error) {
    hasFatalFailure = true;
    const message = error instanceof Error ? error.message : String(error);
    addResult("Fatal smoke execution", false, message);
  } finally {
    await prisma.$disconnect();
  }

  const passedCount = checks.filter((c) => c.passed).length;
  const failed = checks.filter((c) => !c.passed);

  console.log("");
  console.log("=== Service Smoke Summary ===");
  console.log(`Total: ${checks.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failed.length}`);

  if (failed.length > 0 || hasFatalFailure) {
    console.log("Result: FAIL");
    process.exit(1);
  }

  console.log("Result: PASS");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[FAIL] Unhandled smoke error: ${message}`);
  process.exit(1);
});
