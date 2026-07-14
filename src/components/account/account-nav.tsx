"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { accountNav } from "@/config/nav";
import { cn } from "@/lib/utils";

/** Sidebar (desktop) / scrollable pill row (mobile) for the account area. */
export function AccountNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/account" ? pathname === "/account" : pathname.startsWith(href);

  return (
    <nav aria-label="Konto-Navigation">
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:pb-0">
        {accountNav.map((item) => (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              className={cn(
                "block whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-gold/15 text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
