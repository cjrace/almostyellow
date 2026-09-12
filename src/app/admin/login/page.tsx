import Header from "@/components/header";
import LoginForm from "@/components/login";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
};

// Only send the user back to a callback URL that stays within the admin
// area, otherwise fall back to /admin. callbackUrl is attacker-controllable
// via the query string, so an absolute or off-admin URL must be rejected.
function sanitizeCallbackUrl(callbackUrl: string | undefined) {
  if (!callbackUrl) return undefined;

  try {
    const url = new URL(callbackUrl);
    const path = `${url.pathname}${url.search}`;
    const pathname = url.pathname.replace(/\/$/, "") || "/";
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
