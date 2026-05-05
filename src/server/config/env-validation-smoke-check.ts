/**
 * Smoke check for env validation.
 * Run: npx tsx src/server/config/env-validation-smoke-check.ts
 */

import { validateEnv } from "./env-validation";

async function main() {
  const checks: { name: string; passed: boolean; details: string }[] = [];
  const env = process.env as Record<string, string | undefined>;

  const add = (name: string, passed: boolean, details: string) => {
    checks.push({ name, passed, details });
    console.log(`[${passed ? "PASS" : "FAIL"}] ${name} - ${details}`);
  };

  // Test 1: dev mode with missing vars — should return valid=true with warnings
  const origNodeEnv = env.NODE_ENV;
  const origDbUrl = env.DATABASE_URL;
  const origBotToken = env.TELEGRAM_BOT_TOKEN;
  const origWebhookSecret = env.TELEGRAM_WEBHOOK_SECRET;
  const origAdminUsername = env.ADMIN_USERNAME;
  const origAdminPassword = env.ADMIN_PASSWORD;
  const origDirectUrl = env.DIRECT_URL;

  delete env.NODE_ENV;
  delete env.DATABASE_URL;
  delete env.TELEGRAM_BOT_TOKEN;

  const devResult = validateEnv();
  add(
    "dev mode: valid even with missing vars",
    devResult.valid === true,
    `valid=${devResult.valid}, missing=${devResult.missing.join(",")}`,
  );
  add(
    "dev mode: reports missing vars",
    devResult.missing.length > 0,
    `missing count=${devResult.missing.length}`,
  );

  // Test 2: production mode with missing vars — should return valid=false
  env.NODE_ENV = "production";
  const prodResult = validateEnv();
  add(
    "prod mode: invalid with missing vars",
    prodResult.valid === false,
    `valid=${prodResult.valid}, missing=${prodResult.missing.join(",")}`,
  );

  // Test 3: production mode with all vars — should return valid=true
  env.DATABASE_URL = "postgresql://test:test@localhost/test";
  env.TELEGRAM_BOT_TOKEN = "test-token";
  env.TELEGRAM_WEBHOOK_SECRET = "test-secret";
  env.ADMIN_USERNAME = "admin";
  env.ADMIN_PASSWORD = "password";
  const prodFullResult = validateEnv();
  add(
    "prod mode: valid with all required vars",
    prodFullResult.valid === true,
    `valid=${prodFullResult.valid}, missing=${prodFullResult.missing.length}`,
  );
  add(
    "prod mode: no missing vars when all set",
    prodFullResult.missing.length === 0,
    `missing count=${prodFullResult.missing.length}`,
  );

  // Test 4: DIRECT_URL warning
  delete env.DIRECT_URL;
  const warnResult = validateEnv();
  add(
    "warns about missing DIRECT_URL",
    warnResult.warnings.some(w => w.includes("DIRECT_URL")),
    `warnings=${warnResult.warnings.length}`,
  );

  // Restore
  if (origNodeEnv === undefined) {
    delete env.NODE_ENV;
  } else {
    env.NODE_ENV = origNodeEnv;
  }
  if (origDbUrl === undefined) {
    delete env.DATABASE_URL;
  } else {
    env.DATABASE_URL = origDbUrl;
  }
  if (origBotToken === undefined) {
    delete env.TELEGRAM_BOT_TOKEN;
  } else {
    env.TELEGRAM_BOT_TOKEN = origBotToken;
  }
  if (origWebhookSecret === undefined) {
    delete env.TELEGRAM_WEBHOOK_SECRET;
  } else {
    env.TELEGRAM_WEBHOOK_SECRET = origWebhookSecret;
  }
  if (origAdminUsername === undefined) {
    delete env.ADMIN_USERNAME;
  } else {
    env.ADMIN_USERNAME = origAdminUsername;
  }
  if (origAdminPassword === undefined) {
    delete env.ADMIN_PASSWORD;
  } else {
    env.ADMIN_PASSWORD = origAdminPassword;
  }
  if (origDirectUrl === undefined) {
    delete env.DIRECT_URL;
  } else {
    env.DIRECT_URL = origDirectUrl;
  }

  const failed = checks.filter(c => !c.passed);
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length > 0) {
    console.error("FAILED:", failed.map(c => c.name).join(", "));
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
