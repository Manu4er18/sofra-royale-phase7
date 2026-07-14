import "server-only";

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Audit trail for privileged mutations. Every admin action calls this —
 * failures are swallowed (logging must never break the mutation) but
 * reported to the server console.
 */
export async function logAudit(params: {
  userId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  changes?: Prisma.InputJsonValue;
}) {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        changes: params.changes,
      },
    });
  } catch (error) {
    console.error("[audit] failed to write audit log", error);
  }
}
