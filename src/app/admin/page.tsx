import Link from "next/link";
import prisma from "@/server/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    usersCount,
    blockedCount,
    underReviewCount,
    gamesWaiting,
    gamesActive,
    gamesSettledToday,
    gamesFailed,
    gamesUnderReview,
    ledgerCount,
    auditCount,
    lockedFundsAgg,
    manualOpsToday,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "blocked" } }),
    prisma.user.count({ where: { status: "under_review" } }),
    prisma.game.count({ where: { status: "waiting" } }),
    prisma.game.count({ where: { status: { in: ["matched", "rolling", "resolving"] } } }),
    prisma.game.count({ where: { status: "settled", settledAt: { gte: today } } }),
    prisma.game.count({ where: { status: "failed" } }),
    prisma.game.count({ where: { status: "under_review" } }),
    prisma.ledgerEntry.count(),
    prisma.auditLog.count(),
    prisma.wallet.aggregate({ _sum: { lockedBalance: true } }),
    prisma.auditLog.count({
      where: {
        action: { in: ["manual_credit", "manual_debit"] },
        createdAt: { gte: today },
      },
    }),
  ]);

  const lockedFunds = lockedFundsAgg._sum.lockedBalance ?? 0n;
  const riskCount = blockedCount + underReviewCount + gamesFailed + gamesUnderReview;

  return (
    <main className="p-8 max-w-6xl">
      <h1 className="mb-1 text-2xl font-bold">BigPlayBot Dices — Admin Dashboard</h1>
      <p className="mb-6 text-sm text-gray-500">Overview · read-only</p>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Users</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard title="Total users" value={usersCount} href="/admin/users" />
          <StatCard title="Blocked" value={blockedCount} href="/admin/risk" warn={blockedCount > 0} />
          <StatCard title="Under review" value={underReviewCount} href="/admin/risk" warn={underReviewCount > 0} />
          <StatCard title="Manual ops today" value={manualOpsToday} href="/admin/audit" />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Games</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard title="Waiting" value={gamesWaiting} href="/admin/games" />
          <StatCard title="Active (matched/rolling)" value={gamesActive} href="/admin/games" />
          <StatCard title="Settled today" value={gamesSettledToday} href="/admin/games" />
          <StatCard title="Locked funds" value={lockedFunds.toString()} href="/admin/wallets" />
        </div>
      </section>

      {riskCount > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-600">Risk &amp; Review</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard title="Failed games" value={gamesFailed} href="/admin/risk" warn={gamesFailed > 0} />
            <StatCard title="Games under review" value={gamesUnderReview} href="/admin/risk" warn={gamesUnderReview > 0} />
            <StatCard title="Blocked users" value={blockedCount} href="/admin/risk" warn={blockedCount > 0} />
            <StatCard title="Users under review" value={underReviewCount} href="/admin/risk" warn={underReviewCount > 0} />
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Data</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard title="Ledger entries" value={ledgerCount} href="/admin/ledger" />
          <StatCard title="Audit logs" value={auditCount} href="/admin/audit" />
          <StatCard title="Wallets" value={usersCount} href="/admin/wallets" />
          <Link href="/admin/risk" className="rounded border bg-white p-4 shadow-sm transition hover:bg-gray-50 flex items-center justify-center text-sm text-blue-700 font-medium">
            Risk &amp; Review →
          </Link>
        </div>
      </section>
    </main>
  );
}

function StatCard({
  title,
  value,
  href,
  warn,
}: {
  title: string;
  value: string | number;
  href: string;
  warn?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded border p-4 shadow-sm transition hover:bg-gray-50 ${warn ? "border-red-300 bg-red-50" : "bg-white"}`}
    >
      <p className="text-xs font-medium text-gray-500">{title}</p>
      <p className={`mt-1 text-2xl font-semibold ${warn ? "text-red-700" : ""}`}>{value}</p>
    </Link>
  );
}