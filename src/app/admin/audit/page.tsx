import Link from "next/link";
import prisma from "@/server/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const filterAction = sp.action ?? undefined;
  const filterResourceType = sp.resourceType ?? undefined;
  const filterActorId = sp.actorId ?? undefined;

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(filterAction ? { action: filterAction } : {}),
      ...(filterResourceType ? { resourceType: filterResourceType } : {}),
      ...(filterActorId ? { actorId: filterActorId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      actorType: true,
      actorId: true,
      action: true,
      resourceType: true,
      resourceId: true,
      createdAt: true,
    },
  });

  const activeFilters = [filterAction, filterResourceType, filterActorId && `actor:${filterActorId}`].filter(Boolean);

  return (
    <main className="p-8 max-w-7xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Audit Logs</h1>
        <Link href="/admin" className="text-sm text-blue-700 hover:underline">
          Back to overview
        </Link>
      </div>

      <form method="GET" className="mb-4 flex flex-wrap gap-2">
        <input name="action" defaultValue={sp.action ?? ""} placeholder="Filter by action" className="rounded border px-2 py-1 text-sm w-44" />
        <input name="resourceType" defaultValue={sp.resourceType ?? ""} placeholder="resourceType" className="rounded border px-2 py-1 text-sm w-36" />
        <input name="actorId" defaultValue={sp.actorId ?? ""} placeholder="actorId" className="rounded border px-2 py-1 text-sm w-36" />
        <button type="submit" className="rounded bg-gray-800 px-3 py-1 text-sm text-white hover:bg-black">Filter</button>
        {activeFilters.length > 0 && <Link href="/admin/audit" className="rounded border px-3 py-1 text-sm hover:bg-gray-50">Clear</Link>}
      </form>

      {activeFilters.length > 0 && (
        <p className="mb-3 text-xs text-gray-500">Filtered by: {activeFilters.join(", ")} — {logs.length} results</p>
      )}

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
                <th className="px-3 py-2">resourceId</th>
                <th className="px-3 py-2">createdAt</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const resourceLink =
                  log.resourceType === "user" && log.resourceId
                    ? `/admin/users/${log.resourceId}`
                    : log.resourceType === "game" && log.resourceId
                    ? `/admin/games/${log.resourceId}`
                    : null;

                return (
                  <tr key={log.id} className="border-t">
                    <td className="px-3 py-2">{log.id}</td>
                    <td className="px-3 py-2">{log.actorType}</td>
                    <td className="px-3 py-2">{log.actorId ?? "-"}</td>
                    <td className="px-3 py-2 font-medium">{log.action}</td>
                    <td className="px-3 py-2">{log.resourceType}</td>
                    <td className="px-3 py-2">
                      {resourceLink ? (
                        <Link href={resourceLink} className="text-blue-700 hover:underline">{log.resourceId}</Link>
                      ) : (
                        log.resourceId ?? "-"
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">{log.createdAt.toISOString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
