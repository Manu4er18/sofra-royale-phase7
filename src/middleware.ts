import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

/**
 * Edge middleware — protects /admin/* and /account/* via the
 * `authorized` callback in `src/lib/auth/config.ts`.
 *
 * Only the edge-safe config is used here (no Prisma/bcrypt imports).
 */
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Skip static assets, Next internals, font/media chunks and API routes.
  matcher: [
    "/((?!api|_next|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
