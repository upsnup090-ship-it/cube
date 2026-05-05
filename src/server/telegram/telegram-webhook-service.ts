import type { TelegramMessage, TelegramUpdate } from "./telegram-types";

// ─── Idempotency key ────────────────────────────────────────────────────────
// Format: tg:update:<update_id>
// Derived keys: tg:update:<update_id>:dice_roll, tg:update:<update_id>:user_upsert
export function buildTelegramIdempotencyKey(updateId: number, suffix?: string): string {
  const base = `tg:update:${updateId}`;
  return suffix ? `${base}:${suffix}` : base;
}

// ─── Dice acceptance rules ──────────────────────────────────────────────────
// Only standard dice emoji is accepted for PvP Dices game.
// Other Telegram dice (🎯🏀⚽🎳🎰) are ignored.
export const ACCEPTED_DICE_EMOJI = "🎲";
export const DICE_VALUE_MIN = 1;
export const DICE_VALUE_MAX = 6;

export function isAcceptedDiceEmoji(emoji: string): boolean {
  return emoji === ACCEPTED_DICE_EMOJI;
}

export function isValidDiceValue(value: number): boolean {
  return Number.isInteger(value) && value >= DICE_VALUE_MIN && value <= DICE_VALUE_MAX;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type TelegramCommandType = "start" | "help";

export type TelegramCommandResult =
  | { kind: "command"; command: TelegramCommandType; message: TelegramMessage }
  | { kind: "unknown_text"; text: string; message: TelegramMessage }
  | { kind: "not_text" };

export type TelegramDiceResult =
  | {
      kind: "dice";
      message: TelegramMessage;
      payload: {
        messageId: number;
        userId?: number;
        chatId: number;
        date: number;
        emoji: string;
        value: number;
      };
    }
  | { kind: "not_dice" };

export type TelegramParsedUpdate =
  | { kind: "invalid_update"; reason: string }
  | { kind: "non_message_update"; updateId: number }
  | { kind: "dice"; updateId: number; data: TelegramDiceResult & { kind: "dice" } }
  | { kind: "command"; updateId: number; data: TelegramCommandResult & { kind: "command" } }
  | { kind: "unknown_text"; updateId: number; data: TelegramCommandResult & { kind: "unknown_text" } }
  | { kind: "message_ignored"; updateId: number };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toTelegramUpdate(input: unknown): TelegramUpdate | null {
  if (!isObject(input)) return null;
  const rawUpdateId = input.update_id;
  if (typeof rawUpdateId !== "number") return null;

  const rawMessage = input.message;
  if (rawMessage === undefined) {
    return { update_id: rawUpdateId };
  }
  if (!isObject(rawMessage)) return null;

  const rawMessageId = rawMessage.message_id;
  const rawDate = rawMessage.date;
  const rawChat = rawMessage.chat;

  if (typeof rawMessageId !== "number" || typeof rawDate !== "number" || !isObject(rawChat)) {
    return null;
  }

  const chatId = rawChat.id;
  if (typeof chatId !== "number") return null;

  const text = typeof rawMessage.text === "string" ? rawMessage.text : undefined;
  const from = isObject(rawMessage.from) && typeof rawMessage.from.id === "number"
    ? {
        id: rawMessage.from.id,
        username: typeof rawMessage.from.username === "string" ? rawMessage.from.username : undefined,
      }
    : undefined;

  const dice = isObject(rawMessage.dice)
    && typeof rawMessage.dice.emoji === "string"
    && typeof rawMessage.dice.value === "number"
    ? { emoji: rawMessage.dice.emoji, value: rawMessage.dice.value }
    : undefined;

  const message: TelegramMessage = {
    message_id: rawMessageId,
    from,
    chat: {
      id: chatId,
      type: typeof rawChat.type === "string" ? rawChat.type : undefined,
    },
    date: rawDate,
    text,
    dice,
  };

  return { update_id: rawUpdateId, message };
}

export class TelegramWebhookService {
  parseUpdate(update: unknown): TelegramParsedUpdate {
    const parsed = toTelegramUpdate(update);
    if (!parsed) {
      return { kind: "invalid_update", reason: "Malformed update payload" };
    }

    if (!parsed.message) {
      return { kind: "non_message_update", updateId: parsed.update_id };
    }

    const dice = this.detectDiceRoll(parsed);
    if (dice.kind === "dice") {
      return { kind: "dice", updateId: parsed.update_id, data: dice };
    }

    const command = this.detectCommand(parsed);
    if (command.kind === "command") {
      return { kind: "command", updateId: parsed.update_id, data: command };
    }
    if (command.kind === "unknown_text") {
      return { kind: "unknown_text", updateId: parsed.update_id, data: command };
    }

    return { kind: "message_ignored", updateId: parsed.update_id };
  }

  detectDiceRoll(update: TelegramUpdate): TelegramDiceResult {
    if (!update.message?.dice) {
      return { kind: "not_dice" };
    }

    if (!isAcceptedDiceEmoji(update.message.dice.emoji)) {
      return { kind: "not_dice" };
    }

    if (!isValidDiceValue(update.message.dice.value)) {
      return { kind: "not_dice" };
    }

    return {
      kind: "dice",
      message: update.message,
      payload: {
        messageId: update.message.message_id,
        userId: update.message.from?.id,
        chatId: update.message.chat.id,
        date: update.message.date,
        emoji: update.message.dice.emoji,
        value: update.message.dice.value,
      },
    };
  }

  detectCommand(update: TelegramUpdate): TelegramCommandResult {
    const message = update.message;
    if (!message?.text) {
      return { kind: "not_text" };
    }

    const normalized = message.text.trim().toLowerCase();
    if (normalized === "/start") {
      return { kind: "command", command: "start", message };
    }
    if (normalized === "/help") {
      return { kind: "command", command: "help", message };
    }

    return { kind: "unknown_text", text: message.text, message };
  }
}

export const telegramWebhookService = new TelegramWebhookService();
