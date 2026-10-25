import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionCookie } from "@/auth";

// Keeps signed-out visitors out of the /admin pages. Server actions check the
// session again themselves, see requireAuth in src/auth.ts.
export async function proxy(request: NextRequest) {
  const { nextUrl } = request;

  // A server action can be sent to any page, so the proxy is no protection
  // for them, and the browser cannot follow its redirect from one. Let them
  // through for requireAuth to refuse, which sends people to sign in.
  if (request.method === "POST" && request.headers.has("next-action")) {
    return NextResponse.next();
  }

  const session = await verifySessionCookie(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  const isLoginPage = nextUrl.pathname === "/admin/login";

  if (isLoginPage) {
    return session
      ? NextResponse.redirect(new URL("/admin", nextUrl))
      : NextResponse.next();
  }

  if (!session) {
    const login = new URL("/admin/login", nextUrl);
    login.searchParams.set("callbackUrl", nextUrl.href);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
