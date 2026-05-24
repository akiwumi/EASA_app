/**
 * Flight Lyceum Service Worker
 *
 * Cache strategies:
 *  - Static assets (JS/CSS/fonts/images): Cache-first, background revalidate
 *  - App HTML pages: Network-first, fallback to cache, fallback to offline page
 *  - API routes:     Network-only (no caching — data must be fresh)
 */

const CACHE_VERSION = "fl-v1";
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const PAGES_CACHE   = `${CACHE_VERSION}-pages`;
const OFFLINE_URL   = "/offline.html";

// Pages to precache so they're available offline immediately
const PRECACHE_PAGES = [
  "/",
  "/login",
  "/help",
  "/faq",
  "/offline.html",
];

// ─── Install ────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const pageCache = await caches.open(PAGES_CACHE);
      // Best-effort — don't fail install if a page is unavailable
      await Promise.allSettled(
        PRECACHE_PAGES.map((url) => pageCache.add(url).catch(() => {}))
      );
      await self.skipWaiting();
    })()
  );
});

// ─── Activate ───────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Delete caches from previous versions
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("fl-") && k !== STATIC_CACHE && k !== PAGES_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// ─── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip API routes — always network-only
  if (url.pathname.startsWith("/api/")) return;

  // Skip Next.js internals and non-GET requests
  if (request.method !== "GET") return;
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  // Static assets: Cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.match(/\.(ico|png|svg|jpg|jpeg|webp|woff2?|ttf|otf)$/)
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML navigation: Network-first with offline fallback
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // Everything else (JSON manifests, etc.): Network-first
  event.respondWith(networkFirst(request, PAGES_CACHE));
});

// ─── Strategies ─────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Resource unavailable offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? new Response("Unavailable offline.", { status: 503 });
  }
}

async function networkFirstWithOfflineFallback(request) {
  const cache = await caches.open(PAGES_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Return the offline page for navigation requests
    const offline = await caches.match(OFFLINE_URL);
    return (
      offline ??
      new Response(
        "<!doctype html><html><body><h1>You are offline</h1><p>Please check your connection and try again.</p></body></html>",
        { status: 503, headers: { "Content-Type": "text/html" } }
      )
    );
  }
}
