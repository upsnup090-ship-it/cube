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

export default async function AdminWalletDetailPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const walletId = parseId(rawId);
  if (!walletId) notFound();

  const wallet = await prisma.wallet.findUnique({
    where: { id: walletId },
    include: {
      user: {
        select: { id: true, telegramUserId: true, username: true, displayName: true, status: true },
      },
      ledgerEntries: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!wallet) notFound();

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Wallet #{wallet.id}</h1>
        <Link href="/admin/wallets" className="text-sm text-blue-700 hover:underline">Back to wallets</Link>
      </div>

      <section className="rounded border bg-white p-4 text-sm">
        <h2 className="mb-2 text-base font-semibold">Wallet fields</h2>
        <div>userId: {wallet.userId}</div>
        <div>currency: {wallet.currency}</div>
        <div>availableBalance: {wallet.availableBalance.toString()}</div>
        <div>lockedBalance: {wallet.lockedBalance.toString()}</div>
        <div>version: {wallet.version}</div>
        <div>createdAt: {wallet.createdAt.toISOString()}</div>
        <div>updatedAt: {wallet.updatedAt.toISOString()}</div>
      </section>

      <section className="rounded border bg-white p-4 text-sm">
        <h2 className="mb-2 text-base font-semibold">Owner user</h2>
        <div>
          <Link href={`/admin/users/${wallet.user.id}`} className="text-blue-700 hover:underline">#{wallet.user.id}</Link>
          {" "}- {wallet.user.telegramUserId} - {wallet.user.username ?? wallet.user.displayName ?? "-"} - {wallet.user.status}
        </div>
      </section>

      <section className="rounded border bg-white p-4 text-sm">
        <h2 className="mb-2 text-base font-semibold">Latest ledger entries</h2>
        {wallet.ledgerEntries.length === 0 ? (
          <p className="text-gray-600">No ledger entries.</p>
        ) : (
          <ul className="space-y-1">
            {wallet.ledgerEntries.map((entry) => (
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
