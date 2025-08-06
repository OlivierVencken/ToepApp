const CACHE_NAME = 'toepen-cache-v1';
const ASSETS = [
  '/', 
  '/index.html',
  '/static/css/custom.css',
  '/static/app.js',
  '/static/manifest.json',

  // icons
  '/static/icons/icon-48.png',
  '/static/icons/icon-72.png',
  '/static/icons/icon-96.png',
  '/static/icons/icon-120.png',
  '/static/icons/icon-144.png',
  '/static/icons/icon-152.png',
  '/static/icons/icon-180.png',
  '/static/icons/icon-192.png',
  '/static/icons/icon-256.png',
  '/static/icons/icon-384.png',
  '/static/icons/icon-512.png',

  // audio files
  '/static/sounds/click.mp3',
  '/static/sounds/small-player-point.mp3',
  '/static/sounds/game-end.mp3',
  '/static/sounds/title-click.mp3',
];

self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Intercept all fetches…
self.addEventListener('fetch', evt => {
  const url = new URL(evt.request.url);

  // If it's one of our /static/sounds/*.mp3 requests…
  if (url.pathname.startsWith('/static/sounds/')) {
    // respond with cached version (or network fallback, if you prefer)
    evt.respondWith(caches.match(evt.request));
    return;
  }

  // Otherwise do the normal Cache-first strategy
  evt.respondWith(
    caches.match(evt.request)
      .then(cached => cached || fetch(evt.request))
  );
});