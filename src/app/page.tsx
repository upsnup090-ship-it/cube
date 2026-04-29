import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-4">BigPlayBot Dices</h1>
      <p className="mb-6">Foundation setup – admin dashboard is ready.</p>
      <Link
        href="/admin"
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Перейти в админ‑панель
      </Link>
    </main>
  );
}