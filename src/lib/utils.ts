import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes without conflicts (shadcn convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format an amount stored in euro cents for display.
 * All money in the database is Int cents — see prisma/schema.prisma.
 */
export function formatPrice(
  cents: number,
  options: { currency?: string; locale?: string } = {},
) {
  const { currency = "EUR", locale = "de-DE" } = options;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/** Slugify a string for URLs (menu items, blog posts …). */
export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/** Safe error message extraction for catch blocks. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Ein unerwarteter Fehler ist aufgetreten.";
}
