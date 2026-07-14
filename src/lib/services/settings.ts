import "server-only";

import { db } from "@/lib/db";

/** Typed read of the restaurant contact CMS setting with defaults. */
export async function getContactSettings() {
  const setting = await db.siteSetting.findUnique({
    where: { key: "restaurant.contact" },
  });
  const value =
    setting && typeof setting.value === "object"
      ? (setting.value as Record<string, string>)
      : {};
  return {
    address: value.address ?? "Königsallee 42, 40212 Düsseldorf",
    phone: value.phone ?? "+49 211 555 012 34",
    email: value.email ?? "kontakt@sofra-royale.example",
  };
}
