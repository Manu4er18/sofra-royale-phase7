"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { adminNavGroups } from "@/config/nav";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/i18n/language-provider";
import {
  useCallIndicator,
  VideoCallBadge,
} from "@/components/chat/call-indicator";

/** Admin sidebar (desktop) / horizontal scroll nav (mobile). */
export function AdminSidebar({
  messageUnread = 0,
}: {
  messageUnread?: number;
}) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const call = useCallIndicator();

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <nav aria-label="Admin-Navigation" className="space-y-5">
      {adminNavGroups.map((group) => (
        <div key={group.title}>
          <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t(group.labelKey)}
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
                  <span className="inline-flex items-center gap-2">
                    <span>{item.labelKey ? t(item.labelKey) : item.title}</span>
                    {item.href === "/admin/messages" ? (
                      <span className="relative inline-flex h-5 min-w-5 items-center justify-center">
                        {call?.active ? (
                          <VideoCallBadge className="static h-5 min-w-5 ring-0" />
                        ) : messageUnread > 0 ? (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-600 px-1 text-[10px] font-bold text-white">
                            {messageUnread > 99 ? "99+" : messageUnread}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
