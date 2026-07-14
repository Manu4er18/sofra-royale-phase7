import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { AccountNav } from "@/components/account/account-nav";

/**
 * Customer area: session guard (defense in depth on top of the Edge
 * middleware) + sidebar navigation. Header/footer come from (site).
 */
export default async function AccountLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/account");

  return (
    <div className="container py-10">
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="lg:w-60 lg:shrink-0">
          <div className="lg:sticky lg:top-24">
            <AccountNav />
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
