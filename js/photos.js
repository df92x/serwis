'use strict';

var PHOTO_DB_NAME = 'serwis-photos-v1';
var PHOTO_STORE = 'photos';
var _photoDbPromise = null;

function newPhotoId() {
  return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function _openPhotoDb() {
  if (_photoDbPromise) return _photoDbPromise;
  _photoDbPromise = new Promise(function (resolve, reject) {
    if (typeof indexedDB === 'undefined') { resolve(null); return; }
    var req = indexedDB.open(PHOTO_DB_NAME, 1);
    req.onupgradeneeded = function (ev) {
      var db = ev.target.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE)) db.createObjectStore(PHOTO_STORE);
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
  });
  return _photoDbPromise;
}

function persistPhoto(id, dataUrl) {
  if (!id || !dataUrl) return Promise.resolve();
  return _openPhotoDb().then(function (db) {
    if (!db) return;
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(PHOTO_STORE, 'readwrite');
      tx.objectStore(PHOTO_STORE).put(dataUrl, id);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  }).catch(function (e) {
    console.warn('[photos] persist', e);
  });
}

function getStoredPhoto(id) {
  if (!id) return Promise.resolve(null);
  return _openPhotoDb().then(function (db) {
    if (!db) return null;
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(PHOTO_STORE, 'readonly');
      var req = tx.objectStore(PHOTO_STORE).get(id);
      req.onsuccess = function () { resolve(req.result || null); };
      req.onerror = function () { reject(req.error); };
    });
  }).catch(function () { return null; });
}

function persistPhotoList(list) {
  var arr = Array.isArray(list) ? list : [];
  var jobs = [];
  var out = [];
  for (var i = 0; i < arr.length; i++) {
    var p = arr[i] || {};
    var id = p.id || newPhotoId();
    if (p.dataUrl) jobs.push(persistPhoto(id, p.dataUrl));
    out.push({ id: id, name: p.name || '', dataUrl: p.dataUrl });
  }
  return Promise.all(jobs).then(function () { return out; });
}

function hydratePhotoList(list) {
  var arr = Array.isArray(list) ? list : [];
  return Promise.all(arr.map(function (p) {
    if (!p) return null;
    if (p.dataUrl) {
      return { id: p.id || newPhotoId(), name: p.name || '', dataUrl: p.dataUrl };
    }
    if (!p.id) return null;
    return getStoredPhoto(p.id).then(function (dataUrl) {
      if (!dataUrl) return null;
      return { id: p.id, name: p.name || '', dataUrl: dataUrl };
    });
  })).then(function (rows) {
    return rows.filter(function (p) { return p && p.dataUrl; });
  });
}

async function persistAndStripEntryPhotos(entries) {
  for (var i = 0; i < (entries || []).length; i++) {
    var e = entries[i];
    if (!e || !Array.isArray(e.photos) || !e.photos.length) continue;
    var stored = await persistPhotoList(e.photos);
    e.photos = typeof stripPhotosForStorage === 'function'
      ? stripPhotosForStorage(stored)
      : stored.map(function (p) { return { id: p.id, name: p.name || '' }; });
  }
}

async function hydrateEntriesPhotos(entries) {
  var out = [];
  for (var i = 0; i < (entries || []).length; i++) {
    var e = Object.assign({}, entries[i]);
    if (Array.isArray(e.photos) && e.photos.length) {
      e.photos = await hydratePhotoList(e.photos);
    }
    out.push(e);
  }
  return out;
}

function migrateLocalPhotosToIdb() {
  var keys = ['wycena-history', 'wycena-archive', 'wycena-kosz'];
  var jobs = keys.map(function (key) {
    var list;
    try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { list = []; }
    if (!Array.isArray(list) || !list.length) return Promise.resolve();
    return persistAndStripEntryPhotos(list).then(function () {
      try { localStorage.setItem(key, JSON.stringify(list)); } catch (e2) {}
    });
  });
  var draftRaw = localStorage.getItem('wycena-v2');
  if (draftRaw) {
    jobs.push((async function () {
      try {
        var st = JSON.parse(draftRaw);
        if (Array.isArray(st.photos) && st.photos.length) {
          var stored = await persistPhotoList(st.photos);
          st.photos = typeof stripPhotosForStorage === 'function'
            ? stripPhotosForStorage(stored)
            : stored.map(function (p) { return { id: p.id, name: p.name || '' }; });
          localStorage.setItem('wycena-v2', JSON.stringify(st));
        }
      } catch (e) {}
    })());
  }
  return Promise.all(jobs);
}

window.newPhotoId = newPhotoId;
window.persistPhoto = persistPhoto;
window.persistPhotoList = persistPhotoList;
window.hydratePhotoList = hydratePhotoList;
window.persistAndStripEntryPhotos = persistAndStripEntryPhotos;
window.hydrateEntriesPhotos = hydrateEntriesPhotos;
window.migrateLocalPhotosToIdb = migrateLocalPhotosToIdb;
