import Link from "next/link";
export const dynamic = "force-dynamic";
import prisma from "@/server/db/prisma";

export default async function AdminLedgerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const filterUserId = sp.userId ? Number(sp.userId) : undefined;
  const filterGameId = sp.gameId ? Number(sp.gameId) : undefined;
  const filterType = sp.type ?? undefined;
  const filterDir = sp.dir ?? undefined;

  const entries = await prisma.ledgerEntry.findMany({
    where: {
      ...(filterUserId ? { userId: filterUserId } : {}),
      ...(filterGameId ? { gameId: filterGameId } : {}),
      ...(filterType ? { entryType: filterType as never } : {}),
      ...(filterDir ? { direction: filterDir as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      transactionId: true,
      userId: true,
      walletId: true,
      gameId: true,
      entryType: true,
      direction: true,
      amount: true,
      currency: true,
      idempotencyKey: true,
      createdAt: true,
    },
  });

  const activeFilters = [filterUserId && `user:${filterUserId}`, filterGameId && `game:${filterGameId}`, filterType, filterDir].filter(Boolean);

  return (
    <main className="p-8 max-w-7xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Ledger</h1>
        <Link href="/admin" className="text-sm text-blue-700 hover:underline">
          Back to overview
        </Link>
      </div>

      <form method="GET" className="mb-4 flex flex-wrap gap-2">
        <input name="userId" defaultValue={sp.userId ?? ""} placeholder="Filter by userId" className="rounded border px-2 py-1 text-sm w-36" />
        <input name="gameId" defaultValue={sp.gameId ?? ""} placeholder="Filter by gameId" className="rounded border px-2 py-1 text-sm w-36" />
        <input name="type" defaultValue={sp.type ?? ""} placeholder="entryType" className="rounded border px-2 py-1 text-sm w-36" />
        <select name="dir" defaultValue={sp.dir ?? ""} className="rounded border px-2 py-1 text-sm">
          <option value="">All directions</option>
          <option value="credit">credit</option>
          <option value="debit">debit</option>
        </select>
        <button type="submit" className="rounded bg-gray-800 px-3 py-1 text-sm text-white hover:bg-black">Filter</button>
        {activeFilters.length > 0 && <Link href="/admin/ledger" className="rounded border px-3 py-1 text-sm hover:bg-gray-50">Clear</Link>}
      </form>

      {activeFilters.length > 0 && (
        <p className="mb-3 text-xs text-gray-500">Filtered by: {activeFilters.join(", ")} — {entries.length} results</p>
      )}

      {entries.length === 0 ? (
        <p className="rounded border bg-white p-4 text-sm text-gray-600">No ledger entries found.</p>
      ) : (
        <div className="overflow-x-auto rounded border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">id</th>
                <th className="px-3 py-2">transactionId</th>
                <th className="px-3 py-2">userId</th>
                <th className="px-3 py-2">walletId</th>
                <th className="px-3 py-2">gameId</th>
                <th className="px-3 py-2">entryType</th>
                <th className="px-3 py-2">direction</th>
                <th className="px-3 py-2">amount</th>
                <th className="px-3 py-2">currency</th>
                <th className="px-3 py-2">idempotencyKey</th>
                <th className="px-3 py-2">createdAt</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-t">
                  <td className="px-3 py-2">{entry.id}</td>
                  <td className="px-3 py-2 font-mono text-xs">{entry.transactionId}</td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/users/${entry.userId}`} className="text-blue-700 hover:underline">{entry.userId}</Link>
                  </td>
                  <td className="px-3 py-2">{entry.walletId}</td>
                  <td className="px-3 py-2">
                    {entry.gameId ? <Link href={`/admin/games/${entry.gameId}`} className="text-blue-700 hover:underline">{entry.gameId}</Link> : "-"}
                  </td>
                  <td className="px-3 py-2">{entry.entryType}</td>
                  <td className={`px-3 py-2 font-medium ${entry.direction === "credit" ? "text-green-700" : "text-red-700"}`}>{entry.direction}</td>
                  <td className="px-3 py-2 font-mono">{entry.amount.toString()}</td>
                  <td className="px-3 py-2">{entry.currency}</td>
                  <td className="px-3 py-2 font-mono text-xs max-w-xs truncate">{entry.idempotencyKey}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{entry.createdAt.toISOString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
