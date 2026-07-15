import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { auth } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/auth/rbac";
import { siteConfig } from "@/config/site";
import { getStaffUnreadChatSummaries } from "@/lib/services/chat";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminCallListener } from "@/components/chat/admin-call-listener";
import { AdminMessageButton } from "@/components/chat/admin-message-button";
import { LanguageSelect } from "@/components/i18n/language-provider";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserNav } from "@/components/layout/user-nav";

/**
 * Admin dashboard shell: role-gated (staff+), own header + sidebar.
 * The Edge middleware blocks non-staff before this even renders;
 * write-actions additionally enforce MANAGER/ADMIN via requireRole.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin");
  if (!STAFF_ROLES.includes(session.user.role)) redirect("/account");
  const chatUnread = await getStaffUnreadChatSummaries();

  return (
    <div className="flex min-h-screen flex-col">
      <AdminCallListener />
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="h-4 w-4" aria-hidden />
            </span>
            <span className="leading-none">
              <span className="block font-display text-lg font-semibold">
                {siteConfig.name}
              </span>
              <span className="text-[0.65rem] uppercase tracking-[0.2em] text-gold">
                Admin-Dashboard
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-1.5">
            <Link
              href="/"
              className="mr-2 hidden text-sm text-muted-foreground underline-offset-4 hover:underline sm:block"
            >
              Zur Website
            </Link>
            <LanguageSelect compact />
            <ThemeToggle />
            <AdminMessageButton unread={chatUnread.totalUnread} />
            <UserNav />
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          <div className="lg:sticky lg:top-24">
            <AdminSidebar messageUnread={chatUnread.totalUnread} />
          </div>
        </aside>
        <main id="main-content" className="min-w-0 flex-1 pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
