"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LogOut, ShieldCheck, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

const STAFF_ROLES = ["STAFF", "MANAGER", "ADMIN", "SUPER_ADMIN"];

/** Header account area: login/register CTAs or the user menu. */
export function UserNav() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <Skeleton className="h-10 w-10 rounded-full" />;
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" asChild>
          <Link href="/login">Anmelden</Link>
        </Button>
        <Button variant="gold" asChild className="hidden sm:inline-flex">
          <Link href="/register">Konto erstellen</Link>
        </Button>
      </div>
    );
  }

  const { user } = session;
  const initials =
    user.name
      ?.split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "SR";
  const isStaff = STAFF_ROLES.includes(user.role);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Kontomenü öffnen"
        >
          <Avatar>
            {user.image ? (
              <AvatarImage src={user.image} alt={user.name ?? "Profilbild"} />
            ) : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <User /> Mein Konto
          </Link>
        </DropdownMenuItem>
        {isStaff ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <ShieldCheck /> Admin-Dashboard
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/login", redirect: true })}
          className="text-destructive focus:text-destructive"
        >
          <LogOut /> Abmelden
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
