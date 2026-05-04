import { NextRequest, NextResponse } from "next/server";
import prisma from "@/server/db/prisma";
import { telegramWebhookService } from "@/server/telegram/telegram-webhook-service";

const TELEGRAM_SECRET_HEADER = "x-telegram-bot-api-secret-token";

/**
 * Telegram webhook entry point.
 *
 * Security model (P0-2):
 *
 * 1. In production, `TELEGRAM_WEBHOOK_SECRET` MUST be set, otherwise we
 *    fail-closed with 503. This prevents an unconfigured deployment from
 *    silently accepting any payload.
 * 2. When a secret is configured, the request must include the matching
 *    header `x-telegram-bot-api-secret-token`. A mismatch returns 401 and
 *    is recorded in the audit log so abuse attempts are visible.
 * 3. In development, requests without a configured secret are accepted in
 *    a stub-only mode. This is documented and safe because the parser
 *    does not write to the database.
 *
 * Future hardening (see action-plan P2-7): IP allowlist for Telegram
 * (149.154.160.0/20, 91.108.4.0/22) and request rate limiting.
 */

async function logUnauthorizedAttempt(reason: string, providedSecretPrefix: string | null) {
  try {
    await prisma.auditLog.create({
      data: {
        actorType: "telegram_webhook",
        action: "webhook_unauthorized",
        resourceType: "webhook",
        metadata: {
          reason,
          // Never log the full secret. First 4 chars only, to help correlate
          // mistaken header configuration vs hostile probing.
          providedSecretPrefix: providedSecretPrefix ? providedSecretPrefix.slice(0, 4) + "***" : null,
        },
      },
    });
  } catch (err) {
    // The audit-log write failing must never block the auth decision.
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[CRITICAL] webhook_unauthorized audit log failed:", msg);
  }
}

/**
 * Constant-time comparison so an attacker cannot learn the secret
 * byte-by-byte from response timing differences.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let mismatch = a.length === b.length ? 0 : 1;
  for (let i = 0; i < len; i++) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    mismatch |= ca ^ cb;
  }
  return mismatch === 0;
}

export async function POST(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === "production";
  const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const headerSecret = request.headers.get(TELEGRAM_SECRET_HEADER);

  // ── 1. Production fail-closed: secret is mandatory ─────────────────────────
  if (isProduction && !configuredSecret) {
    return NextResponse.json(
      { ok: false, error: "Webhook not configured" },
      { status: 503 },
    );
  }

  // ── 2. Secret validation when configured ──────────────────────────────────
  if (configuredSecret) {
    if (!headerSecret) {
      await logUnauthorizedAttempt("missing_secret_header", null);
      return NextResponse.json(
        { ok: false, error: "Missing webhook secret header" },
        { status: 401 },
      );
    }
    if (!timingSafeEqual(headerSecret, configuredSecret)) {
      await logUnauthorizedAttempt("secret_mismatch", headerSecret);
      return NextResponse.json(
        { ok: false, error: "Unauthorized webhook secret" },
        { status: 401 },
      );
    }
  }

  // ── 3. Body parsing (after auth, so unauthorized requests waste no CPU) ────
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = telegramWebhookService.parseUpdate(payload);

  return NextResponse.json({
    ok: true,
    mode: configuredSecret ? "stub_secret_verified" : "stub_no_secret_configured",
    handled: false,
    result: parsed.kind,
  });
}
