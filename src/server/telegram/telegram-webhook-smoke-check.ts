import prisma from "../db/prisma";
import { telegramWebhookService } from "./telegram-webhook-service";
import { readFile } from "node:fs/promises";

type CheckResult = {
  name: string;
  passed: boolean;
  details: string;
};

async function readFixture(relativePath: string): Promise<unknown> {
  const url = new URL(relativePath, import.meta.url);
  const raw = await readFile(url, "utf8");
  return JSON.parse(raw) as unknown;
}

async function main() {
  const checks: CheckResult[] = [];
  const add = (name: string, passed: boolean, details: string) => {
    checks.push({ name, passed, details });
    console.log(`[${passed ? "PASS" : "FAIL"}] ${name} - ${details}`);
  };

  const beforeCounts = await Promise.all([
    prisma.user.count(),
    prisma.wallet.count(),
    prisma.game.count(),
    prisma.ledgerEntry.count(),
    prisma.auditLog.count(),
    prisma.diceRoll.count(),
    prisma.idempotencyKey.count(),
  ]);

  const startFixture = await readFixture("./fixtures/start-command.json");
  const startResult = telegramWebhookService.parseUpdate(startFixture);
  add("Detect /start command", startResult.kind === "command", `kind=${startResult.kind}`);

  const helpFixture = await readFixture("./fixtures/help-command.json");
  const helpResult = telegramWebhookService.parseUpdate(helpFixture);
  add("Detect /help command", helpResult.kind === "command", `kind=${helpResult.kind}`);

  const diceFixture = await readFixture("./fixtures/dice-roll.json");
  const diceResult = telegramWebhookService.parseUpdate(diceFixture);
  add("Detect dice payload", diceResult.kind === "dice", `kind=${diceResult.kind}`);

  const unknownFixture = await readFixture("./fixtures/unknown-text.json");
  const unknownResult = telegramWebhookService.parseUpdate(unknownFixture);
  add("Unknown text handling", unknownResult.kind === "unknown_text", `kind=${unknownResult.kind}`);

  const invalidResult = telegramWebhookService.parseUpdate({ foo: "bar" });
  add("Invalid update handling", invalidResult.kind === "invalid_update", `kind=${invalidResult.kind}`);

  const emptyResult = telegramWebhookService.parseUpdate({ update_id: 5 });
  add("Empty update handling", emptyResult.kind === "non_message_update", `kind=${emptyResult.kind}`);

  const afterCounts = await Promise.all([
    prisma.user.count(),
    prisma.wallet.count(),
    prisma.game.count(),
    prisma.ledgerEntry.count(),
    prisma.auditLog.count(),
    prisma.diceRoll.count(),
    prisma.idempotencyKey.count(),
  ]);

  const noDbMutation = beforeCounts.every((count, index) => count === afterCounts[index]);
  add("No DB mutation", noDbMutation, noDbMutation ? "counts unchanged" : "counts changed");

  await prisma.$disconnect();

  const failed = checks.filter((check) => !check.passed);
  console.log("");
  console.log("=== Telegram Webhook Smoke Summary ===");
  console.log(`Total: ${checks.length}`);
  console.log(`Passed: ${checks.length - failed.length}`);
  console.log(`Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log("Result: FAIL");
    process.exit(1);
  }

  console.log("Result: PASS");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[FAIL] Telegram smoke error: ${message}`);
  process.exit(1);
});
