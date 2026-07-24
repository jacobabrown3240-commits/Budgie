/* Kakeibo service worker.
   Network-first: when online, always serve the freshest files (so deploys
   show up without a hard refresh) and keep the cache updated as a fallback;
   when offline, serve the last-cached copy. */
var CACHE = "budgie-v5";
var ASSETS = [
  ".",
  "index.html",
  "styles.css",
  "app.js",
  "manifest.webmanifest",
  "icons/icon.svg"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    // {cache:"no-store"} bypasses the browser HTTP cache so a freshly deployed
    // file is never masked by a still-valid cached copy (the cause of a mixed
    // old-JS / new-HTML load). Offline falls back to the cache below.
    fetch(e.request, { cache: "no-store" }).then(function (res) {
      // Refresh the cache with the latest successful same-origin response.
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) {
          try { c.put(e.request, copy); } catch (err) {}
        });
      }
      return res;
    }).catch(function () {
      // Offline: fall back to cache, then to the app shell for navigations.
      return caches.match(e.request).then(function (cached) {
        return cached || caches.match("index.html");
      });
    })
  );
});
