import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/server/db/prisma";
import { ManualCreditForm, ManualDebitForm, UserStatusForm } from "./_components/AdminUserActions";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) notFound();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true },
  });
  if (!user) notFound();

  const [games, ledgerEntries, auditLogs] = await Promise.all([
    prisma.game.findMany({
      where: {
        OR: [{ creatorUserId: userId }, { opponentUserId: userId }],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.ledgerEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.auditLog.findMany({
      where: { resourceType: "user", resourceId: String(userId) },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const statusColor: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    blocked: "bg-red-100 text-red-800",
    under_review: "bg-orange-100 text-orange-800",
  };

  const gameStatusColor: Record<string, string> = {
    waiting: "text-yellow-700",
    matched: "text-blue-700",
    rolling: "text-blue-800",
    resolving: "text-purple-700",
    settled: "text-green-700",
    refunded: "text-gray-600",
    cancelled: "text-gray-600",
    failed: "text-red-700",
    under_review: "text-orange-700",
  };

  return (
    <main className="p-8 max-w-5xl">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/admin/users" className="text-sm text-blue-700 hover:underline">← Users</Link>
        <h1 className="text-2xl font-bold">User #{user.id}</h1>
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${statusColor[user.status] ?? "bg-gray-100"}`}>
          {user.status}
        </span>
      </div>

      {/* Profile */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InfoCard label="Telegram user ID" value={user.telegramUserId} />
        <InfoCard label="Username" value={user.username ?? "-"} />
        <InfoCard label="Display name" value={user.displayName ?? "-"} />
        <InfoCard label="Region" value={user.regionCode ?? "-"} />
        <InfoCard label="Age confirmed" value={user.ageConfirmed ? "Yes" : "No"} />
        <InfoCard label="Daily limit" value={user.responsibleLimitPerDay?.toString() ?? "-"} />
        <InfoCard label="Created" value={user.createdAt.toISOString()} />
      </section>

      {/* Wallet */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Wallet</h2>
        {user.wallet ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InfoCard label="Available balance" value={user.wallet.availableBalance.toString()} />
            <InfoCard label="Locked balance" value={user.wallet.lockedBalance.toString()} />
            <InfoCard label="Currency" value={user.wallet.currency} />
            <InfoCard label="Version" value={String(user.wallet.version)} />
          </div>
        ) : (
          <p className="text-sm text-gray-500">No wallet found.</p>
        )}
      </section>

      {/* Game history */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Games ({games.length})</h2>
        {games.length === 0 ? (
          <p className="text-sm text-gray-500">No games.</p>
        ) : (
          <div className="overflow-x-auto rounded border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2">id</th>
                  <th className="px-3 py-2">code</th>
                  <th className="px-3 py-2">role</th>
                  <th className="px-3 py-2">status</th>
                  <th className="px-3 py-2">bet</th>
                  <th className="px-3 py-2">winner</th>
                  <th className="px-3 py-2">createdAt</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g) => (
                  <tr key={g.id} className="border-t">
                    <td className="px-3 py-2">
                      <Link href={`/admin/games/${g.id}`} className="text-blue-700 hover:underline">{g.id}</Link>
                    </td>
                    <td className="px-3 py-2 font-mono">{g.publicCode}</td>
                    <td className="px-3 py-2">{g.creatorUserId === userId ? "creator" : "opponent"}</td>
                    <td className={`px-3 py-2 font-medium ${gameStatusColor[g.status] ?? ""}`}>{g.status}</td>
                    <td className="px-3 py-2 font-mono">{g.betAmount.toString()}</td>
                    <td className="px-3 py-2">{g.winnerUserId === userId ? "✓ won" : g.winnerUserId ? "✗ lost" : "-"}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{g.createdAt.toISOString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Ledger */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Ledger ({ledgerEntries.length})</h2>
        {ledgerEntries.length === 0 ? (
          <p className="text-sm text-gray-500">No ledger entries.</p>
        ) : (
          <div className="overflow-x-auto rounded border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2">id</th>
                  <th className="px-3 py-2">entryType</th>
                  <th className="px-3 py-2">direction</th>
                  <th className="px-3 py-2">amount</th>
                  <th className="px-3 py-2">gameId</th>
                  <th className="px-3 py-2">createdAt</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="px-3 py-2">{e.id}</td>
                    <td className="px-3 py-2">{e.entryType}</td>
                    <td className={`px-3 py-2 font-medium ${e.direction === "credit" ? "text-green-700" : "text-red-700"}`}>{e.direction}</td>
                    <td className="px-3 py-2 font-mono">{e.amount.toString()}</td>
                    <td className="px-3 py-2">
                      {e.gameId ? <Link href={`/admin/games/${e.gameId}`} className="text-blue-700 hover:underline">{e.gameId}</Link> : "-"}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">{e.createdAt.toISOString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Manual operations */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Manual Operations</h2>
        <div className="rounded border bg-white p-4 space-y-4">
          <div>
            <p className="mb-1 text-xs font-medium text-gray-600">Credit (add to available balance)</p>
            <ManualCreditForm userId={userId} />
          </div>
          <div className="border-t pt-4">
            <p className="mb-1 text-xs font-medium text-gray-600">Debit (remove from available balance)</p>
            <ManualDebitForm userId={userId} />
          </div>
        </div>
      </section>

      {/* User status */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">User Status</h2>
        <div className="rounded border bg-white p-4">
          <p className="mb-2 text-xs text-gray-500">Current: <span className="font-semibold">{user.status}</span></p>
          <UserStatusForm userId={userId} currentStatus={user.status} />
        </div>
      </section>

      {/* Audit */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Audit Logs ({auditLogs.length})</h2>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-gray-500">No audit logs.</p>
        ) : (
          <div className="overflow-x-auto rounded border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2">id</th>
                  <th className="px-3 py-2">actorType</th>
                  <th className="px-3 py-2">action</th>
                  <th className="px-3 py-2">createdAt</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-t">
                    <td className="px-3 py-2">{log.id}</td>
                    <td className="px-3 py-2">{log.actorType}</td>
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-white p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}
