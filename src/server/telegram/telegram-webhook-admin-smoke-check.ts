import { setWebhook, getWebhookInfo, deleteWebhook } from "./telegram-webhook-admin";

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

  // Test 1: Missing token
  delete process.env.TELEGRAM_BOT_TOKEN;
  const noTokenResult = await setWebhook("https://example.com/webhook");
  add(
    "setWebhook without token returns error",
    noTokenResult.ok === false && noTokenResult.error === "TELEGRAM_BOT_TOKEN is not configured",
    JSON.stringify(noTokenResult),
  );

  // Setup mock
  process.env.TELEGRAM_BOT_TOKEN = "test-token";
  process.env.TELEGRAM_API_BASE_URL = "https://telegram-proxy.example";

  let lastUrl = "";
  let lastBody: Record<string, unknown> = {};

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    lastUrl = String(input);
    lastBody = typeof init?.body === "string" ? JSON.parse(init.body) as Record<string, unknown> : {};
    return new Response(JSON.stringify({ ok: true, result: { url: lastBody.url ?? "ok" } }), { status: 200 });
  };

  // Test 2: setWebhook
  const setResult = await setWebhook("https://example.com/webhook", "my-secret");
  add(
    "setWebhook calls correct URL and body",
    lastUrl === "https://telegram-proxy.example/bottest-token/setWebhook"
      && lastBody.url === "https://example.com/webhook"
      && lastBody.secret_token === "my-secret"
      && setResult.ok === true,
    JSON.stringify({ lastUrl, lastBody, setResult }),
  );

  // Test 3: getWebhookInfo
  const infoResult = await getWebhookInfo();
  add(
    "getWebhookInfo calls correct URL",
    lastUrl === "https://telegram-proxy.example/bottest-token/getWebhookInfo"
      && infoResult.ok === true,
    JSON.stringify({ lastUrl, infoResult }),
  );

  // Test 4: deleteWebhook
  const deleteResult = await deleteWebhook(true);
  add(
    "deleteWebhook calls correct URL with drop_pending_updates",
    lastUrl === "https://telegram-proxy.example/bottest-token/deleteWebhook"
      && lastBody.drop_pending_updates === true
      && deleteResult.ok === true,
    JSON.stringify({ lastUrl, lastBody, deleteResult }),
  );

  // Restore
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
  console.log(`\n=== Webhook Admin Smoke Summary ===`);
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
