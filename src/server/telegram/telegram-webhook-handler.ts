import prisma from "../db/prisma";
import { GameStatus } from "../../generated/prisma";
import { gameService } from "../services/game-service";
import { walletService } from "../services/wallet-service";
import {
  telegramWebhookService,
  buildTelegramIdempotencyKey,
  type TelegramParsedUpdate,
} from "./telegram-webhook-service";

// ─── Types ──────────────────────────────────────────────────────────────────

function isUniqueError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { code?: string };
  return candidate.code === "P2002";
}

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

    const reserved = await prisma.idempotencyKey.create({
      data: {
        key: idempotencyKey,
        operation: "telegram_webhook",
        resourceType: "telegram_update",
        resourceId: String(updateId),
      },
    }).then(() => true).catch((error: unknown) => {
      if (isUniqueError(error)) return false;
      throw error;
    });

    if (!reserved) {
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
      payload.chatId,
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

      // Notify roller
      await telegramWebhookService.sendMessage(
        payload.chatId,
        `Ваш бросок: ${payload.value} 🎲. Ждём хода противника...`,
      );

      // Notify opponent
      const opponentId =
        activeGame.creatorUserId === user.id
          ? activeGame.opponentUserId
          : activeGame.creatorUserId;
      if (opponentId) {
        await this.notifyUser(opponentId, "Противник сделал ход. Ваш ход! 🎲");
      }

      // Auto-resolve if both players rolled
      const resolveResult = await this.tryAutoResolve(activeGame.id);

      if (resolveResult?.outcome === "winner_determined") {
        const settled = await prisma.game.findUnique({ where: { id: activeGame.id } });
        if (settled?.winnerUserId && settled?.loserUserId) {
          const prize = settled.betAmount * 2n;
          await this.notifyUser(
            settled.winnerUserId,
            `🏆 Вы выиграли! Приз: ${prize} монет. Баланс пополнен.`,
          );
          await this.notifyUser(
            settled.loserUserId,
            "Вы проиграли. Удачи в следующей игре! 🎲",
          );
        }
      } else if (resolveResult?.outcome === "tie_requires_reroll") {
        await telegramWebhookService.sendMessage(payload.chatId, "Ничья! Бросайте ещё раз 🎲");
        if (opponentId) {
          await this.notifyUser(opponentId, "Ничья! Бросайте ещё раз 🎲");
        }
      }

      return { status: "ok", action: "dice_recorded", updateId };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("already rolled")) {
        return { status: "ignored", reason: "already_rolled", updateId };
      }
      return { status: "error", reason: errMsg, updateId };
    }
  }

  // ─── Command handling ───────────────────────────────────────────────────────

  private async handleCommand(
    parsed: TelegramParsedUpdate & { kind: "command" },
    updateId: number,
  ): Promise<WebhookHandlerResult> {
    const { command, args, message } = parsed.data;

    if (!message.from?.id) {
      return { status: "error", reason: "command_without_user_id", updateId };
    }

    const user = await this.upsertUser(
      message.from.id,
      message.from.username,
      message.chat.id,
      updateId,
    );

    switch (command) {
      case "start":
        return this.handleStartCommand(user.id, message.chat.id, updateId);
      case "help":
        return this.handleHelpCommand(message.chat.id, updateId);
      case "play":
        return this.handlePlayCommand(user, message.chat.id, args, updateId);
      case "join":
        return this.handleJoinCommand(user, message.chat.id, args, updateId);
      case "cancel":
        return this.handleCancelCommand(user, message.chat.id, updateId);
      case "balance":
        return this.handleBalanceCommand(user, message.chat.id, updateId);
      default:
        return { status: "ignored", reason: "unknown_command", updateId };
    }
  }

  private async handleStartCommand(
    userId: number,
    chatId: number,
    updateId: number,
  ): Promise<WebhookHandlerResult> {
    const text =
      "Добро пожаловать в CubeChat Dices! 🎲\n\n" +
      "Команды:\n" +
      "/play <ставка> [кубики] — создать игру\n" +
      "/join <код> — присоединиться к игре\n" +
      "/balance — посмотреть баланс\n" +
      "/cancel — отменить свою игру\n" +
      "/help — справка";
    await telegramWebhookService.sendMessage(chatId, text);
    await prisma.auditLog.create({
      data: {
        actorType: "telegram_webhook",
        actorId: String(userId),
        action: "telegram_message_sent",
        resourceType: "user",
        resourceId: String(userId),
        metadata: { updateId, command: "start", chatId },
      },
    });
    return { status: "ok", action: "command_start", updateId };
  }

  private async handleHelpCommand(
    chatId: number,
    updateId: number,
  ): Promise<WebhookHandlerResult> {
    const text =
      "Как играть:\n\n" +
      "1. Создайте игру: /play 100 — ставка 100 монет, 1 кубик\n" +
      "   Или /play 100 2 — ставка 100, 2 кубика\n" +
      "2. Поделитесь кодом игры с противником\n" +
      "3. Противник вводит: /join КОД\n" +
      "4. Оба отправляют 🎲 в чат\n" +
      "5. Больший результат побеждает!\n\n" +
      "Другие команды:\n" +
      "/balance — баланс кошелька\n" +
      "/cancel — отменить ожидающую игру\n\n" +
      "Ничья — переброс. Комиссия взимается с выигрыша.";
    await telegramWebhookService.sendMessage(chatId, text);
    return { status: "ok", action: "command_help", updateId };
  }

  private async handlePlayCommand(
    user: { id: number; status: string },
    chatId: number,
    args: string[],
    updateId: number,
  ): Promise<WebhookHandlerResult> {
    if (user.status !== "active") {
      await telegramWebhookService.sendMessage(chatId, "Ваш аккаунт заблокирован. Создание игры недоступно.");
      return { status: "ignored", reason: "user_not_active", updateId };
    }

    const rawAmount = args[0];
    const rawDice = args[1];

    if (!rawAmount || !/^\d+$/.test(rawAmount) || rawAmount === "0") {
      await telegramWebhookService.sendMessage(
        chatId,
        "Укажите ставку: /play <сумма> [кубики]\nПример: /play 100 или /play 100 2",
      );
      return { status: "ignored", reason: "invalid_play_args", updateId };
    }

    const betAmount = BigInt(rawAmount);
    const diceCount = rawDice === "2" ? 2 : 1;

    const existingGame = await this.findActiveGameForUser(user.id);
    if (existingGame) {
      await telegramWebhookService.sendMessage(
        chatId,
        `У вас уже есть активная игра (код: ${existingGame.publicCode}). Завершите или отмените её сначала.`,
      );
      return { status: "ignored", reason: "already_has_active_game", updateId };
    }

    try {
      const game = await gameService.createGame({
        creatorUserId: user.id,
        betAmount,
        diceCount,
        idempotencyKey: buildTelegramIdempotencyKey(updateId, "create_game"),
      });

      await telegramWebhookService.sendMessage(
        chatId,
        `Игра создана! 🎲\n\nКод игры: ${game.publicCode}\nСтавка: ${betAmount} монет\nКубики: ${diceCount}\n\nОтправьте противнику: /join ${game.publicCode}`,
      );
      return { status: "ok", action: "command_play", updateId };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const userMsg = errMsg.includes("Insufficient")
        ? "Недостаточно средств на балансе."
        : `Ошибка создания игры: ${errMsg}`;
      await telegramWebhookService.sendMessage(chatId, userMsg);
      return { status: "error", reason: errMsg, updateId };
    }
  }

  private async handleJoinCommand(
    user: { id: number; status: string; username?: string | null },
    chatId: number,
    args: string[],
    updateId: number,
  ): Promise<WebhookHandlerResult> {
    if (user.status !== "active") {
      await telegramWebhookService.sendMessage(chatId, "Ваш аккаунт заблокирован. Вступление в игру недоступно.");
      return { status: "ignored", reason: "user_not_active", updateId };
    }

    const publicCode = args[0]?.toUpperCase();
    if (!publicCode) {
      await telegramWebhookService.sendMessage(chatId, "Укажите код игры: /join КОД");
      return { status: "ignored", reason: "missing_game_code", updateId };
    }

    try {
      const game = await gameService.joinGame({
        publicCode,
        opponentUserId: user.id,
        idempotencyKey: buildTelegramIdempotencyKey(updateId, "join_game"),
      });

      const displayName = user.username ? `@${user.username}` : "Противник";
      await telegramWebhookService.sendMessage(
        chatId,
        `Вы вступили в игру! 🎲\nСтавка: ${game.betAmount} монет. Отправляйте кубик 🎲`,
      );
      await this.notifyUser(
        game.creatorUserId,
        `${displayName} вступил в игру! Ставка: ${game.betAmount} монет. Бросайте кубик 🎲`,
      );
      return { status: "ok", action: "command_join", updateId };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const userMsg = errMsg.includes("not found")
        ? "Игра с таким кодом не найдена."
        : errMsg.includes("expired")
        ? "Время игры истекло."
        : errMsg.includes("not waiting")
        ? "Игра уже началась или завершена."
        : errMsg.includes("own game")
        ? "Нельзя вступить в свою игру."
        : errMsg.includes("Insufficient")
        ? "Недостаточно средств на балансе."
        : `Ошибка: ${errMsg}`;
      await telegramWebhookService.sendMessage(chatId, userMsg);
      return { status: "error", reason: errMsg, updateId };
    }
  }

  private async handleCancelCommand(
    user: { id: number },
    chatId: number,
    updateId: number,
  ): Promise<WebhookHandlerResult> {
    const activeGame = await this.findActiveGameForUser(user.id);
    if (!activeGame) {
      await telegramWebhookService.sendMessage(chatId, "Нет активной игры для отмены.");
      return { status: "ignored", reason: "no_active_game", updateId };
    }

    if (activeGame.creatorUserId !== user.id) {
      await telegramWebhookService.sendMessage(chatId, "Отменить можно только свою игру.");
      return { status: "ignored", reason: "not_creator", updateId };
    }

    if (activeGame.status !== GameStatus.waiting) {
      await telegramWebhookService.sendMessage(
        chatId,
        "Отменить можно только игру в статусе ожидания (до вступления противника).",
      );
      return { status: "ignored", reason: "game_not_cancellable", updateId };
    }

    try {
      await gameService.cancelWaitingGame({
        gameId: activeGame.id,
        requesterUserId: user.id,
        idempotencyKey: buildTelegramIdempotencyKey(updateId, "cancel_game"),
      });
      await telegramWebhookService.sendMessage(
        chatId,
        `Игра отменена. ${activeGame.betAmount} монет возвращено на баланс.`,
      );
      return { status: "ok", action: "command_cancel", updateId };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await telegramWebhookService.sendMessage(chatId, `Ошибка отмены игры: ${errMsg}`);
      return { status: "error", reason: errMsg, updateId };
    }
  }

  private async handleBalanceCommand(
    user: { id: number },
    chatId: number,
    updateId: number,
  ): Promise<WebhookHandlerResult> {
    const wallet = await walletService.getWalletByUserId(user.id);
    const text =
      `Ваш баланс:\n` +
      `💰 Доступно: ${wallet.availableBalance} монет\n` +
      `🔒 Заблокировано: ${wallet.lockedBalance} монет`;
    await telegramWebhookService.sendMessage(chatId, text);
    return { status: "ok", action: "command_balance", updateId };
  }

  // ─── User upsert ───────────────────────────────────────────────────────────

  private async upsertUser(
    telegramUserId: number,
    username: string | undefined,
    chatId: number,
    updateId: number,
  ) {
    const telegramUserIdStr = String(telegramUserId);
    const chatIdBigInt = BigInt(chatId);

    const existing = await prisma.user.findUnique({
      where: { telegramUserId: telegramUserIdStr },
    });

    if (existing) {
      const usernameChanged = username !== undefined && existing.username !== username;
      const chatIdChanged = existing.telegramChatId !== chatIdBigInt;

      if (usernameChanged || chatIdChanged) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            ...(usernameChanged ? { username } : {}),
            ...(chatIdChanged ? { telegramChatId: chatIdBigInt } : {}),
          },
        });

        if (usernameChanged) {
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
      }

      return existing;
    }

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        telegramUserId: telegramUserIdStr,
        telegramChatId: chatIdBigInt,
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

  // ─── Notify helper ──────────────────────────────────────────────────────────

  private async notifyUser(userId: number, text: string): Promise<void> {
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true },
    });
    if (!userRecord?.telegramChatId) return;
    await telegramWebhookService.sendMessage(Number(userRecord.telegramChatId), text);
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

  private async tryAutoResolve(gameId: number): Promise<{ outcome: "winner_determined" | "tie_requires_reroll" } | null> {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { gamePlayers: true },
    });

    if (!game || game.gamePlayers.length !== 2) return null;
    if (game.status !== GameStatus.rolling && game.status !== GameStatus.resolving) return null;

    // Check if both players rolled in latest round
    const latestRoll = await prisma.diceRoll.findFirst({
      where: { gameId },
      orderBy: [{ rollRound: "desc" }, { createdAt: "desc" }],
    });
    if (!latestRoll) return null;

    const roundRolls = await prisma.diceRoll.findMany({
      where: { gameId, rollRound: latestRoll.rollRound },
    });

    if (roundRolls.length < 2) return null;

    // Both rolled — resolve
    const resolveResult = await gameService.resolveGame({ gameId });

    if (resolveResult.outcome === "winner_determined") {
      await gameService.settleGame({
        gameId,
        idempotencyKey: `game:auto_settle:${gameId}:round_${resolveResult.rollRound}`,
      });
    }

    return { outcome: resolveResult.outcome };
  }
}

export const telegramWebhookHandler = new TelegramWebhookHandler();
