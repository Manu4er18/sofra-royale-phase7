import { NextResponse, type NextRequest } from "next/server";

import {
  type AppLocale,
  LANGUAGE_COOKIE_KEY,
  SUPPORTED_LOCALES,
  isAppLocale,
} from "@/lib/i18n";

function detectLocale(request: NextRequest): AppLocale {
  const cookieLocale = request.cookies.get(LANGUAGE_COOKIE_KEY)?.value;
  if (isAppLocale(cookieLocale)) return cookieLocale;

  const accepted = request.headers.get("accept-language")?.toLowerCase() ?? "";
  const match = SUPPORTED_LOCALES.find((locale) => accepted.startsWith(locale));
  return match ?? "de";
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  if (!isAppLocale(request.cookies.get(LANGUAGE_COOKIE_KEY)?.value)) {
    response.cookies.set(LANGUAGE_COOKIE_KEY, detectLocale(request), {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
