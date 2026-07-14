import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js configuration.
 *
 * This file is imported by `src/middleware.ts`, which runs on the Edge
 * runtime — it must NOT import Prisma, bcrypt, or any Node-only module.
 * Providers that need the database are added in `src/lib/auth/index.ts`.
 */
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    // 30 days; "remember me" is handled by re-issuing the cookie.
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [
    // Filled in `src/lib/auth/index.ts` (Node runtime only).
  ],
  callbacks: {
    /**
     * Route protection for middleware. Fine-grained permission checks
     * happen again in server components/actions — defense in depth.
     */
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const user = auth?.user;

      const isAdminArea = pathname.startsWith("/admin");
      const isAccountArea = pathname.startsWith("/account");

      if (isAdminArea) {
        if (!user) return false; // redirects to /login
        const staffRoles = ["STAFF", "MANAGER", "ADMIN", "SUPER_ADMIN"];
        if (!staffRoles.includes(user.role ?? "")) {
          // Authenticated but not staff → send to the customer area
          // instead of exposing that /admin exists in detail.
          return Response.redirect(new URL("/account", request.nextUrl));
        }
        return true;
      }

      if (isAccountArea) {
        return !!user;
      }

      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "CUSTOMER";
      }
      // Allow profile updates to refresh the token (e.g. name change).
      if (trigger === "update" && session?.user?.name) {
        token.name = session.user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.id === "string") session.user.id = token.id;
      if (typeof token.role === "string") {
        session.user.role = token.role as typeof session.user.role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
