import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCartItemCount } from "@/lib/services/cart";
import { getCustomerUnreadChatCount } from "@/lib/services/chat";
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

  const [notificationCount, chatUnreadCount] = session?.user?.id
    ? await Promise.all([
        db.notification.count({
          where: { userId: session.user.id, readAt: null },
        }),
        getCustomerUnreadChatCount(),
      ])
    : [0, 0];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        cartCount={cartCount}
        notificationCount={notificationCount}
        chatUnreadCount={chatUnreadCount}
      />
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
