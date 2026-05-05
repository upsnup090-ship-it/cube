import Link from "next/link";
export const dynamic = "force-dynamic";
import prisma from "@/server/db/prisma";

export default async function AdminRiskPage() {
  const [blockedUsers, reviewUsers, failedGames, reviewGames] = await Promise.all([
    prisma.user.findMany({
      where: { status: "blocked" },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, telegramUserId: true, username: true, status: true, updatedAt: true },
    }),
    prisma.user.findMany({
      where: { status: "under_review" },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, telegramUserId: true, username: true, status: true, updatedAt: true },
    }),
    prisma.game.findMany({
      where: { status: "failed" },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, publicCode: true, creatorUserId: true, betAmount: true, resultReason: true, updatedAt: true },
    }),
    prisma.game.findMany({
      where: { status: "under_review" },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, publicCode: true, creatorUserId: true, betAmount: true, resultReason: true, updatedAt: true },
    }),
  ]);

  return (
    <main className="p-8 max-w-5xl">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/admin" className="text-sm text-blue-700 hover:underline">← Overview</Link>
        <h1 className="text-2xl font-bold">Risk &amp; Review</h1>
      </div>

      {blockedUsers.length === 0 && reviewUsers.length === 0 && failedGames.length === 0 && reviewGames.length === 0 && (
        <p className="rounded border bg-white p-6 text-sm text-gray-500">No risk items found. All clear.</p>
      )}

      {blockedUsers.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-red-600">Blocked Users ({blockedUsers.length})</h2>
          <div className="overflow-x-auto rounded border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2">id</th>
                  <th className="px-3 py-2">telegramUserId</th>
                  <th className="px-3 py-2">username</th>
                  <th className="px-3 py-2">updatedAt</th>
                </tr>
              </thead>
              <tbody>
                {blockedUsers.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-3 py-2">
                      <Link href={`/admin/users/${u.id}`} className="text-blue-700 hover:underline">{u.id}</Link>
                    </td>
                    <td className="px-3 py-2">{u.telegramUserId}</td>
                    <td className="px-3 py-2">{u.username ?? "-"}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{u.updatedAt.toISOString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {reviewUsers.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-orange-600">Users Under Review ({reviewUsers.length})</h2>
          <div className="overflow-x-auto rounded border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2">id</th>
                  <th className="px-3 py-2">telegramUserId</th>
                  <th className="px-3 py-2">username</th>
                  <th className="px-3 py-2">updatedAt</th>
                </tr>
              </thead>
              <tbody>
                {reviewUsers.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-3 py-2">
                      <Link href={`/admin/users/${u.id}`} className="text-blue-700 hover:underline">{u.id}</Link>
                    </td>
                    <td className="px-3 py-2">{u.telegramUserId}</td>
                    <td className="px-3 py-2">{u.username ?? "-"}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{u.updatedAt.toISOString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {failedGames.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-red-600">Failed Games ({failedGames.length})</h2>
          <div className="overflow-x-auto rounded border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2">id</th>
                  <th className="px-3 py-2">code</th>
                  <th className="px-3 py-2">creatorUserId</th>
                  <th className="px-3 py-2">betAmount</th>
                  <th className="px-3 py-2">resultReason</th>
                  <th className="px-3 py-2">updatedAt</th>
                </tr>
              </thead>
              <tbody>
                {failedGames.map((g) => (
                  <tr key={g.id} className="border-t">
                    <td className="px-3 py-2">
                      <Link href={`/admin/games/${g.id}`} className="text-blue-700 hover:underline">{g.id}</Link>
                    </td>
                    <td className="px-3 py-2 font-mono">{g.publicCode}</td>
                    <td className="px-3 py-2">
                      <Link href={`/admin/users/${g.creatorUserId}`} className="text-blue-700 hover:underline">{g.creatorUserId}</Link>
                    </td>
                    <td className="px-3 py-2 font-mono">{g.betAmount.toString()}</td>
                    <td className="px-3 py-2 text-xs">{g.resultReason ?? "-"}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{g.updatedAt.toISOString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {reviewGames.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-orange-600">Games Under Review ({reviewGames.length})</h2>
          <div className="overflow-x-auto rounded border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2">id</th>
                  <th className="px-3 py-2">code</th>
                  <th className="px-3 py-2">creatorUserId</th>
                  <th className="px-3 py-2">betAmount</th>
                  <th className="px-3 py-2">resultReason</th>
                  <th className="px-3 py-2">updatedAt</th>
                </tr>
              </thead>
              <tbody>
                {reviewGames.map((g) => (
                  <tr key={g.id} className="border-t">
                    <td className="px-3 py-2">
                      <Link href={`/admin/games/${g.id}`} className="text-blue-700 hover:underline">{g.id}</Link>
                    </td>
                    <td className="px-3 py-2 font-mono">{g.publicCode}</td>
                    <td className="px-3 py-2">
                      <Link href={`/admin/users/${g.creatorUserId}`} className="text-blue-700 hover:underline">{g.creatorUserId}</Link>
                    </td>
                    <td className="px-3 py-2 font-mono">{g.betAmount.toString()}</td>
                    <td className="px-3 py-2 text-xs">{g.resultReason ?? "-"}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{g.updatedAt.toISOString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
