/**
 * Environment validation for CubeChat.
 * Called at startup to ensure all required env vars are present.
 * Production: fail-closed if missing. Development: warn only.
 */

export type EnvValidationResult = {
  valid: boolean;
  missing: string[];
  warnings: string[];
};

const REQUIRED_PROD_VARS = [
  "DATABASE_URL",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_WEBHOOK_SECRET",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
] as const;

const OPTIONAL_VARS = [
  "DIRECT_URL",
  "TELEGRAM_API_BASE_URL",
  "TELEGRAM_WEBHOOK_URL",
  "TELEGRAM_PROXY_URL",
  "TELEGRAM_PROXY_KIND",
  "TRUST_PROXY",
  "GAME_COMMISSION_BPS",
  "GAME_COMMISSION_RECIPIENT_TELEGRAM_USER_ID",
  "SUPABASE_PROJECT_REF",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export function validateEnv(): EnvValidationResult {
  const isProduction = process.env.NODE_ENV === "production";
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const varName of REQUIRED_PROD_VARS) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
    warnings.push("DIRECT_URL not set — migrations may fail with pooled DATABASE_URL");
  }

  if (isProduction && missing.length > 0) {
    console.error(
      `[FATAL] Missing required env vars in production: ${missing.join(", ")}`,
    );
    return { valid: false, missing, warnings };
  }

  if (!isProduction && missing.length > 0) {
    console.warn(
      `[WARN] Missing env vars (non-production, continuing): ${missing.join(", ")}`,
    );
  }

  return { valid: true, missing, warnings };
}
