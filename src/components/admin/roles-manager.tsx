"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  toggleRolePermission,
  toggleUserRoleAssignment,
} from "@/actions/admin/roles";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type RoleData = {
  id: string;
  name: string;
  description: string | null;
  permissionIds: string[];
};

export type PermissionData = { id: string; key: string };

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  roleIds: string[];
};

/** Permission grid (roles × permissions) + role assignment per staff. */
export function RolesManager({
  roles,
  permissions,
  staff,
}: {
  roles: RoleData[];
  permissions: PermissionData[];
  staff: StaffMember[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function togglePerm(roleId: string, permissionId: string, grant: boolean) {
    startTransition(async () => {
      const result = await toggleRolePermission({
        roleId,
        permissionId,
        grant,
      });
      if (!result.success) toast.error(result.error);
      else toast.success(result.message);
      router.refresh();
    });
  }

  function toggleAssign(userId: string, roleId: string, assign: boolean) {
    startTransition(async () => {
      const result = await toggleUserRoleAssignment({ userId, roleId, assign });
      if (!result.success) toast.error(result.error);
      else toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rollen & Berechtigungen</CardTitle>
          <CardDescription>
            Feingranulare Rechte je Rolle. Super-Admins haben stets alle Rechte.
            Änderungen greifen sofort.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4">Berechtigung</th>
                {roles.map((role) => (
                  <th key={role.id} className="px-3 py-2 text-center">
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((permission) => (
                <tr key={permission.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    <code className="text-xs">{permission.key}</code>
                  </td>
                  {roles.map((role) => {
                    const granted = role.permissionIds.includes(permission.id);
                    return (
                      <td key={role.id} className="px-3 py-2 text-center">
                        <Checkbox
                          checked={granted}
                          disabled={isPending}
                          aria-label={`${permission.key} für ${role.name}`}
                          onCheckedChange={(c) =>
                            togglePerm(role.id, permission.id, c === true)
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rollenzuweisung</CardTitle>
          <CardDescription>
            Welche Rollen ein Teammitglied trägt (zusätzlich zur Basis-Rolle).
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {staff.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Kein Team-Personal vorhanden.
            </p>
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-4">Mitarbeiter</th>
                  {roles.map((role) => (
                    <th key={role.id} className="px-3 py-2 text-center">
                      {role.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <p className="font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.email}
                      </p>
                    </td>
                    {roles.map((role) => {
                      const assigned = member.roleIds.includes(role.id);
                      return (
                        <td key={role.id} className="px-3 py-2 text-center">
                          <Checkbox
                            checked={assigned}
                            disabled={isPending}
                            aria-label={`${role.name} für ${member.name}`}
                            onCheckedChange={(c) =>
                              toggleAssign(member.id, role.id, c === true)
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
