import "server-only";

import type { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser, AuthorizationError } from "@/lib/auth/rbac";

/**
 * Fine-grained permission layer on top of the coarse UserRole enum.
 *
 * SUPER_ADMIN implicitly has every permission. For other staff, a
 * permission is granted when ANY Role assigned to the user (via
 * UserRole2) includes it. Results are request-memoized to avoid
 * repeated lookups within a single action.
 */

/** Canonical permission keys (kept in sync with the seed). */
export const PERMISSIONS = {
  ordersRead: "orders:read",
  ordersWrite: "orders:write",
  ordersRefund: "orders:refund",
  menuRead: "menu:read",
  menuWrite: "menu:write",
  customersRead: "customers:read",
  customersWrite: "customers:write",
  reservationsRead: "reservations:read",
  reservationsWrite: "reservations:write",
  chatRead: "chat:read",
  chatWrite: "chat:write",
  contentWrite: "content:write",
  settingsWrite: "settings:write",
  analyticsRead: "analytics:read",
  staffManage: "staff:manage",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * All permission keys granted to a user via their assigned Roles.
 * Not cached across requests — permission grants change in the admin UI
 * and must take effect immediately (the query is small and infrequent).
 */
export async function getUserPermissions(
  userId: string,
  role: UserRole,
): Promise<Set<string>> {
  if (role === "SUPER_ADMIN") {
    return new Set(Object.values(PERMISSIONS));
  }
  const grants = await db.userRole2.findMany({
    where: { userId },
    select: {
      role: {
        select: {
          permissions: { select: { permission: { select: { key: true } } } },
        },
      },
    },
  });
  const keys = new Set<string>();
  for (const g of grants) {
    for (const rp of g.role.permissions) keys.add(rp.permission.key);
  }
  return keys;
}

/** True when the current user holds the permission. */
export async function can(permission: PermissionKey): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  const perms = await getUserPermissions(user.id, user.role);
  return perms.has(permission);
}

/** Guard for server actions — throws when the permission is missing. */
export async function requirePermission(permission: PermissionKey) {
  const user = await getSessionUser();
  if (!user) throw new AuthorizationError("Bitte melden Sie sich an.");
  if (user.role === "SUPER_ADMIN") return user;
  const perms = await getUserPermissions(user.id, user.role);
  if (!perms.has(permission)) {
    throw new AuthorizationError(
      "Ihnen fehlt die Berechtigung für diese Aktion.",
    );
  }
  return user;
}
