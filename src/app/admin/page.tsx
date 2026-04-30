import Link from "next/link";
import prisma from "@/server/db/prisma";

export default async function AdminDashboard() {
  const [usersCount, walletsCount, gamesCount, ledgerCount, auditCount] = await Promise.all([
    prisma.user.count(),
    prisma.wallet.count(),
    prisma.game.count(),
    prisma.ledgerEntry.count(),
    prisma.auditLog.count(),
  ]);

  const cards = [
    { title: "Users", value: usersCount, href: "/admin/users" },
    { title: "Wallets", value: walletsCount, href: "/admin/wallets" },
    { title: "Games", value: gamesCount, href: "/admin/games" },
    { title: "Ledger Entries", value: ledgerCount, href: "/admin/ledger" },
    { title: "Audit Logs", value: auditCount, href: "/admin/audit" },
  ];

  return (
    <main className="p-8">
      <h1 className="mb-2 text-2xl font-bold">BigPlayBot Dices - Admin Dashboard</h1>
      <p className="mb-6 text-sm text-gray-600">Read-only local development overview.</p>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="rounded border bg-white p-4 shadow-sm transition hover:bg-gray-50"
          >
            <h2 className="text-sm font-medium text-gray-600">{card.title}</h2>
            <p className="mt-2 text-2xl font-semibold">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="space-y-2 text-sm">
        <p className="font-medium">Quick links</p>
        <ul className="list-inside list-disc text-blue-700">
          <li><Link href="/admin/users">/admin/users</Link></li>
          <li><Link href="/admin/wallets">/admin/wallets</Link></li>
          <li><Link href="/admin/games">/admin/games</Link></li>
          <li><Link href="/admin/ledger">/admin/ledger</Link></li>
          <li><Link href="/admin/audit">/admin/audit</Link></li>
          <li><Link href="/admin/simulator">/admin/simulator</Link></li>
        </ul>
      </div>
    </main>
  );
}
