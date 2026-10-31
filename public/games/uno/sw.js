/* Only the public Uno shell and same-origin versioned assets are cached.
   Session checks, server-action POSTs and RSC responses always use the network. */
const CACHE = "uno-shell-v1";
const pages = ["/games/uno", "/games/uno/stats"];
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys())
        if (name.startsWith("uno-shell-") && name !== CACHE)
          await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});
function isAsset(url) {
  return (
    url.origin === self.location.origin &&
    url.pathname.startsWith("/_next/static/")
  );
}
self.addEventListener("message", (event) => {
  if (event.data?.type !== "cache-uno") return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const assets = Array.isArray(event.data.assets)
        ? event.data.assets.filter(
            (asset) =>
              typeof asset === "string" &&
              isAsset(new URL(asset, self.location.origin)),
          )
        : [];
      let succeeded = true;
      const pending = [...pages, ...assets];
      const shells = new Map();
      const visited = new Set();
      for (const path of pending) {
        if (visited.has(path)) continue;
        visited.add(path);
        try {
          const request = new Request(path, {
            credentials: "omit",
            cache: "reload",
          });
          const response = await fetch(request);
          if (response.ok && !response.redirected) {
            if (pages.includes(path)) {
              const html = await response.clone().text();
              for (const match of html.matchAll(/(?:src|href)="([^"<>]+)"/g)) {
                const asset = new URL(match[1], self.location.origin);
                if (isAsset(asset)) pending.push(asset.href);
              }
            }
            if (pages.includes(path)) shells.set(path, response);
            else await cache.put(path, response);
          } else succeeded = false;
        } catch {
          succeeded = false;
        }
      }
      // Publish shells only after their dependencies are cached successfully.
      if (succeeded) {
        try {
          for (const [path, response] of shells)
            await cache.put(path, response);
        } catch {
          succeeded = false;
        }
      }
      event.source?.postMessage(
        succeeded ? "uno-offline-ready" : "uno-offline-failed",
      );
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (isAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const saved = await cache.match(request);
        if (saved) return saved;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      })(),
    );
  } else if (request.mode === "navigate" && pages.includes(url.pathname)) {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const saved = await caches.match(url.pathname);
          return (
            saved ??
            new Response("Open Uno online once before using it offline.", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
          );
        }
      })(),
    );
  }
});
