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

export default async function AdminGameDetailPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const gameId = parseId(rawId);
  if (!gameId) notFound();

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      creator: { select: { id: true, telegramUserId: true, username: true, displayName: true } },
      opponent: { select: { id: true, telegramUserId: true, username: true, displayName: true } },
      gamePlayers: {
        include: { user: { select: { id: true, telegramUserId: true, username: true, displayName: true } } },
        orderBy: { joinedAt: "asc" },
      },
      diceRolls: {
        include: { user: { select: { id: true, telegramUserId: true, username: true, displayName: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      },
      ledgerEntries: {
        orderBy: { createdAt: "desc" },
        take: 30,
      },
    },
  });

  if (!game) notFound();

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Game #{game.id}</h1>
        <Link href="/admin/games" className="text-sm text-blue-700 hover:underline">Back to games</Link>
      </div>

      <section className="rounded border bg-white p-4 text-sm">
        <h2 className="mb-2 text-base font-semibold">Game fields</h2>
        <div>publicCode: {game.publicCode}</div>
        <div>creatorUserId: {game.creatorUserId}</div>
        <div>opponentUserId: {game.opponentUserId ?? "-"}</div>
        <div>status: {game.status}</div>
        <div>betAmount: {game.betAmount.toString()}</div>
        <div>currency: {game.currency}</div>
        <div>diceCount: {game.diceCount}</div>
        <div>winnerUserId: {game.winnerUserId ?? "-"}</div>
        <div>loserUserId: {game.loserUserId ?? "-"}</div>
        <div>resultReason: {game.resultReason ?? "-"}</div>
        <div>expiresAt: {game.expiresAt.toISOString()}</div>
        <div>settledAt: {game.settledAt ? game.settledAt.toISOString() : "-"}</div>
        <div>createdAt: {game.createdAt.toISOString()}</div>
      </section>

      <section className="rounded border bg-white p-4 text-sm">
        <h2 className="mb-2 text-base font-semibold">Players</h2>
        <div>
          creator: <Link href={`/admin/users/${game.creator.id}`} className="text-blue-700 hover:underline">#{game.creator.id}</Link>
          {" "}- {game.creator.telegramUserId}
        </div>
        <div>
          opponent: {game.opponent ? <><Link href={`/admin/users/${game.opponent.id}`} className="text-blue-700 hover:underline">#{game.opponent.id}</Link>{" "}- {game.opponent.telegramUserId}</> : "-"}
        </div>
        {game.gamePlayers.length === 0 ? (
          <p className="mt-2 text-gray-600">No gamePlayers rows.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {game.gamePlayers.map((gp) => (
              <li key={gp.id}>
                {gp.role} - <Link href={`/admin/users/${gp.user.id}`} className="text-blue-700 hover:underline">#{gp.user.id}</Link>
                {" "}- escrowLockedAmount={gp.escrowLockedAmount.toString()}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded border bg-white p-4 text-sm">
        <h2 className="mb-2 text-base font-semibold">Dice rolls</h2>
        {game.diceRolls.length === 0 ? (
          <p className="text-gray-600">No dice rolls.</p>
        ) : (
          <ul className="space-y-1">
            {game.diceRolls.map((roll) => (
              <li key={roll.id}>
                #{roll.id} - user <Link href={`/admin/users/${roll.user.id}`} className="text-blue-700 hover:underline">{roll.user.id}</Link>
                {" "}- round={roll.rollRound} value={roll.diceValue} total={roll.totalValue}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded border bg-white p-4 text-sm">
        <h2 className="mb-2 text-base font-semibold">Related ledger entries</h2>
        {game.ledgerEntries.length === 0 ? (
          <p className="text-gray-600">No ledger entries.</p>
        ) : (
          <ul className="space-y-1">
            {game.ledgerEntries.map((entry) => (
              <li key={entry.id}>
                <Link href={`/admin/ledger/${entry.id}`} className="text-blue-700 hover:underline">#{entry.id}</Link>
                {" "}- {entry.entryType} / {entry.direction} / {entry.amount.toString()} {entry.currency}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
