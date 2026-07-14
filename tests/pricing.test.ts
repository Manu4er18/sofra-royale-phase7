import { describe, it, expect } from "vitest";

import {
  computeCouponDiscount,
  containedVat,
  lineVatRate,
  loyaltyPointsFor,
  formatOrderNumber,
  isValidOrderNumber,
  VAT_STANDARD,
  VAT_REDUCED,
} from "@/lib/pricing";

describe("computeCouponDiscount", () => {
  it("applies a percentage of the eligible subtotal", () => {
    const r = computeCouponDiscount({
      type: "PERCENTAGE",
      value: 10,
      maxDiscountAmount: null,
      eligibleSubtotal: 5000,
    });
    expect(r).toEqual({ discount: 500, freeDelivery: false });
  });

  it("rounds percentage discounts to whole cents", () => {
    const r = computeCouponDiscount({
      type: "PERCENTAGE",
      value: 15,
      maxDiscountAmount: null,
      eligibleSubtotal: 999, // 15% = 149.85 -> 150
    });
    expect(r.discount).toBe(150);
  });

  it("caps a percentage discount at maxDiscountAmount", () => {
    const r = computeCouponDiscount({
      type: "PERCENTAGE",
      value: 50,
      maxDiscountAmount: 1000,
      eligibleSubtotal: 8000, // 50% = 4000, capped to 1000
    });
    expect(r.discount).toBe(1000);
  });

  it("never lets a fixed discount exceed the eligible subtotal", () => {
    const r = computeCouponDiscount({
      type: "FIXED_AMOUNT",
      value: 5000,
      maxDiscountAmount: null,
      eligibleSubtotal: 3000,
    });
    expect(r.discount).toBe(3000);
  });

  it("applies a fixed discount below the subtotal verbatim", () => {
    const r = computeCouponDiscount({
      type: "FIXED_AMOUNT",
      value: 500,
      maxDiscountAmount: null,
      eligibleSubtotal: 3000,
    });
    expect(r.discount).toBe(500);
  });

  it("returns freeDelivery for FREE_DELIVERY coupons with no cash discount", () => {
    const r = computeCouponDiscount({
      type: "FREE_DELIVERY",
      value: 0,
      maxDiscountAmount: null,
      eligibleSubtotal: 3000,
    });
    expect(r).toEqual({ discount: 0, freeDelivery: true });
  });

  it("clamps negative or zero eligible subtotals to no discount", () => {
    const r = computeCouponDiscount({
      type: "PERCENTAGE",
      value: 20,
      maxDiscountAmount: null,
      eligibleSubtotal: -100,
    });
    expect(r.discount).toBe(0);
  });
});

describe("lineVatRate", () => {
  it("charges the standard rate for dine-in food", () => {
    expect(lineVatRate({ dineIn: true, isDrink: false })).toBe(VAT_STANDARD);
  });

  it("charges the standard rate for drinks regardless of channel", () => {
    expect(lineVatRate({ dineIn: false, isDrink: true })).toBe(19);
  });

  it("charges the reduced rate for delivered/pickup food", () => {
    expect(lineVatRate({ dineIn: false, isDrink: false })).toBe(VAT_REDUCED);
    expect(VAT_REDUCED).toBe(7);
  });
});

describe("containedVat", () => {
  it("extracts 7% contained VAT from a gross amount", () => {
    // 1070 gross at 7% contains 70 of tax.
    expect(Math.round(containedVat(1070, 7))).toBe(70);
  });

  it("extracts 19% contained VAT from a gross amount", () => {
    // 1190 gross at 19% contains 190 of tax.
    expect(Math.round(containedVat(1190, 19))).toBe(190);
  });

  it("returns 0 for non-positive gross or rate", () => {
    expect(containedVat(0, 19)).toBe(0);
    expect(containedVat(1000, 0)).toBe(0);
    expect(containedVat(-500, 19)).toBe(0);
  });
});

describe("loyaltyPointsFor", () => {
  it("awards one point per whole euro, floored", () => {
    expect(loyaltyPointsFor(0)).toBe(0);
    expect(loyaltyPointsFor(99)).toBe(0);
    expect(loyaltyPointsFor(100)).toBe(1);
    expect(loyaltyPointsFor(4599)).toBe(45);
  });

  it("ignores negative or non-finite totals", () => {
    expect(loyaltyPointsFor(-100)).toBe(0);
    expect(loyaltyPointsFor(Number.NaN)).toBe(0);
  });
});

describe("order numbers", () => {
  it("formats a padded 6-digit sequence", () => {
    expect(formatOrderNumber(2026, 42)).toBe("SR-2026-000042");
  });

  it("wraps sequences into the 6-digit space", () => {
    expect(formatOrderNumber(2026, 1_000_042)).toBe("SR-2026-000042");
  });

  it("accepts its own output as valid", () => {
    expect(isValidOrderNumber(formatOrderNumber(2026, 123456))).toBe(true);
  });

  it("rejects malformed order numbers", () => {
    expect(isValidOrderNumber("SR-2026-12345")).toBe(false); // 5 digits
    expect(isValidOrderNumber("XX-2026-123456")).toBe(false);
    expect(isValidOrderNumber("sr-2026-123456")).toBe(false);
    expect(isValidOrderNumber("")).toBe(false);
  });
});
