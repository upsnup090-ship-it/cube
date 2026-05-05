import { NextResponse } from "next/server";
import prisma from "@/server/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    return NextResponse.json({
      status: "ok",
      db: "connected",
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const latencyMs = Date.now() - start;
    return NextResponse.json(
      {
        status: "error",
        db: "disconnected",
        latencyMs,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
