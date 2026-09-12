import Header from "@/components/header";
import LoginForm from "@/components/login";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
};

// Only send the user back to a callback URL that stays within the admin
// area, otherwise fall back to /admin. callbackUrl is attacker-controllable
// via the query string. Only the path (and query) is ever returned - the
// host is always discarded, so this can never produce an off-origin
// redirect even if callbackUrl points at a foreign host. We still reject
// anything outside /admin (or the login page itself) so a stripped host
// doesn't leak an unrelated path.
function sanitizeCallbackUrl(callbackUrl: string | undefined) {
  if (!callbackUrl) return undefined;

  try {
    const url = new URL(callbackUrl);
    const pathname = url.pathname.replace(/\/$/, "") || "/";
    const path = `${pathname}${url.search}`;
    const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
    const isLoginPath = pathname === "/admin/login";

    if (isAdminPath && !isLoginPath) {
      return path;
    }
  } catch {
    // Not a valid absolute URL - ignore it.
  }

  return undefined;
}

export default async function Login(props: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const searchParams = await props.searchParams;
  const callbackUrl = sanitizeCallbackUrl(searchParams.callbackUrl);

  return (
    <>
      <Header noCrumbs={true} homeOnly={true} />

      <main id="main-content">
        <LoginForm callbackUrl={callbackUrl} />
      </main>
    </>
  );
}
