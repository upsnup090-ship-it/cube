import { NextRequest, NextResponse } from "next/server";
import { telegramWebhookHandler } from "@/server/telegram/telegram-webhook-handler";

const TELEGRAM_SECRET_HEADER = "x-telegram-bot-api-secret-token";

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const headerSecret = request.headers.get(TELEGRAM_SECRET_HEADER);

  if (configuredSecret && headerSecret !== configuredSecret) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized webhook secret" },
      { status: 401 },
    );
  }

  // If secret not configured — operate in dry-run mode
  if (!configuredSecret) {
    const dryResult = await telegramWebhookHandler.handleUpdate(payload);
    return NextResponse.json({ ok: true, dryRun: true, result: dryResult });
  }

  // Process update
  const result = await telegramWebhookHandler.handleUpdate(payload);
  const status = result.status === "error" ? 500 : 200;
  return NextResponse.json({ ok: result.status === "ok", result }, { status });
}
