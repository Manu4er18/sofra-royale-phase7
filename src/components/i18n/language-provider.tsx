"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  type AppLocale,
  type TranslationKey,
  LANGUAGE_COOKIE_KEY,
  LANGUAGE_LABELS,
  LANGUAGE_STORAGE_KEY,
  isAppLocale,
  translate,
} from "@/lib/i18n";

type LanguageContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = React.createContext<LanguageContextValue | null>(null);

function readCookieLocale() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`${LANGUAGE_COOKIE_KEY}=([^;]+)`),
  );
  const value = match?.[1] ? decodeURIComponent(match[1]) : null;
  return isAppLocale(value) ? value : null;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [locale, setLocaleState] = React.useState<AppLocale>("de");

  React.useEffect(() => {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const legacyStored = window.localStorage.getItem("sofra-chat-lang");
    const nextLocale =
      (isAppLocale(stored) && stored) ||
      readCookieLocale() ||
      (isAppLocale(legacyStored) && legacyStored) ||
      "de";
    setLocaleState(nextLocale);
    document.documentElement.lang = nextLocale;
  }, []);

  const setLocale = React.useCallback(
    (nextLocale: AppLocale) => {
      setLocaleState(nextLocale);
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLocale);
      window.localStorage.setItem("sofra-chat-lang", nextLocale);
      document.cookie = `${LANGUAGE_COOKIE_KEY}=${encodeURIComponent(
        nextLocale,
      )}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = nextLocale;
      router.refresh();
    },
    [router],
  );

  const value = React.useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key) => translate(locale, key),
    }),
    [locale, setLocale],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = React.useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}

export function LanguageSelect({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useLanguage();
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {!compact ? <span>{t("common.language")}</span> : null}
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as AppLocale)}
        className="h-8 rounded-md border bg-background px-2 text-xs text-foreground"
        aria-label={t("common.language")}
      >
        {Object.entries(LANGUAGE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
