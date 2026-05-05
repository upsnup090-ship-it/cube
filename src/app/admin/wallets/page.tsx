import Link from "next/link";
export const dynamic = "force-dynamic";
import prisma from "@/server/db/prisma";

export default async function AdminWalletsPage() {
  const wallets = await prisma.wallet.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      user: { select: { username: true, displayName: true, status: true } },
    },
  });

  const totalAvailable = wallets.reduce((acc, w) => acc + w.availableBalance, 0n);
  const totalLocked = wallets.reduce((acc, w) => acc + w.lockedBalance, 0n);

  return (
    <main className="p-8 max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Wallets</h1>
        <Link href="/admin" className="text-sm text-blue-700 hover:underline">
          Back to overview
        </Link>
      </div>

      <div className="mb-4 flex gap-4">
        <div className="rounded border bg-white p-3">
          <p className="text-xs text-gray-500">Total available</p>
          <p className="text-lg font-semibold text-green-700">{totalAvailable.toString()}</p>
        </div>
        <div className="rounded border bg-white p-3">
          <p className="text-xs text-gray-500">Total locked</p>
          <p className="text-lg font-semibold text-orange-600">{totalLocked.toString()}</p>
        </div>
      </div>

      {wallets.length === 0 ? (
        <p className="rounded border bg-white p-4 text-sm text-gray-600">No wallets found.</p>
      ) : (
        <div className="overflow-x-auto rounded border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">id</th>
                <th className="px-3 py-2">user</th>
                <th className="px-3 py-2">status</th>
                <th className="px-3 py-2">currency</th>
                <th className="px-3 py-2">available</th>
                <th className="px-3 py-2">locked</th>
                <th className="px-3 py-2">updatedAt</th>
              </tr>
            </thead>
            <tbody>
              {wallets.map((wallet) => (
                <tr key={wallet.id} className="border-t">
                  <td className="px-3 py-2">{wallet.id}</td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/users/${wallet.userId}`} className="text-blue-700 hover:underline">
                      {wallet.user.displayName ?? wallet.user.username ?? `#${wallet.userId}`}
                    </Link>
                    <span className="ml-1 text-xs text-gray-400">({wallet.userId})</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-xs font-medium ${wallet.user.status === "active" ? "text-green-700" : wallet.user.status === "blocked" ? "text-red-700" : "text-orange-600"}`}>
                      {wallet.user.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{wallet.currency}</td>
                  <td className="px-3 py-2 font-mono text-green-700">{wallet.availableBalance.toString()}</td>
                  <td className={`px-3 py-2 font-mono ${wallet.lockedBalance > 0n ? "text-orange-600 font-semibold" : "text-gray-500"}`}>{wallet.lockedBalance.toString()}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{wallet.updatedAt.toISOString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
