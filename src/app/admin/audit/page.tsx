import Link from "next/link";
import prisma from "@/server/db/prisma";

export default async function AdminAuditPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      actorType: true,
      actorId: true,
      action: true,
      resourceType: true,
      createdAt: true,
    },
  });

  return (
    <main className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Audit Logs</h1>
        <Link href="/admin" className="text-sm text-blue-700 hover:underline">
          Back to overview
        </Link>
      </div>

      {logs.length === 0 ? (
        <p className="rounded border bg-white p-4 text-sm text-gray-600">No audit logs found.</p>
      ) : (
        <div className="overflow-x-auto rounded border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">id</th>
                <th className="px-3 py-2">actorType</th>
                <th className="px-3 py-2">actorId</th>
                <th className="px-3 py-2">action</th>
                <th className="px-3 py-2">resourceType</th>
                <th className="px-3 py-2">createdAt</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="px-3 py-2">{log.id}</td>
                  <td className="px-3 py-2">{log.actorType}</td>
                  <td className="px-3 py-2">{log.actorId ?? "-"}</td>
                  <td className="px-3 py-2">{log.action}</td>
                  <td className="px-3 py-2">{log.resourceType}</td>
                  <td className="px-3 py-2">{log.createdAt.toISOString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
