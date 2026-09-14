'use strict';

var CACHE_NAME = 'serwis-v17';
var CORE = [
  '.',
  'index.html',
  'js/data-layer.js',
  'js/catalog.js',
  'js/photos.js',
  'js/sync.js',
  'js/pwa.js'
];

function isCacheable(req) {
  try {
    if (!req || req.method !== 'GET') return false;
    var u = new URL(req.url);
    if (u.origin !== self.location.origin) return false;
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    return true;
  } catch (e) {
    return false;
  }
}

function isHtmlReq(req) {
  try {
    if (req.mode === 'navigate') return true;
    var a = (req.headers && req.headers.get('accept')) || '';
    return a.indexOf('text/html') >= 0;
  } catch (e) {
    return false;
  }
}

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE_NAME).then(function (c) {
    return Promise.all(CORE.map(function (u) {
      return c.add(u).catch(function () {});
    }));
  }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) {
      return caches.delete(k);
    }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (!isCacheable(req)) return;
  if (isHtmlReq(req)) {
    e.respondWith(
      fetch(req).then(function (res) {
        try {
          if (res && res.ok && res.type === 'basic') {
            caches.open(CACHE_NAME).then(function (c) { c.put(req, res.clone()); });
          }
        } catch (_) {}
        return res;
      }).catch(function () {
        return caches.match(req).then(function (r) { return r || caches.match('.'); });
      })
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(function (r) {
      if (r) return r;
      return fetch(req).then(function (res) {
        try {
          if (res && res.ok && res.type === 'basic') {
            caches.open(CACHE_NAME).then(function (c) { c.put(req, res.clone()); });
          }
        } catch (_) {}
        return res;
      }).catch(function () { return caches.match('.'); });
    })
  );
});
