import { describe, it, expect } from "vitest";

import { ORDER_TRANSITIONS } from "@/lib/order-transitions";

describe("ORDER_TRANSITIONS", () => {
  it("allows the happy-path delivery flow", () => {
    expect(ORDER_TRANSITIONS.CONFIRMED).toContain("PREPARING");
    expect(ORDER_TRANSITIONS.PREPARING).toContain("OUT_FOR_DELIVERY");
    expect(ORDER_TRANSITIONS.OUT_FOR_DELIVERY).toContain("DELIVERED");
    expect(ORDER_TRANSITIONS.DELIVERED).toContain("COMPLETED");
  });

  it("allows the pickup flow", () => {
    expect(ORDER_TRANSITIONS.PREPARING).toContain("READY_FOR_PICKUP");
    expect(ORDER_TRANSITIONS.READY_FOR_PICKUP).toContain("COMPLETED");
  });

  it("permits cancellation only up to preparation", () => {
    expect(ORDER_TRANSITIONS.PENDING).toContain("CANCELLED");
    expect(ORDER_TRANSITIONS.PAID).toContain("CANCELLED");
    expect(ORDER_TRANSITIONS.CONFIRMED).toContain("CANCELLED");
    expect(ORDER_TRANSITIONS.PREPARING).toContain("CANCELLED");
  });

  it("does not allow cancelling an order already out for delivery", () => {
    expect(ORDER_TRANSITIONS.OUT_FOR_DELIVERY).not.toContain("CANCELLED");
  });

  it("treats COMPLETED and CANCELLED as terminal (no outgoing moves)", () => {
    expect(ORDER_TRANSITIONS.COMPLETED).toBeUndefined();
    expect(ORDER_TRANSITIONS.CANCELLED).toBeUndefined();
  });

  it("never lists a status as its own successor", () => {
    for (const [from, tos] of Object.entries(ORDER_TRANSITIONS)) {
      expect(tos).not.toContain(from);
    }
  });

  it("only from PENDING/PAID can an order be confirmed", () => {
    const canConfirm = Object.entries(ORDER_TRANSITIONS)
      .filter(([, tos]) => tos?.includes("CONFIRMED"))
      .map(([from]) => from)
      .sort();
    expect(canConfirm).toEqual(["PAID", "PENDING"]);
  });
});
