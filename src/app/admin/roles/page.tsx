import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  RolesManager,
  type PermissionData,
  type RoleData,
  type StaffMember,
} from "@/components/admin/roles-manager";

export const metadata: Metadata = {
  title: "Admin — Rollen & Rechte",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function AdminRolesPage() {
  const session = await auth();
  // Role/permission management is Super-Admin only.
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/admin");

  const [roles, permissions, staffUsers] = await Promise.all([
    db.role.findMany({
      orderBy: { name: "asc" },
      include: { permissions: { select: { permissionId: true } } },
    }),
    db.permission.findMany({ orderBy: { key: "asc" } }),
    db.user.findMany({
      where: {
        role: { in: ["STAFF", "MANAGER", "ADMIN", "SUPER_ADMIN"] },
        deletedAt: null,
      },
      orderBy: { name: "asc" },
      include: { userRoles: { select: { roleId: true } } },
    }),
  ]);

  const roleData: RoleData[] = roles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    permissionIds: r.permissions.map((p) => p.permissionId),
  }));
  const permissionData: PermissionData[] = permissions.map((p) => ({
    id: p.id,
    key: p.key,
  }));
  const staff: StaffMember[] = staffUsers.map((u) => ({
    id: u.id,
    name: u.name ?? "—",
    email: u.email,
    roleIds: u.userRoles.map((ur) => ur.roleId),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Rollen & Rechte</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Feingranulare Berechtigungen und Rollenzuweisungen für das Team.
        </p>
      </div>
      <RolesManager
        roles={roleData}
        permissions={permissionData}
        staff={staff}
      />
    </div>
  );
}
