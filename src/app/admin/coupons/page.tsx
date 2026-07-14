import type { Metadata } from "next";

import { db } from "@/lib/db";
import {
  CouponManager,
  type CouponRow,
} from "@/components/admin/coupon-manager";

export const metadata: Metadata = {
  title: "Admin — Gutscheine",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const coupons = await db.coupon.findMany({
    orderBy: { createdAt: "desc" },
    // Exclude personal loyalty coupons (customer-scoped) from admin CRUD.
    where: { customerId: null },
  });

  const rows: CouponRow[] = coupons.map((c) => ({
    id: c.id,
    code: c.code,
    description: c.description,
    type: c.type,
    value: c.value,
    minOrderAmount: c.minOrderAmount,
    maxDiscountAmount: c.maxDiscountAmount,
    usageLimit: c.usageLimit,
    usageLimitPerUser: c.usageLimitPerUser,
    usedCount: c.usedCount,
    isFirstOrderOnly: c.isFirstOrderOnly,
    startsAt: c.startsAt?.toISOString() ?? null,
    expiresAt: c.expiresAt?.toISOString() ?? null,
    isActive: c.isActive,
  }));

  return <CouponManager coupons={rows} />;
}
