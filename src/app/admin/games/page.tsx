import Link from "next/link";
import prisma from "@/server/db/prisma";

export default async function AdminGamesPage() {
  const games = await prisma.game.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      publicCode: true,
      creatorUserId: true,
      opponentUserId: true,
      status: true,
      betAmount: true,
      winnerUserId: true,
      loserUserId: true,
      createdAt: true,
      settledAt: true,
    },
  });

  return (
    <main className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Games</h1>
        <Link href="/admin" className="text-sm text-blue-700 hover:underline">
          Back to overview
        </Link>
      </div>

      {games.length === 0 ? (
        <p className="rounded border bg-white p-4 text-sm text-gray-600">No games found.</p>
      ) : (
        <div className="overflow-x-auto rounded border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">id</th>
                <th className="px-3 py-2">publicCode</th>
                <th className="px-3 py-2">creatorUserId</th>
                <th className="px-3 py-2">opponentUserId</th>
                <th className="px-3 py-2">status</th>
                <th className="px-3 py-2">betAmount</th>
                <th className="px-3 py-2">winnerUserId</th>
                <th className="px-3 py-2">loserUserId</th>
                <th className="px-3 py-2">createdAt</th>
                <th className="px-3 py-2">settledAt</th>
              </tr>
            </thead>
            <tbody>
              {games.map((game) => (
                <tr key={game.id} className="border-t">
                  <td className="px-3 py-2">
                    <Link href={`/admin/games/${game.id}`} className="text-blue-700 hover:underline">
                      {game.id}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{game.publicCode}</td>
                  <td className="px-3 py-2">{game.creatorUserId}</td>
                  <td className="px-3 py-2">{game.opponentUserId ?? "-"}</td>
                  <td className="px-3 py-2">{game.status}</td>
                  <td className="px-3 py-2">{game.betAmount.toString()}</td>
                  <td className="px-3 py-2">{game.winnerUserId ?? "-"}</td>
                  <td className="px-3 py-2">{game.loserUserId ?? "-"}</td>
                  <td className="px-3 py-2">{game.createdAt.toISOString()}</td>
                  <td className="px-3 py-2">{game.settledAt ? game.settledAt.toISOString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
