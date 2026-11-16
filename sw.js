/* Next Up – service worker.
   App files: try the network first (so updates show up straight away), fall back to the
   saved copy when there is no connection. Libraries and fonts: saved copy first.
   Supabase (your data and sign-in) is never cached here; the app keeps its own copy of your tasks. */
const VERSION = "nextup-v3";
const CORE = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/config.js",
  "/grocery-words.js",
  "/manifest.webmanifest",
  "/icons/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/favicon-32.png",
];
const LIBS = ["https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js"];
const NETWORK_WAIT_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(CORE);
    await Promise.all(LIBS.map((u) => cache.add(new Request(u, { mode: "cors" })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("supabase.co") || url.hostname.endsWith("supabase.in")) return;
  if (url.origin === self.location.origin) { event.respondWith(networkFirst(req)); return; }
  if (/(^|\.)(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com|covers\.openlibrary\.org|books\.google\.com|books\.googleusercontent\.com)$/.test(url.hostname)) {
    event.respondWith(cacheFirst(req));
  }
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
  });
}

async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  const isPage = req.mode === "navigate";
  try {
    const res = await withTimeout(fetch(req), NETWORK_WAIT_MS);
    if (res && res.ok) cache.put(isPage ? "/" : req, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const hit = (await cache.match(req, { ignoreSearch: true })) ||
      (isPage ? (await cache.match("/")) || (await cache.match("/index.html")) : null);
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone()).catch(() => {});
  return res;
}
