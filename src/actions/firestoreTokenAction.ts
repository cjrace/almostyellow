"use server";

import { requireAuth } from "@/auth";
import { adminAuth } from "@/firebase/admin";

/**
 * A one-off token that signs the browser in to Firebase as the session's
 * user, so a page can read and write Firestore directly for live updates and
 * offline changes. Only someone with a valid session gets one, and the
 * Security Rules check the allowlist again on every read and write.
 */
export async function firestoreTokenAction() {
  const { uid } = await requireAuth();
  return adminAuth().createCustomToken(uid);
}
