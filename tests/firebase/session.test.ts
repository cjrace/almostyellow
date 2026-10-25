import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createSessionCookie, verifySessionCookie } from "@/auth";
import { adminAuth, adminDb } from "@/firebase/admin";
import { assertEmulatorEnvironment } from "./guard";
import { users } from "./fixtures";
import { resetAndSeed } from "./seed";

// Session cookies are what the proxy and every protected server action trust,
// so these run the real Admin SDK calls against the Auth emulator.

beforeEach(async () => {
  await resetAndSeed();
});

async function idTokenFor(email: string, password: string) {
  const { authHost } = assertEmulatorEnvironment();
  const response = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const body = (await response.json()) as { idToken: string };
  return body.idToken;
}

async function sessionFor(user: { email: string; password: string }) {
  const cookie = await createSessionCookie(
    await idTokenFor(user.email, user.password),
  );
  if (!cookie) throw new Error(`No session for ${user.email}`);
  return cookie;
}

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

// Sets the clock the app and Admin SDK see, leaving real timers alone
function setClock(time: number) {
  vi.useFakeTimers({ toFake: ["Date"], now: time });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("starting a session", () => {
  test.each([users.alice, users.bob])(
    "works for authorised user $email",
    async (user) => {
      const session = await verifySessionCookie(await sessionFor(user));
      expect(session).toEqual({ uid: user.uid, email: user.email });
    },
  );

  test("is refused for a Firebase user who is not on the allowlist", async () => {
    const { email, password } = users.mallory;
    expect(await createSessionCookie(await idTokenFor(email, password))).toBe(
      null,
    );
  });

  test("is refused for a token that is not a token", async () => {
    expect(await createSessionCookie("not-a-token")).toBe(null);
    expect(await createSessionCookie("")).toBe(null);
  });

  test("is refused for a sign-in more than five minutes old", async () => {
    const { email, password } = users.alice;
    const signedInAt = Date.now();
    const idToken = await idTokenFor(email, password);

    // The same token, so only its age decides
    setClock(signedInAt + 4 * MINUTE);
    expect(await createSessionCookie(idToken)).toEqual(expect.any(String));
    setClock(signedInAt + 6 * MINUTE);
    expect(await createSessionCookie(idToken)).toBe(null);
  });
});

describe("checking a session", () => {
  test("rejects a missing or made-up cookie", async () => {
    expect(await verifySessionCookie(undefined)).toBe(null);
    expect(await verifySessionCookie("")).toBe(null);
    expect(await verifySessionCookie("not-a-cookie")).toBe(null);
  });

  test("rejects an ID token used as a session cookie", async () => {
    const { email, password } = users.alice;
    expect(await verifySessionCookie(await idTokenFor(email, password))).toBe(
      null,
    );
  });

  test("rejects an expired session", async () => {
    const startedAt = Date.now();
    const cookie = await sessionFor(users.alice);

    // The same cookie, so only its age decides
    setClock(startedAt + 4 * DAY);
    expect(await verifySessionCookie(cookie)).toEqual({
      uid: users.alice.uid,
      email: users.alice.email,
    });
    setClock(startedAt + 6 * DAY);
    expect(await verifySessionCookie(cookie)).toBe(null);
  });

  test("rejects a session after the user's tokens are revoked", async () => {
    const cookie = await sessionFor(users.alice);
    // Revocation is recorded to the second, so make sure it comes after
    await new Promise((resolve) => setTimeout(resolve, 1100));
    await adminAuth().revokeRefreshTokens(users.alice.uid);

    expect(await verifySessionCookie(cookie)).toBe(null);
  });

  test("rejects a session once the user is taken off the allowlist", async () => {
    const cookie = await sessionFor(users.alice);
    await adminDb().doc(`authorizedUsers/${users.alice.uid}`).delete();

    expect(await verifySessionCookie(cookie)).toBe(null);
  });

  test("rejects a session for a deleted user", async () => {
    const cookie = await sessionFor(users.bob);
    await adminAuth().deleteUser(users.bob.uid);

    expect(await verifySessionCookie(cookie)).toBe(null);
  });
});
