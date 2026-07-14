import "server-only";

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";

import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth/config";
import { loginSchema } from "@/lib/validations/auth";
import { checkRateLimit } from "@/lib/auth/rate-limit";

/**
 * Full Auth.js instance (Node runtime).
 *
 * - JWT session strategy so the Edge middleware can authorize without a
 *   database round-trip; the Prisma adapter still persists users and
 *   OAuth accounts.
 * - Credentials provider verifies bcrypt hashes and never leaks whether
 *   the email or the password was wrong.
 * - Every attempt is rate-limited and recorded in LoginHistory.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    Google({
      allowDangerousEmailAccountLinking: false,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema
          .pick({ email: true, password: true })
          .safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Brute-force protection: max 10 attempts / 15 min per email.
        const allowed = checkRateLimit(`login:${email}`, 10, 15 * 60_000);
        if (!allowed) return null;

        const user = await db.user.findUnique({ where: { email } });

        const recordAttempt = (success: boolean, userId?: string) =>
          db.loginHistory
            .create({
              data: { email, success, userId: userId ?? null },
            })
            .catch(() => {
              /* logging must never break login */
            });

        if (!user || !user.hashedPassword || !user.isActive || !user.emailVerified) {
          // Constant-ish time: still run a compare against a dummy hash
          // so missing users are not distinguishable by timing.
          await compare(
            password,
            "$2a$12$C6UzMDM.H6dfI/f/IKcEeO7ZBB1om4mCwGqvIfKB1lWpQZtSAcJwS",
          );
          await recordAttempt(false);
          return null;
        }

        const valid = await compare(password, user.hashedPassword);
        if (!valid) {
          await recordAttempt(false, user.id);
          return null;
        }

        await recordAttempt(true, user.id);
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  events: {
    async createUser({ user }) {
      // Every new user gets a profile + loyalty account.
      if (!user.id) return;
      await db.$transaction([
        db.userProfile.upsert({
          where: { userId: user.id },
          create: { userId: user.id },
          update: {},
        }),
        db.loyaltyAccount.upsert({
          where: { userId: user.id },
          create: { userId: user.id },
          update: {},
        }),
      ]);
    },
  },
});
