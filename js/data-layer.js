'use strict';

(function (root) {
  var GH_TOKEN_STORAGE = 'google-drive';
  var GH_TOKEN_SESSION_KEY = 'gh_token_session';
  var GH_SETTINGS_PENDING_KEY = 'gh_settings_pending';
  var APP_SETTINGS_FILENAME = 'serwis-app-settings.json';

  function shouldPersistGhTokenToLocalStorage() {
    return false;
  }

  function emptyAppSettings() {
    return { ghToken: '', ghRepo: '', cfDeployHook: '' };
  }

  function parseAppSettings(raw) {
    var empty = emptyAppSettings();
    if (raw == null || raw === '') return empty;
    try {
      var o = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!o || typeof o !== 'object') return empty;
      return {
        ghToken: String(o.ghToken || o.githubToken || '').trim(),
        ghRepo: String(o.ghRepo || '').trim(),
        cfDeployHook: String(o.cfDeployHook || '').trim()
      };
    } catch (e) {
      return empty;
    }
  }

  function serializeAppSettings(settings) {
    var s = parseAppSettings(settings || {});
    return JSON.stringify({
      version: 1,
      updatedAt: new Date().toISOString(),
      ghToken: s.ghToken,
      ghRepo: s.ghRepo,
      cfDeployHook: s.cfDeployHook
    });
  }

  function backupOmitsGhToken(payloadObj) {
    if (!payloadObj || typeof payloadObj !== 'object') return true;
    if (payloadObj.ghToken || payloadObj.githubToken) return false;
    var blob = JSON.stringify(payloadObj);
    return blob.indexOf('"ghToken"') < 0 && blob.indexOf('ghp_') < 0 && blob.indexOf('github_pat_') < 0;
  }

  var GH_UPLOAD_PATHS = [
    'index.html',
    'wrangler.toml',
    'js/data-layer.js',
    'js/catalog.js',
    'js/photos.js',
    'js/sync.js',
    'js/pwa.js',
    'service-worker.js'
  ];

  function mapGhUploadPath(fileName, relativePath) {
    var rel = String(relativePath || fileName || '').replace(/\\/g, '/').replace(/^\.\//, '');
    var parts = rel.split('/').filter(Boolean);
    var base = parts.length ? parts[parts.length - 1] : '';
    if (!base) return '';
    var lower = base.toLowerCase();
    var relLower = rel.toLowerCase();
    var i;
    if (/\.html?$/i.test(lower)) return 'index.html';
    for (i = 0; i < GH_UPLOAD_PATHS.length; i++) {
      if (GH_UPLOAD_PATHS[i].toLowerCase() === relLower) return GH_UPLOAD_PATHS[i];
    }
    var asJs = 'js/' + base;
    for (i = 0; i < GH_UPLOAD_PATHS.length; i++) {
      var known = GH_UPLOAD_PATHS[i].toLowerCase();
      if (known === asJs.toLowerCase() || known === lower) return GH_UPLOAD_PATHS[i];
    }
    return '';
  }

  function collectGhUploadMap(files) {
    var list = files && files.length ? Array.prototype.slice.call(files) : [];
    var byPath = {};
    var skipped = [];
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      var name = (f && (f.name || f.fileName)) || '';
      var rel = (f && f.webkitRelativePath) || name;
      var path = mapGhUploadPath(name, rel);
      if (!path) {
        if (name) skipped.push(name);
        continue;
      }
      if (path === 'index.html' && byPath[path]) {
        var haveExact = String(byPath[path].name || '').toLowerCase() === 'index.html';
        var isExact = String(name).toLowerCase() === 'index.html';
        if (haveExact && !isExact) continue;
      }
      byPath[path] = f;
    }
    return { byPath: byPath, skipped: skipped };
  }

  function isNetworkFetchError(err) {
    var m = String((err && err.message) || err || '');
    return /Failed to fetch|NetworkError|Load failed|Network request failed|network error/i.test(m);
  }

  function githubGetTreatAsMissing(status, err) {
    if (status === 404) return true;
    return !!(err && isNetworkFetchError(err));
  }

  function inlineScriptSrc(html, path, code) {
    var src = String(html || '');
    var safe = String(code || '').replace(/<\/script/gi, '<\\/script');
    var escaped = String(path || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var re = new RegExp('<script\\b[^>]*\\bsrc=["\\\']' + escaped + '["\\\'][^>]*>\\s*<\\/script>', 'i');
    if (!re.test(src)) return src;
    return src.replace(re, function () {
      return '<script>\n' + safe + '\n</script>';
    });
  }

  function photoDriveFileName(id) {
    var safe = String(id || '').replace(/[^A-Za-z0-9_-]/g, '');
    if (!safe) return '';
    return 'photo-' + safe + '.jpg';
  }

  function collectPhotoIds(entries) {
    var seen = {};
    var out = [];
    var list = Array.isArray(entries) ? entries : [];
    for (var i = 0; i < list.length; i++) {
      var photos = list[i] && list[i].photos;
      if (!Array.isArray(photos)) continue;
      for (var j = 0; j < photos.length; j++) {
        var pid = photos[j] && photos[j].id;
        if (!pid) continue;
        var key = String(pid);
        if (seen[key]) continue;
        seen[key] = 1;
        out.push(key);
      }
    }
    return out;
  }

  function emptyCennik() {
    return {
      updatedAt: 0,
      itemPrices: {},
      presets: {},
      services: {},
      crClassic: {},
      crEbike: {},
      crExtras: {}
    };
  }

  function _strNumMap(raw) {
    var out = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    Object.keys(raw).forEach(function (k) {
      var n = Number(raw[k]);
      if (Number.isFinite(n)) out[String(k)] = n;
    });
    return out;
  }

  function _nestedStrNumMap(raw) {
    var out = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    Object.keys(raw).forEach(function (k) {
      out[String(k)] = _strNumMap(raw[k]);
    });
    return out;
  }

  function _cennikTime(v) {
    if (typeof v === 'string') return Date.parse(v) || 0;
    var n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function parseCennik(raw) {
    var empty = emptyCennik();
    if (raw == null || raw === '') return empty;
    try {
      var o = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!o || typeof o !== 'object') return empty;
      return {
        updatedAt: _cennikTime(o.updatedAt),
        itemPrices: _strNumMap(o.itemPrices),
        presets: _nestedStrNumMap(o.presets),
        services: _strNumMap(o.services),
        crClassic: _strNumMap(o.crClassic),
        crEbike: _strNumMap(o.crEbike),
        crExtras: _strNumMap(o.crExtras)
      };
    } catch (e) {
      return empty;
    }
  }

  function serializeCennik(settings) {
    var s = parseCennik(settings || {});
    return JSON.stringify({
      version: 1,
      updatedAt: s.updatedAt,
      itemPrices: s.itemPrices,
      presets: s.presets,
      services: s.services,
      crClassic: s.crClassic,
      crEbike: s.crEbike,
      crExtras: s.crExtras
    });
  }

  function mergeCennik(local, remote) {
    var a = parseCennik(local);
    var b = parseCennik(remote);
    if (b.updatedAt > a.updatedAt) return b;
    return a;
  }

  function _cloneJson(v) {
    return JSON.parse(JSON.stringify(v == null ? null : v));
  }

  function _applyNum(obj, key, map) {
    if (!obj || !key || !map || !Object.prototype.hasOwnProperty.call(map, key)) return;
    var n = Number(map[key]);
    if (Number.isFinite(n)) obj.price = n;
  }

  function applyCennikToCatalog(factory, overlay) {
    var c = parseCennik(overlay);
    var src = factory && typeof factory === 'object' ? factory : {};
    var defaults = _cloneJson(src.DEFAULTS || []) || [];
    var services = _cloneJson(src.NAPRAWA_SERVICES || []) || [];
    var crC = _cloneJson(src.CR_ASSEMBLY_CLASSIC || []) || [];
    var crE = _cloneJson(src.CR_ASSEMBLY_EBIKE || []) || [];
    var crX = _cloneJson(src.CR_EXTRAS || []) || [];
    var i;
    for (i = 0; i < services.length; i++) _applyNum(services[i], services[i] && services[i].id, c.services);
    for (i = 0; i < defaults.length; i++) {
      var item = defaults[i];
      if (!item || !item.name) continue;
      _applyNum(item, item.name, c.itemPrices);
      var opts = item.options;
      if (Array.isArray(opts)) {
        for (var o = 0; o < opts.length; o++) _applyNum(opts[o], opts[o] && opts[o].id, c.services);
      }
      var pmap = c.presets[item.name];
      var presets = item.presets;
      if (pmap && Array.isArray(presets)) {
        for (var p = 0; p < presets.length; p++) _applyNum(presets[p], presets[p] && presets[p].label, pmap);
      }
    }
    for (i = 0; i < crC.length; i++) _applyNum(crC[i], crC[i] && crC[i].id, c.crClassic);
    for (i = 0; i < crE.length; i++) _applyNum(crE[i], crE[i] && crE[i].id, c.crEbike);
    for (i = 0; i < crX.length; i++) _applyNum(crX[i], crX[i] && crX[i].id, c.crExtras);
    return {
      DEFAULTS: defaults,
      NAPRAWA_SERVICES: services,
      CR_ASSEMBLY_CLASSIC: crC,
      CR_ASSEMBLY_EBIKE: crE,
      CR_EXTRAS: crX
    };
  }

  function cennikFromCatalog(catalog, updatedAt) {
    var src = catalog && typeof catalog === 'object' ? catalog : {};
    var out = emptyCennik();
    out.updatedAt = _cennikTime(updatedAt) || Date.now();
    function takeList(list, map, keyName) {
      var arr = Array.isArray(list) ? list : [];
      for (var i = 0; i < arr.length; i++) {
        var row = arr[i];
        if (!row || row[keyName] == null) continue;
        var n = Number(row.price);
        if (Number.isFinite(n)) map[String(row[keyName])] = n;
      }
    }
    var defaults = Array.isArray(src.DEFAULTS) ? src.DEFAULTS : [];
    for (var i = 0; i < defaults.length; i++) {
      var item = defaults[i];
      if (!item || !item.name) continue;
      var price = Number(item.price);
      if (Number.isFinite(price)) out.itemPrices[item.name] = price;
      if (Array.isArray(item.presets) && item.presets.length) {
        var pmap = {};
        takeList(item.presets, pmap, 'label');
        if (Object.keys(pmap).length) out.presets[item.name] = pmap;
      }
    }
    takeList(src.NAPRAWA_SERVICES, out.services, 'id');
    takeList(src.CR_ASSEMBLY_CLASSIC, out.crClassic, 'id');
    takeList(src.CR_ASSEMBLY_EBIKE, out.crEbike, 'id');
    takeList(src.CR_EXTRAS, out.crExtras, 'id');
    return out;
  }

  var CENNIK_STORAGE_KEY = 'serwis-cennik';
  var PHOTO_DRIVE_FOLDER = 'zdjecia';

  function stripPhotosForStorage(photos) {
    if (!Array.isArray(photos)) return [];
    var out = [];
    for (var i = 0; i < photos.length; i++) {
      var p = photos[i];
      if (!p || !p.id) continue;
      out.push({ id: String(p.id), name: p.name ? String(p.name) : '' });
    }
    return out;
  }

  function entryPhotosForStorage(entry) {
    if (!entry || typeof entry !== 'object') return entry;
    var next = {};
    for (var k in entry) {
      if (Object.prototype.hasOwnProperty.call(entry, k)) next[k] = entry[k];
    }
    next.photos = stripPhotosForStorage(entry.photos);
    return next;
  }

  function _rabTime(r) {
    if (!r) return 0;
    var t = Number(r.createdAt);
    if (t) return t;
    t = Date.parse(r.updatedAt || r.createdAt || 0);
    return t || 0;
  }

  function mergeRabatyLists(local, remote) {
    var map = {};
    var order = [];
    function add(r) {
      if (!r || !r.code) return;
      var key = String(r.code);
      var ex = map[key];
      if (!ex) {
        map[key] = r;
        order.push(key);
        return;
      }
      var et = _rabTime(ex);
      var rt = _rabTime(r);
      if (rt > et) map[key] = r;
      else if (rt === et) map[key] = r;
    }
    (Array.isArray(remote) ? remote : []).forEach(add);
    (Array.isArray(local) ? local : []).forEach(add);
    return order.map(function (k) { return map[k]; });
  }

  var api = {
    GH_TOKEN_STORAGE: GH_TOKEN_STORAGE,
    GH_TOKEN_SESSION_KEY: GH_TOKEN_SESSION_KEY,
    GH_SETTINGS_PENDING_KEY: GH_SETTINGS_PENDING_KEY,
    APP_SETTINGS_FILENAME: APP_SETTINGS_FILENAME,
    shouldPersistGhTokenToLocalStorage: shouldPersistGhTokenToLocalStorage,
    stripPhotosForStorage: stripPhotosForStorage,
    entryPhotosForStorage: entryPhotosForStorage,
    photoDriveFileName: photoDriveFileName,
    collectPhotoIds: collectPhotoIds,
    emptyCennik: emptyCennik,
    parseCennik: parseCennik,
    serializeCennik: serializeCennik,
    mergeCennik: mergeCennik,
    applyCennikToCatalog: applyCennikToCatalog,
    cennikFromCatalog: cennikFromCatalog,
    CENNIK_STORAGE_KEY: CENNIK_STORAGE_KEY,
    PHOTO_DRIVE_FOLDER: PHOTO_DRIVE_FOLDER,
    mergeRabatyLists: mergeRabatyLists,
    parseAppSettings: parseAppSettings,
    serializeAppSettings: serializeAppSettings,
    backupOmitsGhToken: backupOmitsGhToken,
    GH_UPLOAD_PATHS: GH_UPLOAD_PATHS,
    mapGhUploadPath: mapGhUploadPath,
    collectGhUploadMap: collectGhUploadMap,
    isNetworkFetchError: isNetworkFetchError,
    githubGetTreatAsMissing: githubGetTreatAsMissing,
    inlineScriptSrc: inlineScriptSrc,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.SerwisData = api;
  root.stripPhotosForStorage = stripPhotosForStorage;
  root.entryPhotosForStorage = entryPhotosForStorage;
  root.photoDriveFileName = photoDriveFileName;
  root.collectPhotoIds = collectPhotoIds;
  root.emptyCennik = emptyCennik;
  root.parseCennik = parseCennik;
  root.serializeCennik = serializeCennik;
  root.mergeCennik = mergeCennik;
  root.applyCennikToCatalog = applyCennikToCatalog;
  root.cennikFromCatalog = cennikFromCatalog;
  root.CENNIK_STORAGE_KEY = CENNIK_STORAGE_KEY;
  root.PHOTO_DRIVE_FOLDER = PHOTO_DRIVE_FOLDER;
  root.mergeRabatyLists = mergeRabatyLists;
  root.shouldPersistGhTokenToLocalStorage = shouldPersistGhTokenToLocalStorage;
  root.parseAppSettings = parseAppSettings;
  root.serializeAppSettings = serializeAppSettings;
  root.GH_TOKEN_SESSION_KEY = GH_TOKEN_SESSION_KEY;
  root.GH_SETTINGS_PENDING_KEY = GH_SETTINGS_PENDING_KEY;
  root.APP_SETTINGS_FILENAME = APP_SETTINGS_FILENAME;
  root.GH_UPLOAD_PATHS = GH_UPLOAD_PATHS;
  root.mapGhUploadPath = mapGhUploadPath;
  root.collectGhUploadMap = collectGhUploadMap;
  root.isNetworkFetchError = isNetworkFetchError;
  root.githubGetTreatAsMissing = githubGetTreatAsMissing;
  root.inlineScriptSrc = inlineScriptSrc;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
