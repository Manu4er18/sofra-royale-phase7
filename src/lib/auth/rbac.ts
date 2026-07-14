import "server-only";

import type { UserRole } from "@prisma/client";
import { auth } from "@/lib/auth";

/** Roles allowed into the admin dashboard, weakest first. */
const ROLE_ORDER: UserRole[] = [
  "CUSTOMER",
  "STAFF",
  "MANAGER",
  "ADMIN",
  "SUPER_ADMIN",
];

export const STAFF_ROLES: UserRole[] = [
  "STAFF",
  "MANAGER",
  "ADMIN",
  "SUPER_ADMIN",
];

export function hasMinimumRole(role: UserRole, minimum: UserRole): boolean {
  return ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(minimum);
}

/**
 * Server-side guard for pages/actions. Returns the session or throws —
 * callers in pages should redirect instead; use `requireUser` there.
 */
export async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}

export class AuthorizationError extends Error {
  constructor(message = "Nicht autorisiert.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Guard for server actions — throws when the caller lacks the role. */
export async function requireRole(minimum: UserRole) {
  const user = await getSessionUser();
  if (!user) throw new AuthorizationError("Bitte melden Sie sich an.");
  if (!hasMinimumRole(user.role, minimum)) {
    throw new AuthorizationError();
  }
  return user;
}
