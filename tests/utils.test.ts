import { describe, it, expect } from "vitest";

import { formatPrice, slugify, getErrorMessage } from "@/lib/utils";

// Intl inserts a non-breaking space (U+00A0 or U+202F) before the € sign.
// Normalize any unicode space to a plain one so assertions stay stable
// across ICU/Node versions.
const money = (cents: number) => formatPrice(cents).replace(/[  \s]/g, " ");

describe("formatPrice", () => {
  it("formats euro cents as German currency", () => {
    expect(money(1299)).toBe("12,99 €");
  });

  it("formats zero", () => {
    expect(money(0)).toBe("0,00 €");
  });

  it("formats whole euros with trailing zeros", () => {
    expect(money(5000)).toBe("50,00 €");
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Lamm Shawarma")).toBe("lamm-shawarma");
  });

  it("strips German diacritics", () => {
    expect(slugify("Döner Dürüm")).toBe("doner-durum");
  });

  it("treats ß as a separator (it has no NFKD decomposition)", () => {
    expect(slugify("Grüße")).toBe("gru-e");
  });

  it("collapses non-alphanumerics and trims edges", () => {
    expect(slugify("  Menü #1 — Spezial!  ")).toBe("menu-1-spezial");
  });

  it("returns an empty string for symbol-only input", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("getErrorMessage", () => {
  it("reads the message from Error instances", () => {
    expect(getErrorMessage(new Error("kaputt"))).toBe("kaputt");
  });

  it("passes through raw strings", () => {
    expect(getErrorMessage("nope")).toBe("nope");
  });

  it("falls back to a German default for unknown shapes", () => {
    expect(getErrorMessage({ weird: true })).toBe(
      "Ein unerwarteter Fehler ist aufgetreten.",
    );
  });
});
