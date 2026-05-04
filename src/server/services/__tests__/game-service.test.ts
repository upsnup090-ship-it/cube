import { beforeAll, describe, expect, it } from "vitest";
import prisma from "@/server/db/prisma";
import { DiceRollSource } from "@/generated/prisma";
import { walletService } from "@/server/services/wallet-service";
import { gameService } from "@/server/services/game-service";

function key(prefix: string) {
  return `vitest:${prefix}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

describe("GameService", () => {
  let creatorId: number;
  let opponentId: number;

  beforeAll(async () => {
    const creator = await prisma.user.upsert({
      where: { telegramUserId: "vitest_game_creator_001" },
      update: { status: "active" },
      create: {
        telegramUserId: "vitest_game_creator_001",
        username: "vitest_game_creator",
        displayName: "Vitest Game Creator",
        status: "active",
      },
    });

    const opponent = await prisma.user.upsert({
      where: { telegramUserId: "vitest_game_opponent_001" },
      update: { status: "active" },
      create: {
        telegramUserId: "vitest_game_opponent_001",
        username: "vitest_game_opponent",
        displayName: "Vitest Game Opponent",
        status: "active",
      },
    });

    creatorId = creator.id;
    opponentId = opponent.id;

    await walletService.manualCredit({
      userId: creatorId,
      amount: 1000n,
      idempotencyKey: key("game:creator-seed"),
      metadata: { test: true },
    });

    await walletService.manualCredit({
      userId: opponentId,
      amount: 1000n,
      idempotencyKey: key("game:opponent-seed"),
      metadata: { test: true },
    });
  });

  it("createGame and joinGame move game to matched", async () => {
    const created = await gameService.createGame({
      creatorUserId: creatorId,
      betAmount: 50n,
      diceCount: 1,
      idempotencyKey: key("game:create"),
      timeoutMinutes: 20,
    });

    expect(created.status).toBe("waiting");

    const joined = await gameService.joinGame({
      gameId: created.id,
      opponentUserId: opponentId,
      idempotencyKey: key("game:join"),
    });

    expect(joined.status).toBe("matched");
  });

  it("double join is rejected", async () => {
    const created = await gameService.createGame({
      creatorUserId: creatorId,
      betAmount: 30n,
      diceCount: 1,
      idempotencyKey: key("game:create-double"),
      timeoutMinutes: 20,
    });

    await gameService.joinGame({
      gameId: created.id,
      opponentUserId: opponentId,
      idempotencyKey: key("game:first-join"),
    });

    await expect(
      gameService.joinGame({
        gameId: created.id,
        opponentUserId: opponentId,
        idempotencyKey: key("game:second-join"),
      }),
    ).rejects.toThrow();
  });

  it("recordRoll + resolveGame + settleGame works and is idempotent", async () => {
    const created = await gameService.createGame({
      creatorUserId: creatorId,
      betAmount: 40n,
      diceCount: 1,
      idempotencyKey: key("game:create-full"),
      timeoutMinutes: 20,
    });

    const joined = await gameService.joinGame({
      gameId: created.id,
      opponentUserId: opponentId,
      idempotencyKey: key("game:join-full"),
    });

    await gameService.recordRoll({
      gameId: joined.id,
      userId: creatorId,
      diceValue: 6,
      diceCount: 1,
      totalValue: 6,
      source: DiceRollSource.system_test,
      rawPayload: { test: true, user: "creator" },
    });

    await gameService.recordRoll({
      gameId: joined.id,
      userId: opponentId,
      diceValue: 2,
      diceCount: 1,
      totalValue: 2,
      source: DiceRollSource.system_test,
      rawPayload: { test: true, user: "opponent" },
    });

    const resolved = await gameService.resolveGame({ gameId: joined.id });
    expect(resolved.outcome).toBe("winner_determined");

    const settleKey = key("game:settle");
    const first = await gameService.settleGame({ gameId: joined.id, idempotencyKey: settleKey });
    const second = await gameService.settleGame({ gameId: joined.id, idempotencyKey: settleKey });

    expect(first.status).toBe("settled");
    expect(second.status).toBe("settled");
  });
});
