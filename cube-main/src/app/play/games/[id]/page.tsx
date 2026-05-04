import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/server/db/prisma";
import { GameSandboxActions } from "./_components/GameSandboxActions";

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default async function PlayGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gameId = Number(id);
  if (!Number.isFinite(gameId)) {
    notFound();
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      creator: { include: { wallet: true } },
      opponent: { include: { wallet: true } },
      gamePlayers: { include: { user: { include: { wallet: true } } }, orderBy: { id: "asc" } },
      diceRolls: { orderBy: [{ rollRound: "asc" }, { createdAt: "asc" }] },
      ledgerEntries: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!game) {
    notFound();
  }

  const pot = (game.betAmount * 2n).toString();

  return (
    <main className="p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">/play/games/{game.id}</h1>
          <p className="text-sm text-gray-600">Sandbox-only game details</p>
        </div>
        <div className="flex gap-2">
          <Link className="rounded bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black" href="/play">
            /play
          </Link>
          <Link className="rounded bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black" href="/admin/games">
            /admin/games
          </Link>
        </div>
      </div>

      <div className="mb-6 rounded border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
        Sandbox only. No real payments. No production gambling. Not connected to Telegram.
      </div>

      <section className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Game</h2>
          <dl className="mt-3 grid grid-cols-1 gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">publicCode</dt>
              <dd className="font-mono">{game.publicCode}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">status</dt>
              <dd className="font-mono">{game.status}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">betAmount</dt>
              <dd className="font-mono">{game.betAmount.toString()}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">pot</dt>
              <dd className="font-mono">{pot}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">diceCount</dt>
              <dd className="font-mono">{game.diceCount}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">expiresAt</dt>
              <dd className="font-mono">{game.expiresAt.toISOString()}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">winnerUserId</dt>
              <dd className="font-mono">{game.winnerUserId ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">loserUserId</dt>
              <dd className="font-mono">{game.loserUserId ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">resultReason</dt>
              <dd className="font-mono">{game.resultReason ?? "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Players & wallets</h2>
          <div className="mt-3 overflow-x-auto rounded border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-3">Role</th>
                  <th className="p-3">User</th>
                  <th className="p-3">EscrowLocked</th>
                  <th className="p-3">Available</th>
                  <th className="p-3">Locked</th>
                </tr>
              </thead>
              <tbody>
                {game.gamePlayers.map((gp) => (
                  <tr key={gp.id} className="border-t">
                    <td className="p-3 font-mono">{gp.role}</td>
                    <td className="p-3">
                      <div className="font-medium">
                        {gp.user.displayName ?? gp.user.username ?? gp.user.telegramUserId}
                      </div>
                      <div className="text-xs text-gray-500">id={gp.userId}</div>
                    </td>
                    <td className="p-3 font-mono">{gp.escrowLockedAmount.toString()}</td>
                    <td className="p-3 font-mono">
                      {gp.user.wallet ? gp.user.wallet.availableBalance.toString() : "—"}
                    </td>
                    <td className="p-3 font-mono">
                      {gp.user.wallet ? gp.user.wallet.lockedBalance.toString() : "—"}
                    </td>
                  </tr>
                ))}
                {game.gamePlayers.length === 0 ? (
                  <tr>
                    <td className="p-3 text-gray-600" colSpan={5}>
                      No players
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="mb-10">
        <GameSandboxActions
          gameId={game.id}
          diceCount={game.diceCount}
          creatorUserId={game.creatorUserId}
          opponentUserId={game.opponentUserId}
        />
      </div>

      <section className="mb-10 space-y-3">
        <h2 className="text-lg font-semibold">Dice rolls</h2>
        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Round</th>
                <th className="p-3">User</th>
                <th className="p-3">diceValue</th>
                <th className="p-3">diceCount</th>
                <th className="p-3">totalValue</th>
                <th className="p-3">source</th>
                <th className="p-3">createdAt</th>
              </tr>
            </thead>
            <tbody>
              {game.diceRolls.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-mono">{r.rollRound}</td>
                  <td className="p-3 font-mono">{r.userId}</td>
                  <td className="p-3 font-mono">{r.diceValue}</td>
                  <td className="p-3 font-mono">{r.diceCount}</td>
                  <td className="p-3 font-mono">{r.totalValue}</td>
                  <td className="p-3 font-mono">{r.source}</td>
                  <td className="p-3 font-mono">{r.createdAt.toISOString()}</td>
                </tr>
              ))}
              {game.diceRolls.length === 0 ? (
                <tr>
                  <td className="p-3 text-gray-600" colSpan={7}>
                    No rolls recorded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Ledger entries (gameId = {game.id})</h2>
        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">createdAt</th>
                <th className="p-3">entryType</th>
                <th className="p-3">direction</th>
                <th className="p-3">amount</th>
                <th className="p-3">userId</th>
                <th className="p-3">idempotencyKey</th>
              </tr>
            </thead>
            <tbody>
              {game.ledgerEntries.map((e) => (
                <tr key={e.id} className="border-t align-top">
                  <td className="p-3 font-mono">{e.createdAt.toISOString()}</td>
                  <td className="p-3 font-mono">{e.entryType}</td>
                  <td className="p-3 font-mono">{e.direction}</td>
                  <td className="p-3 font-mono">{e.amount.toString()}</td>
                  <td className="p-3 font-mono">{e.userId}</td>
                  <td className="p-3 font-mono text-xs">{e.idempotencyKey}</td>
                </tr>
              ))}
              {game.ledgerEntries.length === 0 ? (
                <tr>
                  <td className="p-3 text-gray-600" colSpan={6}>
                    No ledger entries attached to this game yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <details className="rounded border bg-white p-4">
          <summary className="cursor-pointer text-sm font-medium">Raw ledger metadata</summary>
          <pre className="mt-3 overflow-x-auto rounded bg-gray-950 p-3 text-xs text-gray-100">
            {formatJson(game.ledgerEntries.map((e) => ({ id: e.id, metadata: e.metadata })))}
          </pre>
        </details>
      </section>
    </main>
  );
}
