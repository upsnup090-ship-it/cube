import { NextRequest, NextResponse } from "next/server";
import { telegramWebhookService } from "@/server/telegram/telegram-webhook-service";

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

  const parsed = telegramWebhookService.parseUpdate(payload);

  if (!configuredSecret) {
    return NextResponse.json({
      ok: true,
      mode: "stub_no_secret_configured",
      handled: false,
      result: parsed.kind,
    });
  }

  return NextResponse.json({
    ok: true,
    mode: "stub_secret_verified",
    handled: false,
    result: parsed.kind,
  });
}
