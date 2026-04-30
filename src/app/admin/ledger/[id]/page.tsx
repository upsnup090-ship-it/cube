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

export default async function AdminLedgerDetailPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const ledgerId = parseId(rawId);
  if (!ledgerId) notFound();

  const entry = await prisma.ledgerEntry.findUnique({
    where: { id: ledgerId },
    include: {
      user: {
        select: { id: true, telegramUserId: true, username: true, displayName: true, status: true },
      },
      wallet: {
        select: { id: true, currency: true, availableBalance: true, lockedBalance: true, userId: true },
      },
      game: {
        select: { id: true, publicCode: true, status: true, creatorUserId: true, opponentUserId: true },
      },
    },
  });

  if (!entry) notFound();

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ledger Entry #{entry.id}</h1>
        <Link href="/admin/ledger" className="text-sm text-blue-700 hover:underline">Back to ledger</Link>
      </div>

      <section className="rounded border bg-white p-4 text-sm">
        <h2 className="mb-2 text-base font-semibold">Entry fields</h2>
        <div>transactionId: {entry.transactionId}</div>
        <div>userId: {entry.userId}</div>
        <div>walletId: {entry.walletId}</div>
        <div>gameId: {entry.gameId ?? "-"}</div>
        <div>entryType: {entry.entryType}</div>
        <div>direction: {entry.direction}</div>
        <div>amount: {entry.amount.toString()}</div>
        <div>currency: {entry.currency}</div>
        <div>idempotencyKey: {entry.idempotencyKey}</div>
        <div>createdAt: {entry.createdAt.toISOString()}</div>
      </section>

      <section className="rounded border bg-white p-4 text-sm">
        <h2 className="mb-2 text-base font-semibold">Linked user</h2>
        <div>
          <Link href={`/admin/users/${entry.user.id}`} className="text-blue-700 hover:underline">#{entry.user.id}</Link>
          {" "}- {entry.user.telegramUserId} - {entry.user.username ?? entry.user.displayName ?? "-"} - {entry.user.status}
        </div>
      </section>

      <section className="rounded border bg-white p-4 text-sm">
        <h2 className="mb-2 text-base font-semibold">Linked wallet</h2>
        <div>
          <Link href={`/admin/wallets/${entry.wallet.id}`} className="text-blue-700 hover:underline">#{entry.wallet.id}</Link>
          {" "}- userId={entry.wallet.userId} - currency={entry.wallet.currency}
        </div>
        <div>availableBalance: {entry.wallet.availableBalance.toString()}</div>
        <div>lockedBalance: {entry.wallet.lockedBalance.toString()}</div>
      </section>

      <section className="rounded border bg-white p-4 text-sm">
        <h2 className="mb-2 text-base font-semibold">Linked game</h2>
        {entry.game ? (
          <div>
            <Link href={`/admin/games/${entry.game.id}`} className="text-blue-700 hover:underline">#{entry.game.id}</Link>
            {" "}- {entry.game.publicCode} - {entry.game.status}
          </div>
        ) : (
          <p className="text-gray-600">No linked game.</p>
        )}
      </section>
    </main>
  );
}
