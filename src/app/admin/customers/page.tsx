import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma, UserRole } from "@prisma/client";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { CustomerControls } from "@/components/admin/customer-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Admin — Kunden",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<UserRole, string> = {
  CUSTOMER: "Kunde",
  STAFF: "Personal",
  MANAGER: "Manager",
  ADMIN: "Administrator",
  SUPER_ADMIN: "Super-Admin",
};

export default async function AdminCustomersPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const view =
    typeof searchParams.view === "string" ? searchParams.view : "customers";

  const session = await auth();
  const canManageRoles = session?.user?.role === "SUPER_ADMIN";

  const where: Prisma.UserWhereInput = { deletedAt: null };
  if (view === "staff") {
    where.role = { in: ["STAFF", "MANAGER", "ADMIN", "SUPER_ADMIN"] };
  } else {
    where.role = "CUSTOMER";
  }
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: { select: { orders: true } },
      loyaltyAccount: { select: { balance: true } },
      orders: {
        where: {
          status: {
            in: ["DELIVERED", "COMPLETED", "PAID", "CONFIRMED", "PREPARING"],
          },
        },
        select: { total: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">
          {view === "staff" ? "Team" : "Kunden"}
        </h1>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/api/admin/export?type=customers"
          className="text-sm text-primary underline underline-offset-4 dark:text-gold"
        >
          CSV exportieren
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={view === "customers" ? "gold" : "outline"}
          size="sm"
          asChild
        >
          <Link href="/admin/customers?view=customers">Kunden</Link>
        </Button>
        <Button
          variant={view === "staff" ? "gold" : "outline"}
          size="sm"
          asChild
        >
          <Link href="/admin/customers?view=staff">Team</Link>
        </Button>
        <form method="get" className="ml-auto flex gap-2">
          <input type="hidden" name="view" value={view} />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Name oder E-Mail …"
            className="h-9 w-56"
            aria-label="Kunden suchen"
          />
          <Button type="submit" variant="secondary" size="sm" className="h-9">
            Suchen
          </Button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Rolle</th>
              <th className="px-4 py-3 text-right">Bestellungen</th>
              <th className="px-4 py-3 text-right">Umsatz</th>
              <th className="px-4 py-3 text-right">Punkte</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Keine Treffer.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const revenue = user.orders.reduce((s, o) => s + o.total, 0);
                return (
                  <tr
                    key={user.id}
                    className="border-b last:border-0 hover:bg-accent/40"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{user.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          user.role === "CUSTOMER" ? "secondary" : "gold"
                        }
                      >
                        {ROLE_LABEL[user.role]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user._count.orders}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatPrice(revenue)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user.loyaltyAccount?.balance ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      {user.isActive ? (
                        <span className="text-success">Aktiv</span>
                      ) : (
                        <span className="text-destructive">Gesperrt</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <CustomerControls
                        userId={user.id}
                        isActive={user.isActive}
                        role={user.role}
                        canManageRoles={canManageRoles}
                        isSelf={user.id === session?.user?.id}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
