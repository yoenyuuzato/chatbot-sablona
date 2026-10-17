import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { embedOrigins } from "@/lib/profiles";

/** Kde smí být chat vložen v iframe – domény aktivních profilů (DB, cache 60 s) + localhost pro vývoj. */
async function frameAncestors() {
  const origins = await embedOrigins();
  return origins === null ? "*" : ["'self'", "http://localhost:*", "http://127.0.0.1:*", ...origins].join(" ");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/embed") {
    const res = NextResponse.next();
    res.headers.set("Content-Security-Policy", `frame-ancestors ${await frameAncestors()}`);
    return res;
  }

  if (pathname === "/admin/login") return NextResponse.next();
  const ok = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL("/admin/login", request.url);
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/embed", "/admin", "/admin/:path*", "/api/admin/:path*"],
};
