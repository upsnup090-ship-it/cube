import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/server/db/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
};

function parseId(raw: string): number | null {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const userId = parseId(rawId);
  if (!userId) notFound();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      wallet: true,
      ledgerEntries: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      games: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, publicCode: true, status: true, betAmount: true, createdAt: true },
      },
      opponentGames: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, publicCode: true, status: true, betAmount: true, createdAt: true },
      },
    },
  });

  if (!user) notFound();

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">User #{user.id}</h1>
        <Link href="/admin/users" className="text-sm text-blue-700 hover:underline">Back to users</Link>
      </div>

      <section className="rounded border bg-white p-4 text-sm">
        <h2 className="mb-2 text-base font-semibold">User fields</h2>
        <div>telegramUserId: {user.telegramUserId}</div>
        <div>username: {user.username ?? "-"}</div>
        <div>displayName: {user.displayName ?? "-"}</div>
        <div>status: {user.status}</div>
        <div>createdAt: {user.createdAt.toISOString()}</div>
        <div>updatedAt: {user.updatedAt.toISOString()}</div>
      </section>

      <section className="rounded border bg-white p-4 text-sm">
        <h2 className="mb-2 text-base font-semibold">Wallet summary</h2>
        {user.wallet ? (
          <>
            <div>walletId: <Link href={`/admin/wallets/${user.wallet.id}`} className="text-blue-700 hover:underline">{user.wallet.id}</Link></div>
            <div>currency: {user.wallet.currency}</div>
            <div>availableBalance: {user.wallet.availableBalance.toString()}</div>
            <div>lockedBalance: {user.wallet.lockedBalance.toString()}</div>
            <div>updatedAt: {user.wallet.updatedAt.toISOString()}</div>
          </>
        ) : (
          <p className="text-gray-600">No wallet linked.</p>
        )}
      </section>

      <section className="rounded border bg-white p-4 text-sm">
        <h2 className="mb-2 text-base font-semibold">Latest ledger entries</h2>
        {user.ledgerEntries.length === 0 ? (
          <p className="text-gray-600">No ledger entries.</p>
        ) : (
          <ul className="space-y-1">
            {user.ledgerEntries.map((entry) => (
              <li key={entry.id}>
                <Link href={`/admin/ledger/${entry.id}`} className="text-blue-700 hover:underline">#{entry.id}</Link>
                {" "}- {entry.entryType} / {entry.direction} / {entry.amount.toString()} {entry.currency}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded border bg-white p-4 text-sm">
        <h2 className="mb-2 text-base font-semibold">Related games</h2>
        {user.games.length + user.opponentGames.length === 0 ? (
          <p className="text-gray-600">No games.</p>
        ) : (
          <ul className="space-y-1">
            {[...user.games, ...user.opponentGames]
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
              .slice(0, 20)
              .map((game) => (
                <li key={`${game.id}-${game.createdAt.toISOString()}`}>
                  <Link href={`/admin/games/${game.id}`} className="text-blue-700 hover:underline">#{game.id}</Link>
                  {" "}({game.publicCode}) - {game.status} - {game.betAmount.toString()}
                </li>
              ))}
          </ul>
        )}
      </section>
    </main>
  );
}
