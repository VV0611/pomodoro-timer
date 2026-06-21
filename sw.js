/*
  SERVICE WORKER — sw.js
  ─────────────────────────────────────────────────────────────
  A service worker is a JavaScript file that runs in the BACKGROUND,
  separate from the web page. It acts as a "network proxy":
  intercepting every network request the page makes and deciding
  whether to serve from the local CACHE or go to the real network.

  WHY this makes us a PWA:
    1. The browser can install the app to the home screen / desktop.
    2. When offline (no internet), the cache serves the files → app still works.

  The three lifecycle events:
    install  → runs ONCE when the service worker is first registered.
               We use it to pre-cache all the app files.
    activate → runs when this SW version takes over (replacing an old one).
               We use it to delete old caches.
    fetch    → runs for EVERY network request the page makes.
               We check the cache first; if found, return it.
               If not cached, try the real network.
*/

const CACHE_NAME = "pomodoro-v7";
/*
  Cache name = a key for a "storage bucket" in the browser.
  The "v1" suffix is important: when we update the app, we change
  CACHE_NAME to "pomodoro-v2". The old v1 cache gets deleted in activate.
  This prevents users getting stale files from the old cache.
*/

const ASSETS_TO_CACHE = [
  "./timer.html",
  "./timer.css",
  "./timer.js",
  "./pet.html",
  "./pet.css",
  "./pet.js",
  "./manifest.json",
  "./icon.png",
  "./sounds/ocean.mp3",
  "./sounds/rain.mp3",
  "./sounds/forest.mp3",
  "./sounds/lofi.mp3",
  "./sounds/jazz1.mp3",
  "./sounds/jazz2.mp3",
  "./cats/idle-cat.png",
  "./cats/focus-cat.png",
  "./cats/paused-cat.png",
  "./cats/shortbreak-cat.png",
  "./cats/longbreak-cat.png",
  "./cats/done-cat.png",
];
/*
  These are the files we pre-cache when the SW installs.
  After caching, the app works 100% offline — no internet needed.
*/


/* ── INSTALL: pre-cache all app files ─────────────────────── */
self.addEventListener("install", event => {
  event.waitUntil(
    /*
      event.waitUntil(promise) tells the browser:
      "Don't finish installing until this promise resolves."
      If the promise rejects (e.g. a file 404s), the install fails safely.
    */
    caches.open(CACHE_NAME).then(cache => {
      /*
        caches is the browser's built-in cache storage API.
        caches.open("name") opens (or creates) a cache bucket.
        cache.addAll(array) fetches all URLs and stores them.
        It's all-or-nothing: if one file fails, nothing is cached.
      */
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
    /*
      skipWaiting() is chained AFTER caching completes.
      Calling it outside waitUntil() (the old placement) could let the SW
      activate before all assets were cached — a subtle race condition.
      Chaining here ensures caching always finishes first.

      By default, a new SW waits until the old one is gone before activating.
      skipWaiting() says: "activate immediately, don't wait."
      Combined with clients.claim() below, updates take effect right away.
    */
  );
});


/* ── ACTIVATE: delete old caches ──────────────────────────── */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      /*
        caches.keys() → returns an array of all cache bucket names.
        We filter to find ones that aren't our current CACHE_NAME.
        Then delete them — this clears out old app versions.
      */
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
  /*
    clients.claim() makes this SW take control of all open tabs immediately,
    without requiring the user to reload the page.
  */
});


/* ── FETCH: serve from cache, fall back to network ─────────── */
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      /*
        caches.match() checks all caches for a response matching this request.
        If found → return the cached version (fast, works offline).
        If not found → fall back to the real network (for any uncached URLs).
      */
      return cachedResponse || fetch(event.request);
    })
  );
});
