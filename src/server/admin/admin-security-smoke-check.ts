import { isReadOnlyPage, isForbiddenAction, isAllowedAction, ADMIN_READ_ONLY_CONTRACT } from "@/app/admin/read-only-guard";

type Check = { name: string; passed: boolean; details: string };

function main() {
  const checks: Check[] = [];
  const add = (name: string, passed: boolean, details: string) => {
    checks.push({ name, passed, details });
    console.log(`[${passed ? "PASS" : "FAIL"}] ${name} - ${details}`);
  };

  // ─── Read-only guard tests ──────────────────────────────────────────────────

  add(
    "GET /admin is read-only allowed",
    isReadOnlyPage("/admin", "GET") === true,
    String(isReadOnlyPage("/admin", "GET")),
  );

  add(
    "POST /admin is NOT read-only allowed",
    isReadOnlyPage("/admin", "POST") === false,
    String(isReadOnlyPage("/admin", "POST")),
  );

  add(
    "GET /admin/users is read-only allowed",
    isReadOnlyPage("/admin/users", "GET") === true,
    String(isReadOnlyPage("/admin/users", "GET")),
  );

  add(
    "GET /admin/games is read-only allowed",
    isReadOnlyPage("/admin/games", "GET") === true,
    String(isReadOnlyPage("/admin/games", "GET")),
  );

  add(
    "GET /admin/ledger is read-only allowed",
    isReadOnlyPage("/admin/ledger", "GET") === true,
    String(isReadOnlyPage("/admin/ledger", "GET")),
  );

  add(
    "GET /admin/audit is read-only allowed",
    isReadOnlyPage("/admin/audit", "GET") === true,
    String(isReadOnlyPage("/admin/audit", "GET")),
  );

  add(
    "Unknown path is NOT read-only allowed",
    isReadOnlyPage("/admin/unknown", "GET") === false,
    String(isReadOnlyPage("/admin/unknown", "GET")),
  );

  // ─── Forbidden actions ──────────────────────────────────────────────────────

  add(
    "POST /admin/users/:id/credit is forbidden",
    isForbiddenAction("/admin/users/:id/credit", "POST") === true,
    String(isForbiddenAction("/admin/users/:id/credit", "POST")),
  );

  add(
    "POST /admin/games/:id/settle is forbidden",
    isForbiddenAction("/admin/games/:id/settle", "POST") === true,
    String(isForbiddenAction("/admin/games/:id/settle", "POST")),
  );

  add(
    "POST /admin/manual-adjustment is forbidden",
    isForbiddenAction("/admin/manual-adjustment", "POST") === true,
    String(isForbiddenAction("/admin/manual-adjustment", "POST")),
  );

  // ─── Allowed actions ────────────────────────────────────────────────────────

  add(
    "GET /admin/users is allowed",
    isAllowedAction("/admin/users", "GET") === true,
    String(isAllowedAction("/admin/users", "GET")),
  );

  add(
    "GET /admin/games is allowed",
    isAllowedAction("/admin/games", "GET") === true,
    String(isAllowedAction("/admin/games", "GET")),
  );

  add(
    "POST /admin/users is NOT allowed",
    isAllowedAction("/admin/users", "POST") === false,
    String(isAllowedAction("/admin/users", "POST")),
  );

  // ─── Contract integrity ─────────────────────────────────────────────────────

  add(
    "Contract has 8 allowed pages",
    ADMIN_READ_ONLY_CONTRACT.allowedPages.length === 8,
    String(ADMIN_READ_ONLY_CONTRACT.allowedPages.length),
  );

  add(
    "Contract has forbidden actions",
    ADMIN_READ_ONLY_CONTRACT.forbiddenActions.length > 0,
    String(ADMIN_READ_ONLY_CONTRACT.forbiddenActions.length),
  );

  add(
    "All allowed pages are GET-only",
    ADMIN_READ_ONLY_CONTRACT.allowedPages.every(p => p.allowedMethods.length === 1 && p.allowedMethods[0] === "GET"),
    String(ADMIN_READ_ONLY_CONTRACT.allowedPages.every(p => p.allowedMethods.length === 1)),
  );

  add(
    "All allowed pages are readOnly=true",
    ADMIN_READ_ONLY_CONTRACT.allowedPages.every(p => p.readOnly === true),
    String(ADMIN_READ_ONLY_CONTRACT.allowedPages.every(p => p.readOnly)),
  );

  // ─── Summary ────────────────────────────────────────────────────────────────

  const failed = checks.filter(c => !c.passed);
  console.log(`\n=== Admin Security Smoke Summary ===`);
  console.log(`Total: ${checks.length}`);
  console.log(`Passed: ${checks.length - failed.length}`);
  console.log(`Failed: ${failed.length}`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
