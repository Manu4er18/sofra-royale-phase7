"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

/**
 * Light/dark/system switcher. next-themes persists the choice in
 * localStorage; syncing to User.themePreference happens server-side
 * once the profile settings page lands (Phase 4).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Helles Farbschema aktivieren" : "Dunkles Farbschema aktivieren"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative"
      style={{
        position: "relative",
        border: "1px solid hsl(var(--border))",
        background: "hsl(var(--background) / .7)",
        color: "hsl(var(--foreground))",
      }}
    >
      {isDark ? (
        <Sun className="h-5 w-5" aria-hidden />
      ) : (
        <Moon className="h-5 w-5" aria-hidden />
      )}
    </Button>
  );
}
