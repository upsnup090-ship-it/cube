import prisma from "../db/prisma";
import { telegramWebhookService } from "./telegram-webhook-service";

type CheckResult = {
  name: string;
  passed: boolean;
  details: string;
};

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

  const startResult = telegramWebhookService.parseUpdate({
    update_id: 1,
    message: {
      message_id: 100,
      from: { id: 42, username: "demo_user" },
      chat: { id: 500 },
      date: 1710000000,
      text: "/start",
    },
  });
  add("Detect /start command", startResult.kind === "command", `kind=${startResult.kind}`);

  const helpResult = telegramWebhookService.parseUpdate({
    update_id: 2,
    message: {
      message_id: 101,
      from: { id: 42 },
      chat: { id: 500 },
      date: 1710000001,
      text: "/help",
    },
  });
  add("Detect /help command", helpResult.kind === "command", `kind=${helpResult.kind}`);

  const diceResult = telegramWebhookService.parseUpdate({
    update_id: 3,
    message: {
      message_id: 102,
      from: { id: 42 },
      chat: { id: 500 },
      date: 1710000002,
      dice: { emoji: "🎲", value: 6 },
    },
  });
  add("Detect dice payload", diceResult.kind === "dice", `kind=${diceResult.kind}`);

  const unknownResult = telegramWebhookService.parseUpdate({
    update_id: 4,
    message: {
      message_id: 103,
      from: { id: 42 },
      chat: { id: 500 },
      date: 1710000003,
      text: "hello there",
    },
  });
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
