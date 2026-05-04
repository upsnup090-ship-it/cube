import Link from "next/link";
import prisma from "@/server/db/prisma";

export default async function AdminLedgerPage() {
  const entries = await prisma.ledgerEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
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

  return (
    <main className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Ledger</h1>
        <Link href="/admin" className="text-sm text-blue-700 hover:underline">
          Back to overview
        </Link>
      </div>

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
                  <td className="px-3 py-2">{entry.transactionId}</td>
                  <td className="px-3 py-2">{entry.userId}</td>
                  <td className="px-3 py-2">{entry.walletId}</td>
                  <td className="px-3 py-2">{entry.gameId ?? "-"}</td>
                  <td className="px-3 py-2">{entry.entryType}</td>
                  <td className="px-3 py-2">{entry.direction}</td>
                  <td className="px-3 py-2">{entry.amount.toString()}</td>
                  <td className="px-3 py-2">{entry.currency}</td>
                  <td className="px-3 py-2">{entry.idempotencyKey}</td>
                  <td className="px-3 py-2">{entry.createdAt.toISOString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
