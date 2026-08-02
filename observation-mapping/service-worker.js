/* 観測マッピング・ノート  service-worker.js
   インターネットが無くても起動できるように、アプリのファイルだけを保存します。
   記録そのものはここではなくIndexedDBに保存されます。 */
var CACHE = 'omn-v0-1-2';  // 版を上げると古い保存分は自動で捨てられます
var FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon.svg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () {
      return self.skipWaiting();
    }).catch(function () {})
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).catch(function () {
        return caches.match('./index.html');
      });
    })
  );
});
