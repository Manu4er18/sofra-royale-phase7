import type { OrderStatus } from "@prisma/client";
import {
  Check,
  ChefHat,
  CircleDashed,
  PackageCheck,
  Truck,
} from "lucide-react";

import { cn } from "@/lib/utils";

/** Human labels for every order status. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Eingegangen",
  PAYMENT_PENDING: "Zahlung ausstehend",
  PAID: "Bezahlt",
  CONFIRMED: "Bestätigt",
  PREPARING: "In Zubereitung",
  READY_FOR_PICKUP: "Abholbereit",
  OUT_FOR_DELIVERY: "Unterwegs",
  DELIVERED: "Zugestellt",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Storniert",
  REFUNDED: "Erstattet",
  PARTIALLY_REFUNDED: "Teilweise erstattet",
};

const DELIVERY_FLOW: OrderStatus[] = [
  "CONFIRMED",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];
const PICKUP_FLOW: OrderStatus[] = [
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "COMPLETED",
];

const STEP_ICON: Partial<Record<OrderStatus, typeof Check>> = {
  CONFIRMED: Check,
  PREPARING: ChefHat,
  OUT_FOR_DELIVERY: Truck,
  READY_FOR_PICKUP: PackageCheck,
  DELIVERED: PackageCheck,
  COMPLETED: PackageCheck,
};

/**
 * Visual progress of an order through its lifecycle. Real-time pushes
 * arrive in Phase 6 — until then the page shows the state at load time.
 */
export function OrderStatusTimeline({
  status,
  deliveryMethod,
}: {
  status: OrderStatus;
  deliveryMethod: "DELIVERY" | "PICKUP" | "DINE_IN";
}) {
  if (
    status === "CANCELLED" ||
    status === "REFUNDED" ||
    status === "PARTIALLY_REFUNDED"
  ) {
    return (
      <p className="rounded-md bg-destructive/10 p-4 text-sm font-medium text-destructive">
        Status: {ORDER_STATUS_LABEL[status]}
      </p>
    );
  }

  const flow = deliveryMethod === "DELIVERY" ? DELIVERY_FLOW : PICKUP_FLOW;
  // Map pre-flow states to "before step 0".
  const normalizedIndex =
    status === "PENDING" || status === "PAYMENT_PENDING"
      ? -1
      : status === "PAID"
        ? 0
        : status === "COMPLETED" && deliveryMethod === "DELIVERY"
          ? flow.length - 1
          : flow.indexOf(status);

  return (
    <ol className="grid gap-4 sm:grid-cols-4" aria-label="Bestellstatus">
      {flow.map((step, index) => {
        const reached = normalizedIndex >= index;
        const Icon = STEP_ICON[step] ?? CircleDashed;
        return (
          <li
            key={step}
            className="flex items-center gap-3 sm:flex-col sm:text-center"
          >
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2",
                reached
                  ? "border-gold bg-gold text-gold-foreground"
                  : "border-border text-muted-foreground",
              )}
              aria-hidden
            >
              <Icon className="h-5 w-5" />
            </span>
            <span
              className={cn(
                "text-sm",
                reached ? "font-medium" : "text-muted-foreground",
              )}
            >
              {ORDER_STATUS_LABEL[step]}
              {index === normalizedIndex ? (
                <span className="sr-only"> (aktueller Status)</span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
