import "dotenv/config";
import { PrismaClient } from "../../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

/**
 * Create a PrismaClient connected to Postgres via @prisma/adapter-pg.
 *
 * DATABASE_URL (pooled via pgbouncer) is preferred for runtime;
 * DIRECT_URL (direct connection) is used as fallback.
 * At least one must be set — the app will not start without a Postgres URL.
 */
function createPrismaClient(): PrismaClient {
  const pgUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!pgUrl) {
    throw new Error(
      "[prisma] DATABASE_URL or DIRECT_URL is required. " +
      "Set up a Postgres instance (e.g. Supabase) and add the connection string to .env.",
    );
  }
  const pool = new pg.Pool({ connectionString: pgUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter } as never);
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Lazy proxy: the real PrismaClient is created only on first property access,
 * not at module-import time. This prevents next build from crashing during
 * "Collecting page data" when dev.db does not exist in the build environment.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
    }
    const value = (globalForPrisma.prisma as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(globalForPrisma.prisma);
    }
    return value;
  },
});

export default prisma;