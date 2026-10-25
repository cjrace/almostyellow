import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb, firebaseProjectId } from "@/firebase/admin";
import type { FirebaseClientConfig } from "@/firebase/client";

// Sign-in happens in the browser with the Firebase web SDK. The resulting ID
// token is swapped once for an HTTP-only session cookie (signInAction), and
// that cookie is what the proxy and server actions check from then on.

export const SESSION_COOKIE = "__session";

// Firebase allows session cookies of up to two weeks
export const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000;

// Only a sign-in from the last few minutes can start a session, so an old ID
// token that has leaked cannot be swapped for a fresh five-day cookie
const MAX_SIGN_IN_AGE_SECONDS = 5 * 60;

export interface Session {
  uid: string;
  email?: string;
}

// Errors that mean the token or cookie is bad, as opposed to Firebase being
// unreachable or misconfigured, which should surface as real errors
function isRejectedCredential(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && code.startsWith("auth/");
}

// A Firebase account is not enough on its own: only the users listed in
// authorizedUsers, which only the Admin SDK can change, get in
async function isAuthorized(uid: string) {
  const member = await adminDb().doc(`authorizedUsers/${uid}`).get();
  return member.exists;
}

/**
 * Swaps the ID token from a recent sign-in by an authorised user for a session
 * cookie value. Returns null for anyone or anything else.
 */
export async function createSessionCookie(idToken: string) {
  try {
    const token = await adminAuth().verifyIdToken(idToken, true);
    if (Date.now() / 1000 - token.auth_time > MAX_SIGN_IN_AGE_SECONDS) {
      return null;
    }
    if (!(await isAuthorized(token.uid))) return null;
    return await adminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    });
  } catch (error) {
    if (isRejectedCredential(error)) return null;
    throw error;
  }
}

/**
 * The session a cookie value belongs to, or null if it is missing, invalid,
 * expired or revoked, or the user is no longer authorised.
 */
export async function verifySessionCookie(
  cookie: string | undefined,
): Promise<Session | null> {
  if (!cookie) return null;
  try {
    const token = await adminAuth().verifySessionCookie(cookie, true);
    if (!(await isAuthorized(token.uid))) return null;
    return { uid: token.uid, email: token.email };
  } catch (error) {
    if (isRejectedCredential(error)) return null;
    throw error;
  }
}

// Checked once per request however many server actions or components ask
export const getSession = cache(async () => {
  const cookieStore = await cookies();
  return verifySessionCookie(cookieStore.get(SESSION_COOKIE)?.value);
});

// Server actions are callable directly over HTTP, so protecting the /admin
// pages is not enough. Call this at the top of any server action that reads
// private data or changes data, outside of any try/catch.
//
// Without a session the action stops and the browser is sent to the login
// page, which covers a session that expires or is revoked while a page is
// open. The site's Referrer-Policy hides which page that was, so there is no
// callback to bring people back to it.
export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export function firebaseClientConfig(): FirebaseClientConfig {
  const projectId = firebaseProjectId();
  const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  // The Auth emulator accepts any API key
  const apiKey =
    process.env.FIREBASE_API_KEY ?? (authEmulatorHost && "fake-api-key");
  if (!apiKey) throw new Error("FIREBASE_API_KEY is not set.");
  return {
    apiKey,
    authDomain:
      process.env.FIREBASE_AUTH_DOMAIN ?? `${projectId}.firebaseapp.com`,
    projectId,
    authEmulatorHost,
    firestoreEmulatorHost: process.env.FIRESTORE_EMULATOR_HOST,
  };
}
