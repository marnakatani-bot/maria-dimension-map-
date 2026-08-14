/* 観測マッピング  service-worker.js
   公開観測アーカイブと個人用ノートのアプリファイルを保存します。
   公開観測データは更新を反映するため、常にネットワークから取得します。 */
var CACHE = 'omn-v0-3-1';
var FILES = [
  './',
  './index.html',
  './note.html',
  './styles.css',
  './public.css',
  './public.js',
  './app.js',
  './manifest.webmanifest',
  './icons/icon.svg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(FILES);
    }).then(function () {
      return self.skipWaiting();
    }).catch(function () {})
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        return key === CACHE ? null : caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  var url = new URL(event.request.url);
  if (url.pathname.endsWith('/public-observations.json')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (hit) {
      if (hit) return hit;
      return fetch(event.request).catch(function () {
        if (event.request.mode === 'navigate') return caches.match('./index.html');
        return undefined;
      });
    })
  );
});
