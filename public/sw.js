// sw.js — Service Worker for DoIt PWA
// Handles: offline caching, background sync, push notification display

const CACHE_NAME     = "doit-v1";
const RUNTIME_CACHE  = "doit-runtime-v1";

// Assets to cache on install (app shell)
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// ── Install: pre-cache the app shell ─────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // Activate immediately without waiting for old SW to die
  self.skipWaiting();
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Take control of all open clients immediately
  self.clients.claim();
});

// ── Fetch: network-first for API calls, cache-first for assets ───────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and Chrome extension requests
  if (request.method !== "GET") return;
  if (!url.protocol.startsWith("http")) return;

  // Firebase / Firestore API calls — network only (never cache)
  if (
    url.hostname.includes("firebase") ||
    url.hostname.includes("firestore") ||
    url.hostname.includes("googleapis")
  ) {
    return;
  }

  // Google Fonts — cache first, then network
  if (url.hostname.includes("fonts.googleapis") || url.hostname.includes("fonts.gstatic")) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // App shell (HTML, JS, CSS, images) — network first, fall back to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        // Offline — serve from cache
        const cached = await caches.match(request);
        if (cached) return cached;
        // For navigation requests, return index.html (SPA fallback)
        if (request.mode === "navigate") {
          return caches.match("/index.html");
        }
        return new Response("Offline", { status: 503 });
      })
  );
});

// ── Push notification display ─────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch { data = { title: "DoIt", body: event.data.text() }; }

  const options = {
    body:    data.body    || "You have a new notification",
    icon:    data.icon    || "/icons/icon-192x192.png",
    badge:   data.badge   || "/icons/icon-72x72.png",
    tag:     data.tag     || "doit-notif",
    data:    data.url     || "/",
    actions: data.actions || [],
    vibrate: [100, 50, 100],
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "DoIt", options)
  );
});

// ── Notification click — open or focus the app ────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data || "/");
      }
    })
  );
});
