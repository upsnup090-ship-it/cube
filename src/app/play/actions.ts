"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/server/db/prisma";
import { DiceRollSource } from "@/generated/prisma";
import { gameService } from "@/server/services/game-service";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function parseNumberField(formData: FormData, key: string): number {
  const raw = formData.get(key);
  if (typeof raw !== "string") {
    throw new Error(`Missing field: ${key}`);
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid number field: ${key}`);
  }
  return value;
}

function parseStringField(formData: FormData, key: string): string {
  const raw = formData.get(key);
  if (typeof raw !== "string") {
    throw new Error(`Missing field: ${key}`);
  }
  const value = raw.trim();
  if (!value) {
    throw new Error(`Empty field: ${key}`);
  }
  return value;
}

async function assertDemoUser(userId: number): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramUserId: true },
  });
  if (!user) {
    throw new Error("User not found");
  }
  if (!user.telegramUserId.startsWith("demo_")) {
    throw new Error("Only demo users are allowed in /play sandbox");
  }
}

export type CreateGameData = {
  gameId: number;
  publicCode: string;
};

export type CreateGameState = {
  result: ActionResult<CreateGameData> | null;
};

export async function createGameAction(
  _prevState: CreateGameState,
  formData: FormData,
): Promise<CreateGameState> {
  try {
    const creatorUserId = parseNumberField(formData, "creatorUserId");
    const betAmountRaw = parseStringField(formData, "betAmount");
    const diceCount = parseNumberField(formData, "diceCount");
    const idempotencyKey = parseStringField(formData, "idempotencyKey");

    await assertDemoUser(creatorUserId);

    const created = await gameService.createGame({
      creatorUserId,
      betAmount: betAmountRaw,
      diceCount,
      idempotencyKey,
      timeoutMinutes: 15,
    });

    revalidatePath("/play");
    return {
      result: { ok: true, data: { gameId: created.id, publicCode: created.publicCode } },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { result: { ok: false, error: message } };
  }
}

export type JoinGameData = {
  gameId: number;
  publicCode: string;
  status: string;
};

export type JoinGameState = {
  result: ActionResult<JoinGameData> | null;
};

export async function joinGameAction(
  _prevState: JoinGameState,
  formData: FormData,
): Promise<JoinGameState> {
  try {
    const publicCode = parseStringField(formData, "publicCode").toUpperCase();
    const opponentUserId = parseNumberField(formData, "opponentUserId");
    const idempotencyKey = parseStringField(formData, "idempotencyKey");

    await assertDemoUser(opponentUserId);

    const game = await prisma.game.findUnique({
      where: { publicCode },
      select: { id: true, creatorUserId: true },
    });
    if (!game) {
      throw new Error("Game not found by publicCode");
    }
    if (game.creatorUserId === opponentUserId) {
      throw new Error("Creator cannot join own game");
    }

    const joined = await gameService.joinGame({
      publicCode,
      opponentUserId,
      idempotencyKey,
    });

    revalidatePath("/play");
    return {
      result: {
        ok: true,
        data: {
          gameId: joined.id,
          publicCode: joined.publicCode,
          status: joined.status,
        },
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { result: { ok: false, error: message } };
  }
}

export type GameOpState = {
  result: ActionResult<{ message: string }> | null;
};

export async function recordRollAction(
  _prevState: GameOpState,
  formData: FormData,
): Promise<GameOpState> {
  try {
    const gameId = parseNumberField(formData, "gameId");
    const userId = parseNumberField(formData, "userId");
    const diceValue = parseNumberField(formData, "diceValue");
    const diceCount = parseNumberField(formData, "diceCount");
    const sourceRaw = parseStringField(formData, "source");

    await assertDemoUser(userId);

    const source =
      sourceRaw === "admin_test"
        ? DiceRollSource.admin_test
        : DiceRollSource.system_test;

    const totalValue = diceValue * diceCount;

    await gameService.recordRoll({
      gameId,
      userId,
      diceValue,
      diceCount,
      totalValue,
      source,
      rawPayload: {
        sandbox: true,
        note: "Manual roll from /play sandbox UI. Not a real Telegram dice.",
      },
    });

    revalidatePath(`/play/games/${gameId}`);
    return { result: { ok: true, data: { message: "Roll recorded" } } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { result: { ok: false, error: message } };
  }
}

export async function resolveGameAction(
  _prevState: GameOpState,
  formData: FormData,
): Promise<GameOpState> {
  try {
    const gameId = parseNumberField(formData, "gameId");
    const resolved = await gameService.resolveGame({ gameId });

    revalidatePath(`/play/games/${gameId}`);
    return {
      result: {
        ok: true,
        data: { message: `Resolved: ${resolved.outcome}` },
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { result: { ok: false, error: message } };
  }
}

export async function settleGameAction(
  _prevState: GameOpState,
  formData: FormData,
): Promise<GameOpState> {
  try {
    const gameId = parseNumberField(formData, "gameId");
    const idempotencyKey = `play:settle:game:${gameId}`;

    await gameService.settleGame({ gameId, idempotencyKey });

    revalidatePath(`/play/games/${gameId}`);
    revalidatePath("/play");
    return { result: { ok: true, data: { message: "Game settled" } } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { result: { ok: false, error: message } };
  }
}

