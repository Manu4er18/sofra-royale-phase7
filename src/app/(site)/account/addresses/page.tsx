import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  AddressManager,
  type AddressRow,
} from "@/components/account/address-manager";

export const metadata: Metadata = {
  title: "Adressen",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const session = await auth();
  if (!session?.user) return null;

  const addresses = await db.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  const rows: AddressRow[] = addresses.map((a) => ({
    id: a.id,
    label: a.label,
    type: a.type,
    recipientName: a.recipientName,
    phone: a.phone,
    street: a.street,
    houseNumber: a.houseNumber,
    addressLine2: a.addressLine2,
    postalCode: a.postalCode,
    city: a.city,
    deliveryNotes: a.deliveryNotes,
    isDefault: a.isDefault,
  }));

  return <AddressManager addresses={rows} />;
}
