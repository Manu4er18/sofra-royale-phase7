"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Menu,
  MessageCircle,
  Search,
  ShoppingBag,
  UtensilsCrossed,
} from "lucide-react";

import { siteConfig } from "@/config/site";
import { mainNav } from "@/config/nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LanguageSelect,
  useLanguage,
} from "@/components/i18n/language-provider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserNav } from "@/components/layout/user-nav";
import { SearchBox } from "@/components/search/search-box";
import { StaffCallShortcut } from "@/components/chat/staff-call-shortcut";
import {
  useCallIndicator,
  VideoCallBadge,
} from "@/components/chat/call-indicator";

/**
 * Sticky site header: brand, nav, search, theme, cart badge, account.
 * `cartCount` is provided by the server layout and refreshes via
 * router.refresh() after every cart mutation.
 */
export function SiteHeader({
  cartCount = 0,
  notificationCount = 0,
  chatUnreadCount = 0,
  showStaffCallShortcut = false,
}: {
  cartCount?: number;
  notificationCount?: number;
  chatUnreadCount?: number;
  showStaffCallShortcut?: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { t } = useLanguage();
  const call = useCallIndicator();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-16 items-center gap-3">
        {/* Brand */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5"
          aria-label={`${siteConfig.name} — Startseite`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <UtensilsCrossed className="h-4 w-4" aria-hidden />
          </span>
          <span className="hidden flex-col leading-none sm:flex">
            <span className="font-display text-lg font-semibold tracking-wide">
              {siteConfig.name}
            </span>
            <span className="text-[0.65rem] uppercase tracking-[0.2em] text-gold">
              {siteConfig.tagline}
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav
          className="hidden items-center gap-0.5 lg:flex"
          aria-label="Hauptnavigation"
        >
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive(item.href)
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {item.labelKey ? t(item.labelKey) : item.title}
            </Link>
          ))}
        </nav>

        {/* Search (desktop) */}
        <div className="ml-auto hidden w-full max-w-xs md:block">
          <SearchBox />
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          {/* Search shortcut (mobile) */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            asChild
            aria-label={t("site.nav.search")}
          >
            <Link href="/search">
              <Search className="h-5 w-5" />
            </Link>
          </Button>

          {/* Notifications (logged-in only, count > 0 gets a badge) */}
          {notificationCount > 0 ? (
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              asChild
              aria-label={`${t("site.nav.notifications")}, ${notificationCount} ${t("common.unread")}`}
            >
              <Link href="/account/notifications">
                <Bell className="h-5 w-5" />
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[0.7rem] font-bold text-destructive-foreground">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              </Link>
            </Button>
          ) : null}

          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={`${t("site.nav.messages")}, ${chatUnreadCount} ${t("common.unread")}`}
            onClick={() => window.dispatchEvent(new Event("sofra:open-chat"))}
          >
            <MessageCircle className="h-5 w-5" />
            {call?.active ? (
              <VideoCallBadge className="h-5 min-w-5" />
            ) : chatUnreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[0.7rem] font-bold text-destructive-foreground">
                {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
              </span>
            ) : null}
          </Button>

          {/* Cart */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            asChild
            aria-label={`${t("site.nav.cart")}, ${cartCount}`}
          >
            <Link href="/cart">
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[0.7rem] font-bold text-gold-foreground">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              ) : null}
            </Link>
          </Button>

          <LanguageSelect compact />
          <ThemeToggle />
          {showStaffCallShortcut ? <StaffCallShortcut /> : null}
          <UserNav />

          {/* Mobile nav */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label={t("site.nav.openMenu")}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle className="font-display">
                  {siteConfig.name}
                </SheetTitle>
              </SheetHeader>
              <nav
                className="mt-6 flex flex-col gap-1"
                aria-label="Mobile Navigation"
              >
                {mainNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "rounded-md px-3 py-2.5 text-base font-medium transition-colors hover:bg-accent",
                      isActive(item.href)
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {item.labelKey ? t(item.labelKey) : item.title}
                  </Link>
                ))}
                <Link
                  href="/cart"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-3 py-2.5 text-base font-medium text-muted-foreground transition-colors hover:bg-accent"
                >
                  {t("site.nav.cart")}
                  {cartCount > 0 ? ` (${cartCount})` : ""}
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
