"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionCookie,
  SESSION_COOKIE,
  SESSION_DURATION_MS,
} from "@/auth";

// Return only to the admin area or the Uno pages. The login page
// already filters callbackUrl, but this action can be called directly.
const unoPages = [
  "/games/uno-tracker",
  "/games/uno-tracker/stats",
  "/games/uno-tracker/history",
];
function safeRedirect(redirectTo: unknown) {
  if (typeof redirectTo !== "string") return "/";
  if (unoPages.includes(redirectTo)) return redirectTo;
  const isAdminPath =
    redirectTo === "/admin" || redirectTo.startsWith("/admin/");
  return isAdminPath && redirectTo !== "/admin/login" ? redirectTo : "/";
}

// Server actions only accept same-origin POSTs, which is the CSRF protection
// for creating a session. Returns an error message, or redirects on success.
export async function signInAction(idToken: unknown, redirectTo?: unknown) {
  const sessionCookie =
    typeof idToken === "string" ? await createSessionCookie(idToken) : null;
  if (!sessionCookie) return "Invalid credentials.";

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
  redirect(safeRedirect(redirectTo));
}
