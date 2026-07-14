import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ReceiptText } from "lucide-react";

import { auth } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/services/order";
import { ORDER_STATUS_LABEL } from "@/components/order/order-status-timeline";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Meine Bestellungen",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) return null; // layout guard handles redirect

  const orders = await getOrdersForUser(session.user.id);

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <ReceiptText className="h-7 w-7" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">Noch keine Bestellungen</h1>
          <p className="mt-2 max-w-md text-muted-foreground">
            Ihre Bestellungen erscheinen hier — inklusive Status und
            Bestellverlauf.
          </p>
        </div>
        <Button variant="gold" asChild>
          <Link href="/menu">Jetzt bestellen</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Meine Bestellungen</h1>
      <ul className="space-y-3">
        {orders.map((order) => (
          <li key={order.id}>
            <Link
              href={`/account/orders/${order.orderNumber}`}
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="transition-shadow hover:shadow-premium-lg">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{order.orderNumber}</p>
                      <Badge
                        variant={
                          order.status === "CANCELLED"
                            ? "destructive"
                            : order.status === "COMPLETED" ||
                                order.status === "DELIVERED"
                              ? "success"
                              : "secondary"
                        }
                      >
                        {ORDER_STATUS_LABEL[order.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {order.items
                        .map((i) => `${i.quantity}× ${i.productName}`)
                        .join(", ")}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold">
                    {formatPrice(order.total)}
                  </p>
                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
