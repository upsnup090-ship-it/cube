import Link from "next/link";
import prisma from "@/server/db/prisma";

export default async function AdminWalletsPage() {
  const wallets = await prisma.wallet.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      userId: true,
      currency: true,
      availableBalance: true,
      lockedBalance: true,
      updatedAt: true,
    },
  });

  return (
    <main className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Wallets</h1>
        <Link href="/admin" className="text-sm text-blue-700 hover:underline">
          Back to overview
        </Link>
      </div>

      {wallets.length === 0 ? (
        <p className="rounded border bg-white p-4 text-sm text-gray-600">No wallets found.</p>
      ) : (
        <div className="overflow-x-auto rounded border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">id</th>
                <th className="px-3 py-2">userId</th>
                <th className="px-3 py-2">currency</th>
                <th className="px-3 py-2">availableBalance</th>
                <th className="px-3 py-2">lockedBalance</th>
                <th className="px-3 py-2">updatedAt</th>
              </tr>
            </thead>
            <tbody>
              {wallets.map((wallet) => (
                <tr key={wallet.id} className="border-t">
                  <td className="px-3 py-2">{wallet.id}</td>
                  <td className="px-3 py-2">{wallet.userId}</td>
                  <td className="px-3 py-2">{wallet.currency}</td>
                  <td className="px-3 py-2">{wallet.availableBalance.toString()}</td>
                  <td className="px-3 py-2">{wallet.lockedBalance.toString()}</td>
                  <td className="px-3 py-2">{wallet.updatedAt.toISOString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
