import type { TelegramParsedUpdate } from "./telegram-webhook-service";

export type TelegramIntent =
  | {
      kind: "start";
      updateId: number;
    }
  | {
      kind: "help";
      updateId: number;
    }
  | {
      kind: "create_game";
      updateId: number;
      amountText: string;
      amount: bigint;
    }
  | {
      kind: "join_game";
      updateId: number;
      publicCode: string;
    }
  | {
      kind: "dice_roll";
      updateId: number;
      payload: {
        messageId: number;
        userId?: number;
        chatId: number;
        date: number;
        emoji: string;
        value: number;
      };
    }
  | {
      kind: "unknown";
      updateId: number;
      text?: string;
      reason: string;
    }
  | {
      kind: "invalid_update";
      reason: string;
    }
  | {
      kind: "non_message_update";
      updateId: number;
    };

export type TelegramRoutingResult =
  | { kind: "intent"; intent: TelegramIntent }
  | { kind: "ignored"; reason: string; updateId?: number };

function parseCreateAmount(text: string): { ok: true; amount: bigint; amountText: string } | { ok: false; reason: string } {
  const parts = text.trim().split(/\s+/g);
  if (parts.length < 2) return { ok: false, reason: "Missing amount" };

  const raw = parts[1].trim();
  if (!/^\d+$/.test(raw)) return { ok: false, reason: "Amount must be an integer" };

  const amount = BigInt(raw);
  if (amount <= 0n) return { ok: false, reason: "Amount must be positive" };

  // Safety limit: keep this intentionally conservative until money rules are defined.
  if (amount > 1_000_000_000n) return { ok: false, reason: "Amount too large" };

  return { ok: true, amount, amountText: raw };
}

function parseJoinCode(text: string): { ok: true; publicCode: string } | { ok: false; reason: string } {
  const parts = text.trim().split(/\s+/g);
  if (parts.length < 2) return { ok: false, reason: "Missing game code" };

  const code = parts[1].trim();
  if (!/^[A-Za-z0-9]{3,16}$/.test(code)) return { ok: false, reason: "Invalid game code format" };

  return { ok: true, publicCode: code.toUpperCase() };
}

/**
 * Pure router: no DB access, no service calls, no side effects.
 *
 * This intentionally does NOT call GameService yet. It only converts parsed Telegram updates
 * into typed intents that can be wired later once user mapping + active-game rules are defined.
 */
export function routeTelegramParsedUpdate(parsed: TelegramParsedUpdate): TelegramRoutingResult {
  if (parsed.kind === "invalid_update") {
    return { kind: "intent", intent: { kind: "invalid_update", reason: parsed.reason } };
  }

  if (parsed.kind === "non_message_update") {
    return { kind: "intent", intent: { kind: "non_message_update", updateId: parsed.updateId } };
  }

  if (parsed.kind === "dice") {
    return {
      kind: "intent",
      intent: { kind: "dice_roll", updateId: parsed.updateId, payload: parsed.data.payload },
    };
  }

  if (parsed.kind === "command") {
    if (parsed.data.command === "start") {
      return { kind: "intent", intent: { kind: "start", updateId: parsed.updateId } };
    }
    if (parsed.data.command === "help") {
      return { kind: "intent", intent: { kind: "help", updateId: parsed.updateId } };
    }

    return { kind: "ignored", reason: "Unsupported command", updateId: parsed.updateId };
  }

  if (parsed.kind === "unknown_text") {
    const raw = parsed.data.text.trim();
    const lower = raw.toLowerCase();

    if (lower.startsWith("/create")) {
      const amountParsed = parseCreateAmount(raw);
      if (!amountParsed.ok) {
        return {
          kind: "intent",
          intent: { kind: "unknown", updateId: parsed.updateId, text: raw, reason: `create_invalid: ${amountParsed.reason}` },
        };
      }

      return {
        kind: "intent",
        intent: {
          kind: "create_game",
          updateId: parsed.updateId,
          amountText: amountParsed.amountText,
          amount: amountParsed.amount,
        },
      };
    }

    if (lower.startsWith("/join")) {
      const codeParsed = parseJoinCode(raw);
      if (!codeParsed.ok) {
        return {
          kind: "intent",
          intent: { kind: "unknown", updateId: parsed.updateId, text: raw, reason: `join_invalid: ${codeParsed.reason}` },
        };
      }

      return {
        kind: "intent",
        intent: { kind: "join_game", updateId: parsed.updateId, publicCode: codeParsed.publicCode },
      };
    }

    return { kind: "intent", intent: { kind: "unknown", updateId: parsed.updateId, text: raw, reason: "unknown_text" } };
  }

  return { kind: "ignored", reason: "message_ignored", updateId: parsed.updateId };
}
