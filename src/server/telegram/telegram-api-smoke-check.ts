import { telegramWebhookService } from "./telegram-webhook-service";

type Check = { name: string; passed: boolean; details: string };

async function main() {
  const checks: Check[] = [];
  const add = (name: string, passed: boolean, details: string) => {
    checks.push({ name, passed, details });
    console.log(`[${passed ? "PASS" : "FAIL"}] ${name} - ${details}`);
  };

  const originalToken = process.env.TELEGRAM_BOT_TOKEN;
  const originalApiBaseUrl = process.env.TELEGRAM_API_BASE_URL;
  const originalFetch = globalThis.fetch;

  delete process.env.TELEGRAM_BOT_TOKEN;
  const missingTokenResult = await telegramWebhookService.sendMessage(123, "hello");
  add(
    "Missing token returns error",
    missingTokenResult.ok === false && missingTokenResult.error === "TELEGRAM_BOT_TOKEN is not configured",
    JSON.stringify(missingTokenResult),
  );

  process.env.TELEGRAM_BOT_TOKEN = "test-token";
  process.env.TELEGRAM_API_BASE_URL = "https://telegram-proxy.example";
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    const body = typeof init?.body === "string" ? JSON.parse(init.body) as Record<string, unknown> : {};
    const passed = url === "https://telegram-proxy.example/bottest-token/sendMessage"
      && init?.method === "POST"
      && body.chat_id === 456
      && body.text === "test message";

    if (!passed) {
      return new Response(JSON.stringify({ ok: false, description: "Bad request shape" }), { status: 400 });
    }

    return new Response(JSON.stringify({ ok: true, result: { message_id: 777 } }), { status: 200 });
  };

  const successResult = await telegramWebhookService.sendMessage(456, "test message");
  add(
    "sendMessage calls Telegram API shape",
    successResult.ok === true && successResult.messageId === 777,
    JSON.stringify(successResult),
  );

  globalThis.fetch = originalFetch;
  if (originalToken === undefined) {
    delete process.env.TELEGRAM_BOT_TOKEN;
  } else {
    process.env.TELEGRAM_BOT_TOKEN = originalToken;
  }
  if (originalApiBaseUrl === undefined) {
    delete process.env.TELEGRAM_API_BASE_URL;
  } else {
    process.env.TELEGRAM_API_BASE_URL = originalApiBaseUrl;
  }

  const failed = checks.filter(c => !c.passed);
  console.log(`\n=== Telegram API Smoke Summary ===`);
  console.log(`Total: ${checks.length}`);
  console.log(`Passed: ${checks.length - failed.length}`);
  console.log(`Failed: ${failed.length}`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
