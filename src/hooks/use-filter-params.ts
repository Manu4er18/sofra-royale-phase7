"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * URL-driven filter state for listing pages.
 * Every change resets pagination; empty values remove the param so URLs
 * stay clean and shareable.
 */
export function useFilterParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const setParams = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      params.delete("page"); // filters changed → back to page 1
      const query = params.toString();
      startTransition(() => {
        router.push(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [router, pathname, searchParams],
  );

  const toggleFlag = React.useCallback(
    (key: string) => {
      setParams({ [key]: searchParams.get(key) ? null : "1" });
    },
    [setParams, searchParams],
  );

  const clearAll = React.useCallback(() => {
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  }, [router, pathname]);

  return { searchParams, setParams, toggleFlag, clearAll, isPending };
}
