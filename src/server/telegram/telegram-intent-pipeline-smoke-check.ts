import prisma from "../db/prisma";
import { telegramWebhookService } from "./telegram-webhook-service";
import { routeTelegramParsedUpdate } from "./telegram-intent-router";

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

  const start = routeTelegramParsedUpdate(telegramWebhookService.parseUpdate({
    update_id: 1,
    message: { message_id: 100, from: { id: 42 }, chat: { id: 500 }, date: 1710000000, text: "/start" },
  }));
  add("Route /start -> start intent", start.kind === "intent" && start.intent.kind === "start", `kind=${start.kind}`);

  const help = routeTelegramParsedUpdate(telegramWebhookService.parseUpdate({
    update_id: 2,
    message: { message_id: 101, from: { id: 42 }, chat: { id: 500 }, date: 1710000001, text: "/help" },
  }));
  add("Route /help -> help intent", help.kind === "intent" && help.intent.kind === "help", `kind=${help.kind}`);

  const createOk = routeTelegramParsedUpdate(telegramWebhookService.parseUpdate({
    update_id: 3,
    message: { message_id: 102, from: { id: 42 }, chat: { id: 500 }, date: 1710000002, text: "/create 100" },
  }));
  add(
    "Route /create 100 -> create_game intent",
    createOk.kind === "intent" && createOk.intent.kind === "create_game" && createOk.intent.amount === 100n,
    `kind=${createOk.kind}`,
  );

  const joinOk = routeTelegramParsedUpdate(telegramWebhookService.parseUpdate({
    update_id: 4,
    message: { message_id: 103, from: { id: 42 }, chat: { id: 500 }, date: 1710000003, text: "/join ABC123" },
  }));
  add(
    "Route /join ABC123 -> join_game intent",
    joinOk.kind === "intent" && joinOk.intent.kind === "join_game" && joinOk.intent.publicCode === "ABC123",
    `kind=${joinOk.kind}`,
  );

  const dice = routeTelegramParsedUpdate(telegramWebhookService.parseUpdate({
    update_id: 5,
    message: { message_id: 104, from: { id: 42 }, chat: { id: 500 }, date: 1710000004, dice: { emoji: "\u{1F3B2}", value: 6 } },
  }));
  add("Route dice -> dice_roll intent", dice.kind === "intent" && dice.intent.kind === "dice_roll", `kind=${dice.kind}`);

  const unknown = routeTelegramParsedUpdate(telegramWebhookService.parseUpdate({
    update_id: 6,
    message: { message_id: 105, from: { id: 42 }, chat: { id: 500 }, date: 1710000005, text: "hello there" },
  }));
  add("Route unknown text -> unknown intent", unknown.kind === "intent" && unknown.intent.kind === "unknown", `kind=${unknown.kind}`);

  const invalid = routeTelegramParsedUpdate(telegramWebhookService.parseUpdate({ foo: "bar" }));
  add("Invalid update handled safely", invalid.kind === "intent" && invalid.intent.kind === "invalid_update", `kind=${invalid.kind}`);

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
  console.log("=== Telegram Intent Pipeline Smoke Summary ===");
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
  console.error(`[FAIL] Telegram intent smoke error: ${message}`);
  process.exit(1);
});
