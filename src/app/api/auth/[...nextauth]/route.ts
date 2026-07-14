import { handlers } from "@/lib/auth";

/**
 * Auth.js route handlers (sign-in, callback, session, CSRF …).
 * All configuration lives in `src/lib/auth`.
 */
export const { GET, POST } = handlers;
