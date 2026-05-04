import { NextResponse } from "next/server";
import { runDevPlayerSimulator } from "@/server/dev/player-simulator";

export async function POST() {
  try {
    const result = await runDevPlayerSimulator();
    return NextResponse.json({ ok: true, result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
