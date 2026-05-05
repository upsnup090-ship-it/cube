import { getTelegramApiBaseUrl } from "./telegram-webhook-service";

type WebhookAdminResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

async function callTelegramApi(method: string, body?: Record<string, unknown>): Promise<WebhookAdminResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN is not configured" };
  }

  const apiBaseUrl = getTelegramApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    return {
      ok: false,
      error: typeof payload === "object" && payload !== null && "description" in payload
        ? String(payload.description)
        : `Telegram API responded with ${response.status}`,
    };
  }

  return { ok: true, data: payload };
}

export async function setWebhook(url: string, secretToken?: string): Promise<WebhookAdminResult> {
  const body: Record<string, unknown> = { url };
  if (secretToken) {
    body.secret_token = secretToken;
  }
  return callTelegramApi("setWebhook", body);
}

export async function getWebhookInfo(): Promise<WebhookAdminResult> {
  return callTelegramApi("getWebhookInfo");
}

export async function deleteWebhook(dropPendingUpdates = false): Promise<WebhookAdminResult> {
  return callTelegramApi("deleteWebhook", { drop_pending_updates: dropPendingUpdates });
}

// ─── CLI entry point ────────────────────────────────────────────────────────

async function main() {
  const command = process.argv[2];
  if (!command) {
    console.log("Usage: tsx telegram-webhook-admin.ts <set|info|delete> [url] [secret]");
    process.exit(1);
  }

  let result: WebhookAdminResult;

  switch (command) {
    case "set": {
      const url = process.argv[3] ?? process.env.TELEGRAM_WEBHOOK_URL;
      if (!url) {
        console.error("URL is required. Pass as argument or set TELEGRAM_WEBHOOK_URL env var.");
        process.exit(1);
      }
      const secret = process.argv[4] ?? process.env.TELEGRAM_WEBHOOK_SECRET;
      result = await setWebhook(url, secret);
      break;
    }
    case "info":
      result = await getWebhookInfo();
      break;
    case "delete":
      result = await deleteWebhook();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }
}

const isMainModule = process.argv[1]?.endsWith("telegram-webhook-admin.ts");
if (isMainModule) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
