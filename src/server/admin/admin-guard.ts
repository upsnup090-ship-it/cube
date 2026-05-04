import { cookies, headers } from "next/headers";

export type AdminGuardMode = "off" | "token";

export type AdminGuardDecision = {
  allowed: boolean;
  mode: AdminGuardMode;
  reason: "guard_off" | "token_missing" | "token_invalid" | "token_ok";
};

const ADMIN_GUARD_COOKIE = "admin_guard_token";
const ADMIN_GUARD_HEADER = "x-admin-guard-token";

function resolveMode(): AdminGuardMode {
  return process.env.ADMIN_GUARD_MODE === "token" ? "token" : "off";
}

export async function resolveAdminGuardDecision(): Promise<AdminGuardDecision> {
  const mode = resolveMode();
  if (mode === "off") {
    return { allowed: true, mode, reason: "guard_off" };
  }

  const expectedToken = process.env.ADMIN_GUARD_TOKEN;
  if (!expectedToken) {
    return { allowed: false, mode, reason: "token_missing" };
  }

  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieToken = cookieStore.get(ADMIN_GUARD_COOKIE)?.value;
  const headerToken = headerStore.get(ADMIN_GUARD_HEADER);
  const provided = cookieToken ?? headerToken;

  if (!provided) {
    return { allowed: false, mode, reason: "token_missing" };
  }

  if (provided !== expectedToken) {
    return { allowed: false, mode, reason: "token_invalid" };
  }

  return { allowed: true, mode, reason: "token_ok" };
}

export { ADMIN_GUARD_COOKIE };
