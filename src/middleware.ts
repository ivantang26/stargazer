import { NextRequest, NextResponse } from "next/server";

/**
 * Bare "/" resolves to the visitor's preferred launch language when the hint
 * is explicit; otherwise English. We never force location-based redirects that
 * would prevent selecting another language (PRD §19).
 */
export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/en";
  const accept = req.headers.get("accept-language") ?? "";
  if (/^zh|,\s*zh/i.test(accept) && /hant|tw|hk/i.test(accept)) {
    url.pathname = "/zh-hant";
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/"],
};
