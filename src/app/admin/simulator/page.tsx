import Link from "next/link";

export default async function AdminSimulatorPage() {
  const isEnabled = process.env.DEV_PLAYER_SIMULATOR_ENABLED === "1";
  const mode = process.env.NODE_ENV ?? "development";

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dev Player Simulator</h1>
        <Link href="/admin" className="text-sm text-blue-700 hover:underline">Back to overview</Link>
      </div>

      <section className="rounded border bg-white p-4 text-sm space-y-2">
        <p><span className="font-medium">Environment:</span> {mode}</p>
        <p><span className="font-medium">DEV_PLAYER_SIMULATOR_ENABLED:</span> {isEnabled ? "1" : "0 / unset"}</p>
        <p className="text-gray-700">
          This tool is development-only and runs a deterministic local simulation:
          credit demo users, create game, join game, record rolls, resolve and settle.
        </p>
        <p className="text-gray-700">
          It uses only existing WalletService/GameService flows and never calls Telegram API.
        </p>
      </section>

      <section className="rounded border bg-white p-4 text-sm space-y-3">
        <h2 className="text-base font-semibold">Run</h2>
        <form action="/api/dev/player-simulator" method="post" target="_blank">
          <button
            type="submit"
            className="rounded border bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
            disabled={!isEnabled}
          >
            Run Dev Simulator (POST)
          </button>
        </form>
        {!isEnabled ? (
          <p className="text-red-700">Set DEV_PLAYER_SIMULATOR_ENABLED=1 to enable runs.</p>
        ) : null}
      </section>
    </main>
  );
}
