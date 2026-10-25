import { test, expect, request, type Page } from "@playwright/test";
import { getCredentials } from "./helpers";

// Server actions are plain POSTs, so anyone can send one without going through
// the site. This captures the real request the Chopin Liszt page makes to read
// the private list, then replays it outside the browser with and without a
// valid session cookie.

const BASE_URL = "http://localhost:3000";

async function captureReadAction(page: Page) {
  const { email, password } = getCredentials();
  await page.goto(`/admin/login?callbackUrl=${BASE_URL}/admin/chopinliszt`);
  await page.getByPlaceholder("e.g. simply@thebest.co.uk").fill(email);
  await page.getByPlaceholder("Enter password").fill(password);
  await Promise.all([
    page.waitForURL("/admin/chopinliszt", { timeout: 15_000 }),
    page.getByRole("button", { name: "Log in" }).click(),
  ]);

  // Signing in is a server action too, so load the page afresh to catch only
  // the one that reads the list
  const [action] = await Promise.all([
    page.waitForRequest(
      (req) => req.method() === "POST" && "next-action" in req.headers(),
    ),
    page.reload(),
  ]);

  const session = (await page.context().cookies()).find(
    (cookie) => cookie.name === "__session",
  );
  if (!session) throw new Error("No session cookie after signing in");

  return {
    headers: {
      "next-action": action.headers()["next-action"],
      "content-type": action.headers()["content-type"] ?? "text/plain",
      accept: "text/x-component",
      origin: BASE_URL,
    },
    body: action.postData() ?? "[]",
    session: session.value,
  };
}

async function replay(
  captured: Awaited<ReturnType<typeof captureReadAction>>,
  path: string,
  cookie?: string,
) {
  const context = await request.newContext();
  const response = await context.post(`${BASE_URL}${path}`, {
    headers: {
      ...captured.headers,
      ...(cookie ? { cookie: `__session=${cookie}` } : {}),
    },
    data: captured.body,
    maxRedirects: 0,
  });
  const result = {
    status: response.status(),
    headers: response.headers(),
    body: await response.text(),
  };
  await context.dispose();
  return result;
}

// Actions are found by their ID rather than the URL, so one can be sent to
// any page, and the proxy lets them all through. requireAuth inside the action
// is the only check, wherever it is sent.
for (const path of ["/admin/chopinliszt", "/"]) {
  test(`Protected server actions sent to ${path} need a valid session`, async ({
    page,
  }) => {
    const captured = await captureReadAction(page);

    // The same request with the real cookie gets the private list, so it is
    // the session alone that the other calls are refused for
    const allowed = await replay(captured, path, captured.session);
    expect(allowed.status).toBe(200);
    expect(allowed.body).toContain("Limes");

    for (const cookie of [undefined, "not-a-session", `${captured.session}x`]) {
      const refused = await replay(captured, path, cookie);
      // requireAuth redirects to sign in, which Next sends as a header
      expect(refused.headers["x-action-redirect"]).toMatch(/^\/admin\/login/);
      expect(refused.body).not.toContain("Limes");
      expect(refused.body).not.toContain("Tonic water");
    }
  });
}

test("A made-up server action cannot be used to load an admin page", async () => {
  const context = await request.newContext();
  const response = await context.post(`${BASE_URL}/admin/holidays`, {
    headers: {
      "next-action": "0".repeat(42),
      "content-type": "text/plain;charset=UTF-8",
      accept: "text/x-component",
      origin: BASE_URL,
    },
    data: "[]",
    maxRedirects: 0,
  });
  const body = await response.text();
  await context.dispose();

  expect(response.status()).not.toBe(200);
  expect(body).not.toContain("Our trips and holidays");
});
