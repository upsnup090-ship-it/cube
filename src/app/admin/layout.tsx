import type { ReactNode } from "react";
import Link from "next/link";
import { resolveAdminGuardDecision } from "@/server/admin/admin-guard";

type LayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: LayoutProps) {
  const decision = await resolveAdminGuardDecision();

  if (!decision.allowed) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold">Admin Access Restricted</h1>
        <p className="mt-3 text-sm text-gray-700">
          Admin guard is enabled and this request is not authorized.
        </p>
        <div className="mt-4 rounded border bg-white p-4 text-sm">
          <p>Mode: {decision.mode}</p>
          <p>Reason: {decision.reason}</p>
          <p className="mt-2">
            Use <code>ADMIN_GUARD_MODE=off</code> for local open access, or configure token mode with
            <code> ADMIN_GUARD_MODE=token</code> and <code>ADMIN_GUARD_TOKEN</code>.
          </p>
          <p className="mt-2">
            Session helper: <code>/api/admin/guard/session?token=&lt;token&gt;</code>
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="border-b bg-gray-50 px-8 py-2 text-xs text-gray-700">
        <span className="font-medium">Admin Guard</span>
        {": "}
        <span>{decision.mode}</span>
        {" · "}
        <span>{decision.reason}</span>
        {" · "}
        <Link href="/api/admin/guard/session?clear=1" className="text-blue-700 hover:underline">
          clear session
        </Link>
      </div>
      {children}
    </>
  );
}
