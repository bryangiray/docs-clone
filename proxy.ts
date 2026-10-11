import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Keep in sync with SESSION_COOKIE in lib/session.ts.
const SESSION_COOKIE = "docs_session";

// Fast redirect for visitors with no session cookie. Pages and Server Actions
// still verify the session against the database themselves.
export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/d/:path*"],
};
