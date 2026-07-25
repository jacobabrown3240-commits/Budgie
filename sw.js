/* Kakeibo service worker.
   Network-first: when online, always serve the freshest files (so deploys
   show up without a hard refresh) and keep the cache updated as a fallback;
   when offline, serve the last-cached copy. */
var CACHE = "budgie-v9";
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
      // Was a previous version installed? (Skip the forced reload on a brand-new
      // install so first-time visitors don't see an immediate refresh.)
      var hadOld = keys.some(function (k) { return k !== CACHE; });
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }))
        .then(function () { return self.clients.claim(); })
        .then(function () {
          if (!hadOld) return;
          // Force every open window onto the freshly deployed assets. Rescues
          // clients stuck on an older cached version — including an installed
          // PWA that otherwise never reloads on its own.
          return self.clients.matchAll({ type: "window" }).then(function (clients) {
            clients.forEach(function (c) {
              if ("navigate" in c) { try { c.navigate(c.url); } catch (err) {} }
            });
          });
        });
    })
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
