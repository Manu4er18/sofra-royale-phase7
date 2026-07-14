"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { History, Search, TrendingUp } from "lucide-react";

import { cn, formatPrice } from "@/lib/utils";

type Suggestion = {
  slug: string;
  name: string;
  price: number;
  imageUrl: string | null;
};

const RECENT_KEY = "sr_recent_searches";
const MAX_RECENT = 5;

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed
          .filter((x): x is string => typeof x === "string")
          .slice(0, MAX_RECENT)
      : [];
  } catch {
    return [];
  }
}

function saveRecent(term: string) {
  try {
    const next = [term, ...readRecent().filter((t) => t !== term)].slice(
      0,
      MAX_RECENT,
    );
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — recent searches are a nicety only */
  }
}

/**
 * Debounced search box with live suggestions, popular and recent
 * searches. Used in the site header and on /search.
 */
export function SearchBox({
  autoFocus = false,
  className,
  initialQuery = "",
}: {
  autoFocus?: boolean;
  className?: string;
  initialQuery?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState(initialQuery);
  const [open, setOpen] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  const [popular, setPopular] = React.useState<string[]>([]);
  const [recent, setRecent] = React.useState<string[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listboxId = React.useId();

  // Load recent + popular once the dropdown first opens.
  React.useEffect(() => {
    if (!open) return;
    setRecent(readRecent());
    if (popular.length === 0) {
      void fetch("/api/search/suggestions?q=")
        .then((r) => (r.ok ? r.json() : { popular: [] }))
        .then((data: { popular?: string[] }) => setPopular(data.popular ?? []))
        .catch(() => undefined);
    }
  }, [open, popular.length]);

  // Debounced suggestion fetch.
  React.useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      void fetch(
        `/api/search/suggestions?q=${encodeURIComponent(query.trim())}`,
        { signal: controller.signal },
      )
        .then((r) => (r.ok ? r.json() : { suggestions: [] }))
        .then((data: { suggestions?: Suggestion[] }) =>
          setSuggestions(data.suggestions ?? []),
        )
        .catch(() => undefined);
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query]);

  // Close on outside click.
  React.useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function submit(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    saveRecent(trimmed);
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function goToProduct(slug: string) {
    saveRecent(query.trim() || slug);
    setOpen(false);
    router.push(`/menu/${slug}`);
  }

  const showPanel =
    open && (suggestions.length > 0 || recent.length > 0 || popular.length > 0);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit(query);
        }}
      >
        <label className="relative block">
          <span className="sr-only">Gerichte suchen</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Gericht, Zutat, Küche …"
            autoFocus={autoFocus}
            autoComplete="off"
            aria-expanded={showPanel}
            aria-controls={listboxId}
            className="h-10 w-full rounded-full border border-input bg-background pl-9 pr-4 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </form>

      {showPanel ? (
        <div
          id={listboxId}
          className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-lg border bg-popover shadow-premium-lg"
        >
          {suggestions.length > 0 ? (
            <ul aria-label="Vorschläge">
              {suggestions.map((s) => (
                <li key={s.slug}>
                  <button
                    type="button"
                    onClick={() => goToProduct(s.slug)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-accent"
                  >
                    <span className="relative h-10 w-12 shrink-0 overflow-hidden rounded bg-muted">
                      {s.imageUrl ? (
                        <Image
                          src={s.imageUrl}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{s.name}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {formatPrice(s.price)}
                    </span>
                  </button>
                </li>
              ))}
              <li className="border-t">
                <button
                  type="button"
                  onClick={() => submit(query)}
                  className="w-full px-3 py-2.5 text-left text-sm font-medium text-primary hover:bg-accent dark:text-gold"
                >
                  Alle Ergebnisse für „{query.trim()}“ anzeigen
                </button>
              </li>
            </ul>
          ) : (
            <div className="space-y-3 p-3">
              {recent.length > 0 ? (
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <History className="h-3.5 w-3.5" aria-hidden /> Zuletzt
                    gesucht
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {recent.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => submit(term)}
                        className="rounded-full border px-3 py-1 text-xs hover:bg-accent"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {popular.length > 0 ? (
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" aria-hidden /> Beliebt
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {popular.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => submit(term)}
                        className="rounded-full border px-3 py-1 text-xs hover:bg-accent"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
