export default function AdminDashboard() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">BigPlayBot Dices – Админ‑панель</h1>
      <p className="mb-4">Статус: Foundation setup</p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {['Users', 'Wallets', 'Games', 'Ledger', 'Audit Logs'].map((title) => (
          <div
            key={title}
            className="p-4 border rounded bg-white shadow-sm flex flex-col items-center"
          >
            <h2 className="font-medium">{title}</h2>
            <span className="text-sm text-gray-500">—</span>
          </div>
        ))}
      </div>
      <p className="mt-6 text-yellow-700">
        Внимание: логика кошелька и игры ещё не реализована.
      </p>
    </main>
  );
}