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
