import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCartItemCount } from "@/lib/services/cart";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ChatWidget } from "@/components/chat/chat-widget";
import { NotificationListener } from "@/components/layout/notification-listener";

/**
 * Public site shell: header (live cart badge + unread notifications),
 * content, footer. Reads cookies/session → renders dynamically, which
 * is correct for a personalized storefront.
 */
export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [cartCount, session] = await Promise.all([getCartItemCount(), auth()]);

  const notificationCount = session?.user?.id
    ? await db.notification.count({
        where: { userId: session.user.id, readAt: null },
      })
    : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader cartCount={cartCount} notificationCount={notificationCount} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <ChatWidget isLoggedIn={!!session?.user} />
      {session?.user?.id ? (
        <NotificationListener userId={session.user.id} />
      ) : null}
    </div>
  );
}
