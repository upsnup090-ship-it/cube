import Link from "next/link";
import prisma from "@/server/db/prisma";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      telegramUserId: true,
      username: true,
      displayName: true,
      status: true,
      createdAt: true,
    },
  });

  return (
    <main className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Users</h1>
        <Link href="/admin" className="text-sm text-blue-700 hover:underline">
          Back to overview
        </Link>
      </div>

      {users.length === 0 ? (
        <p className="rounded border bg-white p-4 text-sm text-gray-600">No users found.</p>
      ) : (
        <div className="overflow-x-auto rounded border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">id</th>
                <th className="px-3 py-2">telegramUserId</th>
                <th className="px-3 py-2">username</th>
                <th className="px-3 py-2">displayName</th>
                <th className="px-3 py-2">status</th>
                <th className="px-3 py-2">createdAt</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="px-3 py-2">{user.id}</td>
                  <td className="px-3 py-2">{user.telegramUserId}</td>
                  <td className="px-3 py-2">{user.username ?? "-"}</td>
                  <td className="px-3 py-2">{user.displayName ?? "-"}</td>
                  <td className="px-3 py-2">{user.status}</td>
                  <td className="px-3 py-2">{user.createdAt.toISOString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
