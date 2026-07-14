/**
 * Pure pricing & money math — the shared, side-effect-free core used by
 * the coupon, checkout and order services. Deliberately free of any
 * `server-only`, database or framework imports so it can be unit-tested
 * in isolation and reused on either side of the boundary.
 *
 * All money is in integer euro cents (see prisma/schema.prisma).
 */

export type CouponType = "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_DELIVERY";

/**
 * Compute a coupon's discount (in cents) and free-delivery flag from
 * already-resolved inputs. `eligibleSubtotal` is the portion of the cart
 * the coupon may act on (after product/category scoping). The discount is
 * clamped so it can never exceed the eligible subtotal or go negative.
 */
export function computeCouponDiscount(input: {
  type: CouponType;
  value: number;
  maxDiscountAmount: number | null;
  eligibleSubtotal: number;
}): { discount: number; freeDelivery: boolean } {
  const eligible = Math.max(0, Math.round(input.eligibleSubtotal));
  switch (input.type) {
    case "PERCENTAGE": {
      let discount = Math.round((eligible * input.value) / 100);
      if (input.maxDiscountAmount !== null) {
        discount = Math.min(discount, input.maxDiscountAmount);
      }
      return { discount: Math.min(discount, eligible), freeDelivery: false };
    }
    case "FIXED_AMOUNT":
      return {
        discount: Math.min(Math.max(0, input.value), eligible),
        freeDelivery: false,
      };
    case "FREE_DELIVERY":
      return { discount: 0, freeDelivery: true };
  }
}

/** Standard (drink / dine-in) VAT rate; reduced (food) rate otherwise. */
export const VAT_STANDARD = 19;
export const VAT_REDUCED = 7;

/**
 * German VAT rate for a single order line. Dine-in service and all drinks
 * are taxed at the standard 19 %; food for delivery/pickup at 7 %.
 */
export function lineVatRate(opts: {
  dineIn: boolean;
  isDrink: boolean;
}): typeof VAT_STANDARD | typeof VAT_REDUCED {
  return opts.dineIn || opts.isDrink ? VAT_STANDARD : VAT_REDUCED;
}

/**
 * VAT *contained* within a gross (tax-inclusive) amount. German prices are
 * shown gross, so the tax is extracted rather than added:
 *   tax = gross × rate / (100 + rate)
 * Returned unrounded so callers can sum then round once.
 */
export function containedVat(grossCents: number, ratePercent: number): number {
  if (grossCents <= 0 || ratePercent <= 0) return 0;
  return (grossCents * ratePercent) / (100 + ratePercent);
}

/** Loyalty points earned for an order: one point per whole euro of total. */
export function loyaltyPointsFor(totalCents: number): number {
  if (!Number.isFinite(totalCents) || totalCents <= 0) return 0;
  return Math.floor(totalCents / 100);
}

// ---------------------------------------------------------------------------
// Order numbers — human-facing reference: SR-<4-digit-year>-<6 digits>.
// ---------------------------------------------------------------------------

export const ORDER_NUMBER_PATTERN = /^SR-\d{4}-\d{6}$/;

/** Whether a string is a well-formed Sofra Royale order number. */
export function isValidOrderNumber(value: string): boolean {
  return ORDER_NUMBER_PATTERN.test(value);
}

/**
 * Format an order number from a year and a numeric sequence. The sequence
 * is wrapped into the 6-digit space so callers may pass any integer
 * (e.g. a random draw) without overflowing the format.
 */
export function formatOrderNumber(year: number, sequence: number): string {
  const n = (((Math.trunc(sequence) % 1_000_000) + 1_000_000) % 1_000_000)
    .toString()
    .padStart(6, "0");
  return `SR-${year}-${n}`;
}
