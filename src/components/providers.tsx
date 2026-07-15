"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

import { LanguageProvider } from "@/components/i18n/language-provider";

/**
 * Global client providers.
 *
 * - ThemeProvider: light/dark/system, persisted to localStorage by
 *   next-themes; the user's account preference (User.themePreference)
 *   is synced on login in a later phase.
 * - SessionProvider: exposes the Auth.js session to client components.
 * - Toaster: app-wide toast notifications (sonner).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="bottom-center" closeButton />
        </ThemeProvider>
      </LanguageProvider>
    </SessionProvider>
  );
}
