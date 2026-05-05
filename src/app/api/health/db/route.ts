import { NextResponse } from "next/server";
import prisma from "@/server/db/prisma";

export const dynamic = "force-dynamic";

type InvariantCheck = { name: string; passed: boolean; count: number; description: string };

export async function GET() {
  const checks: InvariantCheck[] = [];

  try {
    // 1. available_balance >= 0
    const negativeAvailable = await prisma.wallet.count({
      where: { availableBalance: { lt: 0 } },
    });
    checks.push({
      name: "available_balance_non_negative",
      passed: negativeAvailable === 0,
      count: negativeAvailable,
      description: "No wallet with available_balance < 0",
    });

    // 2. locked_balance >= 0
    const negativeLocked = await prisma.wallet.count({
      where: { lockedBalance: { lt: 0 } },
    });
    checks.push({
      name: "locked_balance_non_negative",
      passed: negativeLocked === 0,
      count: negativeLocked,
      description: "No wallet with locked_balance < 0",
    });

    // 3. creatorUserId != opponentUserId — raw query required for cross-field comparison
    const selfPlayResult = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM "Game"
      WHERE "opponentUserId" IS NOT NULL
        AND "creatorUserId" = "opponentUserId"
    `;
    const selfPlayCount = Number(selfPlayResult[0]?.count ?? 0);
    checks.push({
      name: "no_self_play",
      passed: selfPlayCount === 0,
      count: selfPlayCount,
      description: "No game where creatorUserId = opponentUserId",
    });

    const allPassed = checks.every(c => c.passed);

    return NextResponse.json({
      status: allPassed ? "ok" : "violation",
      checks,
      timestamp: new Date().toISOString(),
    }, { status: allPassed ? 200 : 409 });
  } catch (error) {
    return NextResponse.json({
      status: "error",
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
