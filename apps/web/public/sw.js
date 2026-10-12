const CACHE = "urbanmesh-v1";

const PRECACHE = [
  "/",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/uploads")) return;
  if (isViteDevRequest(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/"));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

function isViteDevRequest(url) {
  return (
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/@") ||
    url.pathname.includes("node_modules") ||
    url.searchParams.has("t")
  );
}

async function networkFirst(request, fallbackUrl) {
  try {
    const fresh = await fetch(request);
    if (fresh.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    return (
      (await caches.match(request)) ||
      (await caches.match(fallbackUrl)) ||
      Response.error()
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const fetching = fetch(request)
    .then((fresh) => {
      if (fresh.ok) void cache.put(request, fresh.clone());
      return fresh;
    })
    .catch(() => cached);
  return cached || fetching;
}
