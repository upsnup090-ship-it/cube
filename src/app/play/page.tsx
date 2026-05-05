import Link from "next/link";
import prisma from "@/server/db/prisma";

export const dynamic = "force-dynamic";

function SandboxWarning() {
  return (
    <div className="rounded border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
      <p className="font-semibold">Sandbox / demo only</p>
      <ul className="mt-2 list-inside list-disc space-y-1">
        <li>No real payments</li>
        <li>No production gambling</li>
        <li>Not connected to Telegram</li>
        <li>Demo users only (seeded in local DB)</li>
      </ul>
    </div>
  );
}

export default async function PlayIndexPage() {
  const demoUsers = await prisma.user.findMany({
    where: { telegramUserId: { startsWith: "demo_" } },
    include: { wallet: true },
    orderBy: { id: "asc" },
  });

  return (
    <main className="p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">BigPlayBot Dices</h1>
          <p className="text-sm text-gray-600">Playable PvP Dices sandbox flow</p>
        </div>
        <div className="flex gap-2">
          <Link className="rounded bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black" href="/admin">
            /admin
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <SandboxWarning />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/play/create"
          className="rounded border bg-white p-4 shadow-sm transition hover:bg-gray-50"
        >
          <h2 className="text-base font-semibold">Create game</h2>
          <p className="mt-1 text-sm text-gray-600">Call GameService.createGame()</p>
        </Link>
        <Link
          href="/play/join"
          className="rounded border bg-white p-4 shadow-sm transition hover:bg-gray-50"
        >
          <h2 className="text-base font-semibold">Join game</h2>
          <p className="mt-1 text-sm text-gray-600">Call GameService.joinGame()</p>
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Demo users & balances</h2>
        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">telegramUserId</th>
                <th className="p-3">Status</th>
                <th className="p-3">Available</th>
                <th className="p-3">Locked</th>
              </tr>
            </thead>
            <tbody>
              {demoUsers.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{u.displayName ?? u.username ?? `User #${u.id}`}</div>
                    <div className="text-xs text-gray-500">id={u.id}</div>
                  </td>
                  <td className="p-3 font-mono text-xs">{u.telegramUserId}</td>
                  <td className="p-3">{u.status}</td>
                  <td className="p-3">{u.wallet ? u.wallet.availableBalance.toString() : "—"}</td>
                  <td className="p-3">{u.wallet ? u.wallet.lockedBalance.toString() : "—"}</td>
                </tr>
              ))}
              {demoUsers.length === 0 ? (
                <tr>
                  <td className="p-3 text-gray-600" colSpan={5}>
                    No demo users found. Run seed: <code className="rounded bg-gray-100 px-1">npm run prisma:seed</code>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-gray-600">
          Tip: inspect data in <Link className="text-blue-700 hover:underline" href="/admin">/admin</Link>.
        </div>
      </section>
    </main>
  );
}

