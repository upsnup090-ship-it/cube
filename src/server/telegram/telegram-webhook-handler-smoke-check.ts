import prisma from "../db/prisma";
import { telegramWebhookHandler } from "./telegram-webhook-handler";

type Check = { name: string; passed: boolean; details: string };

async function main() {
  const checks: Check[] = [];
  const add = (name: string, passed: boolean, details: string) => {
    checks.push({ name, passed, details });
    console.log(`[${passed ? "PASS" : "FAIL"}] ${name} - ${details}`);
  };

  // ── Setup: create test user ──
  const user = await prisma.user.upsert({
    where: { telegramUserId: "999" },
    update: {},
    create: { telegramUserId: "999", username: "test_user", status: "active" },
  });
  await prisma.wallet.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, availableBalance: 1000n, lockedBalance: 0n },
  });

  // ── 1. Idempotency: duplicate update ──
  const dicePayload = {
    update_id: 999001,
    message: {
      message_id: 2001, from: { id: 999 }, chat: { id: 500 },
      date: 1710000000, dice: { emoji: "🎲", value: 5 },
    },
  };
  const r1 = await telegramWebhookHandler.handleUpdate(dicePayload);
  const r2 = await telegramWebhookHandler.handleUpdate(dicePayload);
  add("Duplicate update returns duplicate", r2.status === "duplicate", `status=${r2.status}`);

  // ── 2. Wrong emoji ignored ──
  const wrongEmoji = {
    update_id: 999002,
    message: {
      message_id: 2002, from: { id: 999 }, chat: { id: 500 },
      date: 1710000001, dice: { emoji: "🎯", value: 5 },
    },
  };
  const r3 = await telegramWebhookHandler.handleUpdate(wrongEmoji);
  add("Wrong emoji ignored", r3.status === "ignored", `status=${r3.status}`);

  // ── 3. Invalid dice value ignored ──
  const badValue = {
    update_id: 999003,
    message: {
      message_id: 2003, from: { id: 999 }, chat: { id: 500 },
      date: 1710000002, dice: { emoji: "🎲", value: 7 },
    },
  };
  const r4 = await telegramWebhookHandler.handleUpdate(badValue);
  add("Invalid dice value ignored", r4.status === "ignored", `status=${r4.status}`);

  // ── 4. Invalid payload ──
  const r5 = await telegramWebhookHandler.handleUpdate({ foo: "bar" });
  add("Invalid payload error", r5.status === "error", `status=${r5.status}`);

  // ── 5. Non-message update ignored ──
  const r6 = await telegramWebhookHandler.handleUpdate({ update_id: 999004 });
  add("Non-message update ignored", r6.status === "ignored", `status=${r6.status}`);

  // ── 6. Dice without active game ignored ──
  const noGameDice = {
    update_id: 999005,
    message: {
      message_id: 2004, from: { id: 999 }, chat: { id: 500 },
      date: 1710000003, dice: { emoji: "🎲", value: 3 },
    },
  };
  const r7 = await telegramWebhookHandler.handleUpdate(noGameDice);
  add("Dice without active game ignored", r7.status === "ignored", `status=${r7.status}`);

  // ── 7. Command /start ──
  const startPayload = {
    update_id: 999006,
    message: {
      message_id: 2005, from: { id: 999 }, chat: { id: 500 },
      date: 1710000004, text: "/start",
    },
  };
  const r8 = await telegramWebhookHandler.handleUpdate(startPayload);
  add("Command /start handled", r8.status === "ok", `status=${r8.status}`);

  // ── 8. Unknown text ignored ──
  const unknownText = {
    update_id: 999007,
    message: {
      message_id: 2006, from: { id: 999 }, chat: { id: 500 },
      date: 1710000005, text: "hello",
    },
  };
  const r9 = await telegramWebhookHandler.handleUpdate(unknownText);
  add("Unknown text ignored", r9.status === "ignored", `status=${r9.status}`);

  // ── Cleanup ──
  await prisma.idempotencyKey.deleteMany({ where: { key: { startsWith: "tg:update:99900" } } });
  await prisma.$disconnect();

  const failed = checks.filter(c => !c.passed);
  console.log(`\n=== Handler Smoke: ${checks.length - failed.length}/${checks.length} passed ===`);
  if (failed.length > 0) { console.log("FAIL"); process.exit(1); }
  console.log("PASS");
}

main().catch(e => { console.error(e); process.exit(1); });
