/**
 * Smoke check for env validation.
 * Run: npx tsx src/server/config/env-validation-smoke-check.ts
 */

import { validateEnv } from "./env-validation";

async function main() {
  const checks: { name: string; passed: boolean; details: string }[] = [];

  const add = (name: string, passed: boolean, details: string) => {
    checks.push({ name, passed, details });
    console.log(`[${passed ? "PASS" : "FAIL"}] ${name} - ${details}`);
  };

  // Test 1: dev mode with missing vars — should return valid=true with warnings
  const origNodeEnv = process.env.NODE_ENV;
  const origDbUrl = process.env.DATABASE_URL;
  const origBotToken = process.env.TELEGRAM_BOT_TOKEN;

  delete process.env.NODE_ENV;
  delete process.env.DATABASE_URL;
  delete process.env.TELEGRAM_BOT_TOKEN;

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
  process.env.NODE_ENV = "production";
  const prodResult = validateEnv();
  add(
    "prod mode: invalid with missing vars",
    prodResult.valid === false,
    `valid=${prodResult.valid}, missing=${prodResult.missing.join(",")}`,
  );

  // Test 3: production mode with all vars — should return valid=true
  process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
  process.env.TELEGRAM_BOT_TOKEN = "test-token";
  process.env.TELEGRAM_WEBHOOK_SECRET = "test-secret";
  process.env.ADMIN_USERNAME = "admin";
  process.env.ADMIN_PASSWORD = "password";
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
  delete process.env.DIRECT_URL;
  const warnResult = validateEnv();
  add(
    "warns about missing DIRECT_URL",
    warnResult.warnings.some(w => w.includes("DIRECT_URL")),
    `warnings=${warnResult.warnings.length}`,
  );

  // Restore
  if (origNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = origNodeEnv;
  }
  if (origDbUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = origDbUrl;
  }
  if (origBotToken === undefined) {
    delete process.env.TELEGRAM_BOT_TOKEN;
  } else {
    process.env.TELEGRAM_BOT_TOKEN = origBotToken;
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
