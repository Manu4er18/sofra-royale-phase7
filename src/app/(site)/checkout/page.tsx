import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAppliedCouponCode, getCartSummary } from "@/lib/services/cart";
import {
  CheckoutForm,
  type SavedAddress,
} from "@/components/checkout/checkout-form";

export const metadata: Metadata = {
  title: "Kasse",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const cart = await getCartSummary();
  if (cart.lines.length === 0) redirect("/cart");

  const session = await auth();
  const user = session?.user;

  let savedAddresses: SavedAddress[] = [];
  let phone = "";
  if (user?.id) {
    const [addresses, dbUser] = await Promise.all([
      db.address.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        take: 5,
      }),
      db.user.findUnique({
        where: { id: user.id },
        select: { phone: true },
      }),
    ]);
    savedAddresses = addresses.map((a) => ({
      id: a.id,
      label: a.label,
      recipientName: a.recipientName,
      street: a.street,
      houseNumber: a.houseNumber,
      postalCode: a.postalCode,
      city: a.city,
      isDefault: a.isDefault,
    }));
    phone = dbUser?.phone ?? addresses[0]?.phone ?? "";
  }

  const appliedCoupon = await getAppliedCouponCode();

  return (
    <div className="container py-10">
      <header className="mb-8">
        <p className="text-sm uppercase tracking-widest text-gold">
          Fast geschafft
        </p>
        <h1 className="mt-1 text-3xl font-semibold">Kasse</h1>
      </header>

      <CheckoutForm
        isLoggedIn={!!user}
        defaultContact={{
          name: user?.name ?? "",
          email: user?.email ?? "",
          phone,
        }}
        savedAddresses={savedAddresses}
        appliedCoupon={appliedCoupon}
        subtotal={cart.subtotal}
      />
    </div>
  );
}
