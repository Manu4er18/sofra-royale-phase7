"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { adminNavGroups } from "@/config/nav";
import { cn } from "@/lib/utils";

/** Admin sidebar (desktop) / horizontal scroll nav (mobile). */
export function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <nav aria-label="Admin-Navigation" className="space-y-5">
      {adminNavGroups.map((group) => (
        <div key={group.title}>
          <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group.title}
          </p>
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">
            {group.items.map((item) => (
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
        </div>
      ))}
    </nav>
  );
}
