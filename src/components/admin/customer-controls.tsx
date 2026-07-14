"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { toast } from "sonner";

import {
  changeUserRole,
  toggleCustomerActive,
} from "@/actions/admin/moderation";
import { Button } from "@/components/ui/button";

const ROLE_LABEL: Record<UserRole, string> = {
  CUSTOMER: "Kunde",
  STAFF: "Personal",
  MANAGER: "Manager",
  ADMIN: "Administrator",
  SUPER_ADMIN: "Super-Admin",
};

/** Activate/deactivate + (super-admin only) role change. */
export function CustomerControls({
  userId,
  isActive,
  role,
  canManageRoles,
  isSelf,
}: {
  userId: string;
  isActive: boolean;
  role: UserRole;
  canManageRoles: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function toggleActive() {
    startTransition(async () => {
      const result = await toggleCustomerActive(userId);
      if (!result.success) toast.error(result.error);
      else toast.success(result.message);
      router.refresh();
    });
  }

  function setRole(next: UserRole) {
    startTransition(async () => {
      const result = await changeUserRole({ userId, role: next });
      if (!result.success) toast.error(result.error);
      else toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canManageRoles && !isSelf ? (
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          disabled={isPending}
          aria-label="Rolle ändern"
          className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      ) : null}
      {!isSelf ? (
        <Button
          size="sm"
          variant={isActive ? "ghost" : "outline"}
          className={isActive ? "text-destructive hover:text-destructive" : ""}
          disabled={isPending}
          onClick={toggleActive}
        >
          {isActive ? "Sperren" : "Entsperren"}
        </Button>
      ) : (
        <span className="text-xs text-muted-foreground">Ihr Konto</span>
      )}
    </div>
  );
}
