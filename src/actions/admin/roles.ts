"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireRole, AuthorizationError } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/audit";
import { getErrorMessage } from "@/lib/utils";

export type AdminActionResult =
  | { success: true; message?: string }
  | { success: false; error: string };

/** Grant or revoke a single permission on a role (SUPER_ADMIN only). */
export async function toggleRolePermission(
  rawInput: unknown,
): Promise<AdminActionResult> {
  try {
    const staff = await requireRole("SUPER_ADMIN");
    const parsed = z
      .object({
        roleId: z.string().cuid(),
        permissionId: z.string().cuid(),
        grant: z.boolean(),
      })
      .safeParse(rawInput);
    if (!parsed.success) return { success: false, error: "Ungültige Eingabe." };
    const { roleId, permissionId, grant } = parsed.data;

    if (grant) {
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        create: { roleId, permissionId },
        update: {},
      });
    } else {
      await db.rolePermission.deleteMany({ where: { roleId, permissionId } });
    }

    await logAudit({
      userId: staff.id,
      action: grant ? "role.permission_granted" : "role.permission_revoked",
      entity: "Role",
      entityId: roleId,
      changes: { permissionId },
    });

    revalidatePath("/admin/roles");
    return { success: true, message: "Berechtigung aktualisiert." };
  } catch (error) {
    if (error instanceof AuthorizationError)
      return { success: false, error: error.message };
    console.error("[toggleRolePermission]", getErrorMessage(error));
    return { success: false, error: "Aktion fehlgeschlagen." };
  }
}

/** Assign or unassign a Role to a staff user (SUPER_ADMIN only). */
export async function toggleUserRoleAssignment(
  rawInput: unknown,
): Promise<AdminActionResult> {
  try {
    const staff = await requireRole("SUPER_ADMIN");
    const parsed = z
      .object({
        userId: z.string().cuid(),
        roleId: z.string().cuid(),
        assign: z.boolean(),
      })
      .safeParse(rawInput);
    if (!parsed.success) return { success: false, error: "Ungültige Eingabe." };
    const { userId, roleId, assign } = parsed.data;

    if (assign) {
      await db.userRole2.upsert({
        where: { userId_roleId: { userId, roleId } },
        create: { userId, roleId, assignedBy: staff.id },
        update: {},
      });
    } else {
      await db.userRole2.deleteMany({ where: { userId, roleId } });
    }

    await logAudit({
      userId: staff.id,
      action: assign ? "user.role_assigned" : "user.role_unassigned",
      entity: "User",
      entityId: userId,
      changes: { roleId },
    });

    revalidatePath("/admin/roles");
    return { success: true, message: "Zuweisung aktualisiert." };
  } catch (error) {
    if (error instanceof AuthorizationError)
      return { success: false, error: error.message };
    console.error("[toggleUserRoleAssignment]", getErrorMessage(error));
    return { success: false, error: "Aktion fehlgeschlagen." };
  }
}
