import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasMinimumRole } from "@/lib/auth/rbac";

export const metadata: Metadata = {
  title: "Admin — Audit-Log",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const session = await auth();
  // Audit trail is sensitive → MANAGER+ only.
  if (!session?.user || !hasMinimumRole(session.user.role, "MANAGER")) {
    redirect("/admin");
  }

  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Audit-Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Protokoll aller privilegierten Aktionen (letzte 200 Einträge).
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Zeitpunkt</th>
              <th className="px-4 py-3">Benutzer</th>
              <th className="px-4 py-3">Aktion</th>
              <th className="px-4 py-3">Objekt</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Noch keine Einträge.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                    {log.createdAt.toLocaleString("de-DE")}
                  </td>
                  <td className="px-4 py-2.5">
                    {log.user?.name ?? log.user?.email ?? "System"}
                  </td>
                  <td className="px-4 py-2.5">
                    <code className="text-xs">{log.action}</code>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {log.entity}
                    {log.entityId ? (
                      <span className="ml-1 text-xs">
                        #{log.entityId.slice(-6)}
                      </span>
                    ) : null}
                  </td>
                  <td className="max-w-xs truncate px-4 py-2.5 text-xs text-muted-foreground">
                    {log.changes ? JSON.stringify(log.changes) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
