import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Checks the cookie handling and redirects around sign-in, sign-out and the
// proxy. Firebase itself is mocked here; the real session checks run against
// the emulator in tests/firebase/session.test.ts.

const { createSessionCookie, verifySessionCookie, cookieStore, redirect } =
  vi.hoisted(() => ({
    createSessionCookie: vi.fn(),
    verifySessionCookie: vi.fn(),
    cookieStore: { set: vi.fn(), delete: vi.fn() },
    redirect: vi.fn(),
  }));

vi.mock("@/auth", () => ({
  SESSION_COOKIE: "__session",
  SESSION_DURATION_MS: 5 * 24 * 60 * 60 * 1000,
  createSessionCookie,
  verifySessionCookie,
}));
vi.mock("next/headers", () => ({ cookies: () => cookieStore }));
vi.mock("next/navigation", () => ({ redirect }));

import { signInAction } from "@/actions/signInAction";
import { signOutAction } from "@/actions/signOutAction";
import { proxy } from "@/proxy";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("signInAction", () => {
  it("sets an HTTP-only, secure session cookie", async () => {
    createSessionCookie.mockResolvedValue("session-value");

    await signInAction("id-token");

    expect(createSessionCookie).toHaveBeenCalledWith("id-token");
    expect(cookieStore.set).toHaveBeenCalledWith("__session", "session-value", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 5 * 24 * 60 * 60,
    });
  });

  it("sets no cookie when Firebase refuses the token", async () => {
    createSessionCookie.mockResolvedValue(null);

    expect(await signInAction("id-token")).toBe("Invalid credentials.");
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("does not pass anything but a string to Firebase", async () => {
    expect(await signInAction({ token: "x" })).toBe("Invalid credentials.");
    expect(createSessionCookie).not.toHaveBeenCalled();
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it.each([
    [undefined, "/"],
    ["/admin", "/admin"],
    ["/admin/holidays", "/admin/holidays"],
    ["/admin/films/1/edit?x=1", "/admin/films/1/edit?x=1"],
    ["/admin/login", "/"],
    ["/administrator", "/"],
    ["/whiskyjournal", "/"],
    ["https://evil.example.com/admin", "/"],
    ["//evil.example.com/admin", "/"],
    [["/admin"], "/"],
  ])("sends %j on to %s", async (redirectTo, expected) => {
    createSessionCookie.mockResolvedValue("session-value");

    await signInAction("id-token", redirectTo);
    expect(redirect).toHaveBeenCalledWith(expected);
  });
});

describe("signOutAction", () => {
  it("clears the session cookie and goes home", async () => {
    await signOutAction();

    expect(cookieStore.delete).toHaveBeenCalledWith("__session");
    expect(redirect).toHaveBeenCalledWith("/");
  });
});

describe("proxy", () => {
  function request(path: string, cookie?: string) {
    const headers = cookie ? { cookie: `__session=${cookie}` } : undefined;
    return new NextRequest(`http://localhost:3000${path}`, { headers });
  }

  it("sends signed-out visitors to the login page with a callback", async () => {
    verifySessionCookie.mockResolvedValue(null);

    const response = await proxy(request("/admin/holidays", "stale"));

    expect(verifySessionCookie).toHaveBeenCalledWith("stale");
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/admin/login?callbackUrl=http%3A%2F%2Flocalhost%3A3000%2Fadmin%2Fholidays",
    );
  });

  it("lets a valid session through", async () => {
    verifySessionCookie.mockResolvedValue({ uid: "alice" });

    const response = await proxy(request("/admin/holidays", "good"));

    expect(response.headers.get("location")).toBe(null);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("shows the login page to signed-out visitors", async () => {
    verifySessionCookie.mockResolvedValue(null);

    const response = await proxy(request("/admin/login"));

    expect(verifySessionCookie).toHaveBeenCalledWith(undefined);
    expect(response.headers.get("location")).toBe(null);
  });

  it("sends signed-in users from the login page to the admin area", async () => {
    verifySessionCookie.mockResolvedValue({ uid: "alice" });

    const response = await proxy(request("/admin/login", "good"));

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/admin",
    );
  });
});
