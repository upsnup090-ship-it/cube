import { PrismaClient, LedgerEntryType, LedgerDirection } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

/**
 * Development seed script.
 *
 * Creates three demo users (creator, opponent, admin) with deterministic
 * telegramUserId values. For each user a wallet is upserted and an initial
 * `admin_credit` ledger entry is created to reflect the wallet balance.
 *
 * The script is idempotent – it uses `upsert` for users and wallets and
 * `upsert` for ledger entries keyed by a stable `idempotencyKey`. Running the
 * script multiple times will not duplicate any records.
 *
 * Requires DATABASE_URL or DIRECT_URL pointing to a Postgres instance.
 */

function createPrismaClient(): PrismaClient {
  const pgUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!pgUrl) {
    throw new Error("DATABASE_URL or DIRECT_URL is required to run seed.");
  }
  const pool = new pg.Pool({ connectionString: pgUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter } as never);
}

const prisma = createPrismaClient();

// Demo configuration – can be adjusted for local testing.
const DEMO_BALANCE = 1_000n; // using BigInt as defined in the schema

const demoUsers = [
  {
    telegramUserId: "demo_creator_001",
    username: "demo_creator",
    displayName: "Demo Creator",
  },
  {
    telegramUserId: "demo_opponent_001",
    username: "demo_opponent",
    displayName: "Demo Opponent",
  },
  {
    telegramUserId: "demo_admin_001",
    username: "demo_admin",
    displayName: "Demo Admin",
  },
];

async function main() {
  for (const userData of demoUsers) {
    // Upsert user by unique telegramUserId
    const user = await prisma.user.upsert({
      where: { telegramUserId: userData.telegramUserId },
      update: {},
      create: {
        telegramUserId: userData.telegramUserId,
        username: userData.username,
        displayName: userData.displayName,
        status: "active",
      },
    });

    // Upsert wallet – keep existing balances if already present
    const wallet = await prisma.wallet.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        currency: "COIN",
        availableBalance: DEMO_BALANCE,
        lockedBalance: 0n,
      },
    });

    // Ensure ledger entry exists for the initial credit
    const idempotencyKey = `seed:admin_credit:${userData.telegramUserId}`;
    await prisma.ledgerEntry.upsert({
      where: { idempotencyKey },
      update: {},
      create: {
        transactionId: `seed-${userData.telegramUserId}`,
        userId: user.id,
        walletId: wallet.id,
        entryType: LedgerEntryType.admin_credit,
        direction: LedgerDirection.credit,
        amount: DEMO_BALANCE,
        currency: "COIN",
        idempotencyKey,
        metadata: {},
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
