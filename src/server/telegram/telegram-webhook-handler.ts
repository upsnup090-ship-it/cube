import prisma from "../db/prisma";
import { GameStatus } from "../../generated/prisma";
import { gameService } from "../services/game-service";
import {
  telegramWebhookService,
  buildTelegramIdempotencyKey,
  type TelegramParsedUpdate,
} from "./telegram-webhook-service";

// ─── Types ──────────────────────────────────────────────────────────────────

export type WebhookHandlerResult =
  | { status: "ok"; action: string; updateId: number }
  | { status: "duplicate"; updateId: number }
  | { status: "ignored"; reason: string; updateId?: number }
  | { status: "error"; reason: string; updateId?: number };

// ─── Timeouts (from milestone-0.1-decisions) ────────────────────────────────

export const GAME_TIMEOUTS = {
  WAITING_MINUTES: 10,
  ROLLING_MINUTES: 5,
  RESOLVING_MINUTES: 2,
} as const;

// ─── Handler ────────────────────────────────────────────────────────────────

export class TelegramWebhookHandler {
  /**
   * Main entry point for processing a raw Telegram update.
   * Pipeline:
   *   1. Parse & validate payload
   *   2. Check idempotency key
   *   3. Upsert user by from.id
   *   4. Route by kind (dice / command / other)
   *   5. Store raw payload for audit
   *   6. Write idempotency key
   */
  async handleUpdate(rawPayload: unknown): Promise<WebhookHandlerResult> {
    const parsed = telegramWebhookService.parseUpdate(rawPayload);

    if (parsed.kind === "invalid_update") {
      return { status: "error", reason: parsed.reason };
    }

    if (parsed.kind === "non_message_update") {
      return { status: "ignored", reason: "non_message_update", updateId: parsed.updateId };
    }

    const updateId = parsed.updateId;
    const idempotencyKey = buildTelegramIdempotencyKey(updateId);

    // Step 2: Check idempotency
    const existingKey = await prisma.idempotencyKey.findUnique({
      where: { key: idempotencyKey },
    });

    if (existingKey) {
      return { status: "duplicate", updateId };
    }

    // Step 3-4: Route by kind
    let result: WebhookHandlerResult;

    switch (parsed.kind) {
      case "dice":
        result = await this.handleDice(parsed, updateId, rawPayload);
        break;
      case "command":
        result = await this.handleCommand(parsed, updateId);
        break;
      case "unknown_text":
        result = { status: "ignored", reason: "unknown_text", updateId };
        break;
      case "message_ignored":
        result = { status: "ignored", reason: "message_ignored", updateId };
        break;
      default:
        result = { status: "ignored", reason: "unhandled_kind", updateId };
    }

    // Step 6: Write idempotency key (only for successfully processed updates)
    if (result.status === "ok" || result.status === "ignored") {
      await prisma.idempotencyKey.create({
        data: {
          key: idempotencyKey,
          operation: "telegram_webhook",
          resourceType: "telegram_update",
          resourceId: String(updateId),
        },
      }).catch(() => {
        // Ignore duplicate key — race condition safe
      });
    }

    return result;
  }

  // ─── Dice handling ──────────────────────────────────────────────────────────

  private async handleDice(
    parsed: TelegramParsedUpdate & { kind: "dice" },
    updateId: number,
    rawPayload: unknown,
  ): Promise<WebhookHandlerResult> {
    const { payload, message } = parsed.data;

    if (!payload.userId) {
      return { status: "error", reason: "dice_without_user_id", updateId };
    }

    // Step 3: Upsert user
    const user = await this.upsertUser(
      payload.userId,
      message.from?.username,
      updateId,
    );

    // Find active game for this user
    const activeGame = await this.findActiveGameForUser(user.id);

    if (!activeGame) {
      return { status: "ignored", reason: "no_active_game", updateId };
    }

    // Record the roll
    try {
      await gameService.recordRoll({
        gameId: activeGame.id,
        userId: user.id,
        diceValue: payload.value,
        diceCount: 1,
        totalValue: payload.value,
        source: "telegram_dice",
        telegramChatId: String(payload.chatId),
        telegramMessageId: String(payload.messageId),
        rawPayload: rawPayload as Record<string, unknown>,
        idempotencyKey: buildTelegramIdempotencyKey(updateId, "dice_roll"),
      });

      // Auto-resolve if both players rolled
      await this.tryAutoResolve(activeGame.id);

      return { status: "ok", action: "dice_recorded", updateId };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // "User already rolled" is not a fatal error — just ignore duplicate
      if (message.includes("already rolled")) {
        return { status: "ignored", reason: "already_rolled", updateId };
      }
      return { status: "error", reason: message, updateId };
    }
  }

  // ─── Command handling ───────────────────────────────────────────────────────

  private async handleCommand(
    parsed: TelegramParsedUpdate & { kind: "command" },
    updateId: number,
  ): Promise<WebhookHandlerResult> {
    const { command, message } = parsed.data;

    if (!message.from?.id) {
      return { status: "error", reason: "command_without_user_id", updateId };
    }

    const user = await this.upsertUser(message.from.id, message.from.username, updateId);

    const responseText = command === "start"
      ? "Добро пожаловать в CubeChat Dices. Бот готов к PvP dice flow. Отправьте /help для справки."
      : "Доступные команды: /start — старт, /help — справка. Для игры используйте стандартный Telegram dice 🎲.";

    const sendResult = await telegramWebhookService.sendMessage(message.chat.id, responseText);
    await prisma.auditLog.create({
      data: {
        actorType: "telegram_webhook",
        actorId: String(message.from.id),
        action: "telegram_message_sent",
        resourceType: "user",
        resourceId: String(user.id),
        metadata: {
          updateId,
          command,
          chatId: message.chat.id,
          text: responseText,
          sendResult,
        },
      },
    });

    return { status: "ok", action: `command_${command}`, updateId };
  }

  // ─── User upsert ───────────────────────────────────────────────────────────

  private async upsertUser(
    telegramUserId: number,
    username: string | undefined,
    updateId: number,
  ) {
    const telegramUserIdStr = String(telegramUserId);

    const existing = await prisma.user.findUnique({
      where: { telegramUserId: telegramUserIdStr },
    });

    if (existing) {
      // Update username if changed
      if (username !== undefined && existing.username !== username) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { username },
        });

        await prisma.auditLog.create({
          data: {
            actorType: "telegram_webhook",
            actorId: telegramUserIdStr,
            action: "user_profile_updated",
            resourceType: "user",
            resourceId: String(existing.id),
            metadata: {
              oldUsername: existing.username,
              newUsername: username,
              updateId,
            },
          },
        });
      }

      return existing;
    }

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        telegramUserId: telegramUserIdStr,
        username: username ?? null,
        status: "active",
      },
    });

    await prisma.auditLog.create({
      data: {
        actorType: "telegram_webhook",
        actorId: telegramUserIdStr,
        action: "user_created",
        resourceType: "user",
        resourceId: String(newUser.id),
        metadata: { updateId, username },
      },
    });

    return newUser;
  }

  // ─── Active game lookup ─────────────────────────────────────────────────────
  // Rule: one active game per user.
  // Active = status IN (waiting, matched, rolling, resolving)

  private async findActiveGameForUser(userId: number) {
    const activeStatuses: GameStatus[] = [
      GameStatus.waiting,
      GameStatus.matched,
      GameStatus.rolling,
      GameStatus.resolving,
    ];

    const gamePlayer = await prisma.gamePlayer.findFirst({
      where: {
        userId,
        game: {
          status: { in: activeStatuses },
        },
      },
      include: { game: true },
      orderBy: { joinedAt: "desc" },
    });

    return gamePlayer?.game ?? null;
  }

  // ─── Auto-resolve ───────────────────────────────────────────────────────────

  private async tryAutoResolve(gameId: number) {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { gamePlayers: true },
    });

    if (!game || game.gamePlayers.length !== 2) return;
    if (game.status !== GameStatus.rolling && game.status !== GameStatus.resolving) return;

    // Check if both players rolled in latest round
    const latestRoll = await prisma.diceRoll.findFirst({
      where: { gameId },
      orderBy: [{ rollRound: "desc" }, { createdAt: "desc" }],
    });
    if (!latestRoll) return;

    const roundRolls = await prisma.diceRoll.findMany({
      where: { gameId, rollRound: latestRoll.rollRound },
    });

    if (roundRolls.length < 2) return;

    // Both rolled — resolve
    const resolveResult = await gameService.resolveGame({ gameId });

    if (resolveResult.outcome === "winner_determined") {
      // Auto-settle
      await gameService.settleGame({
        gameId,
        idempotencyKey: `game:auto_settle:${gameId}:round_${resolveResult.rollRound}`,
      });
    }
  }
}

export const telegramWebhookHandler = new TelegramWebhookHandler();
