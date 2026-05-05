import Link from "next/link";
import prisma from "@/server/db/prisma";
import { JoinGameForm } from "../components/JoinGameForm";

export const dynamic = "force-dynamic";

export default async function PlayJoinPage() {
  const demoUsers = await prisma.user.findMany({
    where: { telegramUserId: { startsWith: "demo_" } },
    orderBy: { id: "asc" },
    select: { id: true, displayName: true, username: true, telegramUserId: true },
  });

  const options = demoUsers.map((u) => ({
    id: u.id,
    label: u.displayName ?? u.username ?? u.telegramUserId,
  }));

  return (
    <main className="p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">/play/join</h1>
          <p className="text-sm text-gray-600">Sandbox-only join by public code</p>
        </div>
        <div className="flex gap-2">
          <Link className="rounded bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black" href="/play">
            /play
          </Link>
          <Link className="rounded bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black" href="/admin">
            /admin
          </Link>
        </div>
      </div>

      <div className="mb-6 rounded border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
        Sandbox only. No real payments. Not connected to Telegram.
      </div>

      <JoinGameForm demoUsers={options} />
    </main>
  );
}

