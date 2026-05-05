import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/server/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminGameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gameId = Number(id);
  if (!Number.isInteger(gameId)) notFound();

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      gamePlayers: true,
      diceRolls: { orderBy: [{ rollRound: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!game) notFound();

  const [ledgerEntries, auditLogs] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: { gameId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.auditLog.findMany({
      where: { resourceType: "game", resourceId: String(gameId) },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const statusColor: Record<string, string> = {
    waiting: "bg-yellow-100 text-yellow-800",
    matched: "bg-blue-100 text-blue-800",
    rolling: "bg-blue-200 text-blue-900",
    resolving: "bg-purple-100 text-purple-800",
    settled: "bg-green-100 text-green-800",
    refunded: "bg-gray-100 text-gray-700",
    cancelled: "bg-gray-100 text-gray-700",
    failed: "bg-red-100 text-red-800",
    under_review: "bg-orange-100 text-orange-800",
  };

  return (
    <main className="p-8 max-w-5xl">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/admin/games" className="text-sm text-blue-700 hover:underline">← Games</Link>
        <h1 className="text-2xl font-bold">Game #{game.id}</h1>
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${statusColor[game.status] ?? "bg-gray-100"}`}>
          {game.status}
        </span>
      </div>

      {/* Summary */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InfoCard label="Public code" value={game.publicCode} />
        <InfoCard label="Bet amount" value={game.betAmount.toString()} />
        <InfoCard label="Dice count" value={String(game.diceCount)} />
        <InfoCard label="Result reason" value={game.resultReason ?? "-"} />
        <InfoCard label="Creator" value={String(game.creatorUserId)} href={`/admin/users/${game.creatorUserId}`} />
        <InfoCard label="Opponent" value={game.opponentUserId ? String(game.opponentUserId) : "-"} href={game.opponentUserId ? `/admin/users/${game.opponentUserId}` : undefined} />
        <InfoCard label="Winner" value={game.winnerUserId ? String(game.winnerUserId) : "-"} />
        <InfoCard label="Loser" value={game.loserUserId ? String(game.loserUserId) : "-"} />
        <InfoCard label="Created" value={game.createdAt.toISOString()} />
        <InfoCard label="Expires" value={game.expiresAt.toISOString()} />
        <InfoCard label="Settled at" value={game.settledAt ? game.settledAt.toISOString() : "-"} />
      </section>

      {/* Dice rolls */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Dice Rolls ({game.diceRolls.length})</h2>
        {game.diceRolls.length === 0 ? (
          <p className="text-sm text-gray-500">No rolls yet.</p>
        ) : (
          <div className="overflow-x-auto rounded border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2">Round</th>
                  <th className="px-3 py-2">userId</th>
                  <th className="px-3 py-2">diceValue</th>
                  <th className="px-3 py-2">totalValue</th>
                  <th className="px-3 py-2">source</th>
                  <th className="px-3 py-2">createdAt</th>
                </tr>
              </thead>
              <tbody>
                {game.diceRolls.map((roll) => (
                  <tr key={roll.id} className="border-t">
                    <td className="px-3 py-2">{roll.rollRound}</td>
                    <td className="px-3 py-2">
                      <Link href={`/admin/users/${roll.userId}`} className="text-blue-700 hover:underline">{roll.userId}</Link>
                    </td>
                    <td className="px-3 py-2 font-mono">{roll.diceValue}</td>
                    <td className="px-3 py-2 font-mono font-semibold">{roll.totalValue}</td>
                    <td className="px-3 py-2">{roll.source}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{roll.createdAt.toISOString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Ledger entries */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Ledger Entries ({ledgerEntries.length})</h2>
        {ledgerEntries.length === 0 ? (
          <p className="text-sm text-gray-500">No ledger entries for this game.</p>
        ) : (
          <div className="overflow-x-auto rounded border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2">id</th>
                  <th className="px-3 py-2">userId</th>
                  <th className="px-3 py-2">entryType</th>
                  <th className="px-3 py-2">direction</th>
                  <th className="px-3 py-2">amount</th>
                  <th className="px-3 py-2">idempotencyKey</th>
                  <th className="px-3 py-2">createdAt</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="px-3 py-2">{e.id}</td>
                    <td className="px-3 py-2">
                      <Link href={`/admin/users/${e.userId}`} className="text-blue-700 hover:underline">{e.userId}</Link>
                    </td>
                    <td className="px-3 py-2">{e.entryType}</td>
                    <td className="px-3 py-2">{e.direction}</td>
                    <td className="px-3 py-2 font-mono">{e.amount.toString()}</td>
                    <td className="px-3 py-2 text-xs text-gray-500 max-w-xs truncate">{e.idempotencyKey}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{e.createdAt.toISOString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Audit logs */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Audit Logs ({auditLogs.length})</h2>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-gray-500">No audit logs for this game.</p>
        ) : (
          <div className="overflow-x-auto rounded border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2">id</th>
                  <th className="px-3 py-2">actorType</th>
                  <th className="px-3 py-2">actorId</th>
                  <th className="px-3 py-2">action</th>
                  <th className="px-3 py-2">createdAt</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-t">
                    <td className="px-3 py-2">{log.id}</td>
                    <td className="px-3 py-2">{log.actorType}</td>
                    <td className="px-3 py-2">{log.actorId ?? "-"}</td>
                    <td className="px-3 py-2">{log.action}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{log.createdAt.toISOString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function InfoCard({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="rounded border bg-white p-3">
      <p className="text-xs text-gray-500">{label}</p>
      {href ? (
        <Link href={href} className="mt-0.5 block text-sm font-medium text-blue-700 hover:underline">{value}</Link>
      ) : (
        <p className="mt-0.5 text-sm font-medium">{value}</p>
      )}
    </div>
  );
}
