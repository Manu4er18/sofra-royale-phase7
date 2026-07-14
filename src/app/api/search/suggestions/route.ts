import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  getPopularSearchTerms,
  getSearchSuggestions,
} from "@/lib/services/catalog";

export const dynamic = "force-dynamic";

const querySchema = z.string().trim().max(100);

/**
 * GET /api/search/suggestions?q=…
 * Lightweight autosuggest for the header search box.
 * Empty/short queries return popular search terms instead.
 */
export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(
    request.nextUrl.searchParams.get("q") ?? "",
  );
  const q = parsed.success ? parsed.data : "";

  if (q.length < 2) {
    const popular = await getPopularSearchTerms();
    return NextResponse.json(
      { suggestions: [], popular },
      { headers: { "Cache-Control": "public, max-age=60" } },
    );
  }

  const suggestions = await getSearchSuggestions(q);
  return NextResponse.json(
    {
      suggestions: suggestions.map((s) => ({
        slug: s.slug,
        name: s.name,
        price:
          s.discountPrice !== null && s.discountPrice < s.basePrice
            ? s.discountPrice
            : s.basePrice,
        imageUrl: s.images[0]?.url ?? null,
      })),
      popular: [],
    },
    { headers: { "Cache-Control": "public, max-age=30" } },
  );
}
