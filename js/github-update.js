'use strict';
try { localStorage.removeItem('gh_token'); } catch (_) {}
var GH_TOKEN_SESSION_KEY = 'gh_token_session';
var APP_ASSET_PATHS = [
  'js/data-layer.js',
  'js/catalog.js',
  'js/photos.js',
  'js/sync.js',
  'js/github-update.js',
  'js/pwa.js',
  'service-worker.js'
];
function _guessGhRepoFromLocation() {
  try {
    var host = String(window.location.hostname || '').toLowerCase();
    var m = host.match(/^([^.]+)\.github\.io$/);
    if (!m) return '';
    var user = m[1];
    var seg = String(window.location.pathname || '').replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)[0] || '';
    if (seg && seg.toLowerCase() !== user.toLowerCase()) return user + '/' + seg;
    return user + '/' + user;
  } catch (e) { return ''; }
}

function _normalizeGhRepo(raw) {
  var repo = String(raw || '').trim();
  if (!repo) return _guessGhRepoFromLocation();
  repo = repo.replace(/^https?:\/\//i, '');
  repo = repo.replace(/^www\./i, '');
  repo = repo.replace(/^github\.com\//i, '');
  repo = repo.replace(/\.git$/i, '');
  repo = repo.split('?')[0].split('#')[0];
  repo = repo.replace(/\/+$/, '');
  if (repo.indexOf('/') < 0) {
    var guess = _guessGhRepoFromLocation();
    if (guess && guess.indexOf('/') >= 0) return guess.split('/')[0] + '/' + repo;
  }
  return repo;
}

function ghModalClose() {
  var m = document.getElementById('github-update-modal');
  if (m) m.remove();
}

function otworzGithubUpdate() {
  var old = document.getElementById('github-update-modal');
  if (old) old.remove();

  var token = sessionStorage.getItem(GH_TOKEN_SESSION_KEY) || '';
  var repo  = localStorage.getItem('gh_repo') || _guessGhRepoFromLocation() || '';
  var cfHook = localStorage.getItem('cf_deploy_hook') || '';

  var overlay = document.createElement('div');
  overlay.id = 'github-update-modal';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:1100;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `
    <div style="background:#0d1117;border:1px solid #238636;border-radius:16px;padding:24px 20px;max-width:95vw;width:95vw;margin:0 auto;display:flex;flex-direction:column;gap:14px;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:8px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3fb950" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
          <span style="font-size:16px;font-weight:700;color:#fff;">Update App</span>
        </div>
      </div>

      <!-- Wybór plików -->
      <div style="display:flex;flex-direction:column;gap:6px;">
        <label style="font-size:11px;font-weight:700;color:#8b949e;text-transform:uppercase;letter-spacing:.6px;">Pliki aplikacji</label>
        <label id="gh-file-label" style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border:2px dashed #30363d;border-radius:8px;cursor:pointer;transition:border-color 0.15s;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b949e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span id="gh-file-name" style="font-size:13px;color:#8b949e;line-height:1.45;">Wybierz index.html + cały folder js</span>
          <input type="file" id="gh-file-input" multiple accept=".html,.htm,.js,.toml,text/html,text/javascript,application/javascript" style="display:none;">
        </label>
        <span style="font-size:11px;color:#6e7681;line-height:1.4;">Zrób to z folderu na komputerze (nie z zepsutej strony online). Zaznacz index.html, service-worker.js i wszystkie pliki z js. HTML wyjedzie ze skryptami w środku, żeby menu i kalendarz działały nawet gdyby js/ nie doszedł.</span>
      </div>

      <div style="display:flex;flex-direction:column;gap:6px;">
        <label style="font-size:11px;font-weight:700;color:#8b949e;text-transform:uppercase;letter-spacing:.6px;">Token</label>
        <div style="position:relative;">
          <input type="password" id="gh-token-input" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            style="width:100%;font-size:12px;padding:10px 36px 10px 12px;border:1px solid #30363d;border-radius:8px;background:#161b22;color:#e6edf3;outline:none;font-family:inherit;">
          <button id="gh-eye-btn" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:#8b949e;cursor:pointer;font-size:14px;">👁</button>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <label style="font-size:11px;font-weight:700;color:#8b949e;text-transform:uppercase;letter-spacing:.6px;">Repo GitHub</label>
        <input type="text" id="gh-repo-input" placeholder="df92x/serwis"
          style="width:100%;font-size:13px;padding:10px 12px;border:1px solid #30363d;border-radius:8px;background:#161b22;color:#e6edf3;outline:none;"
          autocomplete="off" spellcheck="false">
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <label style="font-size:11px;font-weight:700;color:#8b949e;text-transform:uppercase;letter-spacing:.6px;">Cloudflare Deploy Hook <span style="font-weight:500;text-transform:none;letter-spacing:0;">(opcjonalnie)</span></label>
        <input type="url" id="cf-hook-input" placeholder="https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/…"
          style="width:100%;font-size:12px;padding:10px 12px;border:1px solid #30363d;border-radius:8px;background:#161b22;color:#e6edf3;outline:none;"
          autocomplete="off" spellcheck="false">
        <span style="font-size:11px;color:#6e7681;line-height:1.4;">Pages → projekt → Settings → Builds → Deploy hooks → Add hook. Wymusza nowy build po wysyłce na GitHub.</span>
      </div>
      <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;font-size:12px;color:#8b949e;line-height:1.4;">
        <input type="checkbox" id="gh-save" checked style="accent-color:#238636;margin-top:2px;flex-shrink:0;">
        <span>Zapamiętaj token na koncie Google Drive<br>
          <span style="font-size:11px;color:#6e7681;">Po zalogowaniu do Drive nie trzeba go wpisywać ponownie. Nie zapisujemy tokenu w przeglądarce na stałe.</span>
        </span>
      </label>
      <div id="gh-status" style="display:none;font-size:13px;padding:10px 12px;border-radius:8px;font-weight:600;text-align:center;"></div>
      <div style="display:flex;gap:10px;">
        <button id="gh-cancel-btn" class="btn-close btn-cancel ui-tile ui-tile--sm ui-tile--danger" style="flex:1;margin-left:0;">Anuluj</button>
        <button id="gh-upload-btn" style="flex:2;padding:12px;background:#238636;border:none;border-radius:8px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
          Wyślij update
        </button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  document.getElementById('gh-token-input').value = token;
  document.getElementById('gh-repo-input').value  = repo;
  var cfHookEl = document.getElementById('cf-hook-input');
  if (cfHookEl) cfHookEl.value = cfHook;

  function _renderGhFileSummary(fileList) {
    var nameEl = document.getElementById('gh-file-name');
    var labelEl = document.getElementById('gh-file-label');
    if (!nameEl) return;
    var collected = typeof collectGhUploadMap === 'function'
      ? collectGhUploadMap(fileList)
      : { byPath: {}, skipped: [] };
    var paths = Object.keys(collected.byPath);
    if (!paths.length) {
      nameEl.textContent = 'Wybierz index.html + cały folder js';
      nameEl.title = '';
      nameEl.style.color = '#8b949e';
      if (labelEl) labelEl.style.borderColor = '#30363d';
      return;
    }
    paths.sort();
    nameEl.textContent = paths.join(' · ') + '  (' + paths.length + ')';
    var title = paths.join('\n');
    if (collected.skipped && collected.skipped.length) title += '\nPominięte: ' + collected.skipped.join(', ');
    nameEl.title = title;
    nameEl.style.color = '#3fb950';
    if (labelEl) labelEl.style.borderColor = '#238636';
  }

  function _assignGhFiles(fileList) {
    var input = document.getElementById('gh-file-input');
    if (!input || !fileList) return;
    try {
      var dt = new DataTransfer();
      for (var i = 0; i < fileList.length; i++) dt.items.add(fileList[i]);
      input.files = dt.files;
    } catch (_) {}
    _renderGhFileSummary(input.files);
  }

  document.getElementById('gh-file-input').addEventListener('change', function() {
    _renderGhFileSummary(this.files);
  });

  var dropLabel = document.getElementById('gh-file-label');
  if (dropLabel) {
    dropLabel.addEventListener('dragover', function(e) {
      e.preventDefault();
      dropLabel.style.borderColor = '#238636';
    });
    dropLabel.addEventListener('dragleave', function() {
      if (!(document.getElementById('gh-file-input') || {}).files || !document.getElementById('gh-file-input').files.length) {
        dropLabel.style.borderColor = '#30363d';
      }
    });
    dropLabel.addEventListener('drop', function(e) {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        _assignGhFiles(e.dataTransfer.files);
      }
    });
  }

  document.getElementById('gh-cancel-btn').onclick = ghModalClose;
  document.getElementById('gh-upload-btn').onclick = githubUpdate;
  document.getElementById('gh-eye-btn').onclick = function() {
    var i = document.getElementById('gh-token-input');
    i.type = i.type === 'password' ? 'text' : 'password';
  };
  overlay.addEventListener('click', function(e) { if (e.target === overlay) ghModalClose(); });
}

function ghStatus(msg, type) {
  var s = document.getElementById('gh-status');
  if (!s) return;
  s.style.display = 'block';
  s.textContent = msg;
  if (type === 'ok')       { s.style.background='#0d2a0d'; s.style.border='1px solid #2ea043'; s.style.color='#3fb950'; }
  else if (type === 'err') { s.style.background='#2a0d0d'; s.style.border='1px solid #f85149'; s.style.color='#f85149'; }
  else                     { s.style.background='#111827'; s.style.border='1px solid #238636'; s.style.color='#8b949e'; }
}

function _readFileText(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function(e) { resolve(e.target.result); };
    reader.onerror = function() { reject(new Error('Błąd odczytu ' + ((file && file.name) || 'pliku'))); };
    reader.readAsText(file, 'UTF-8');
  });
}

async function _ghFileContent(path, picked) {
  if (picked && picked[path]) return _readFileText(picked[path]);
  if (path === 'wrangler.toml') return _WRANGLER_TOML;
  try {
    var assetRes = await fetch(path + '?_v=' + Date.now(), { cache: 'no-store' });
    if (!assetRes.ok) {
      throw new Error('Nie można wczytać ' + path + ' z tej strony (HTTP ' + assetRes.status + '). Zaznacz ten plik na dysku.');
    }
    return assetRes.text();
  } catch (e) {
    if (typeof isNetworkFetchError === 'function' ? isNetworkFetchError(e) : /Failed to fetch/i.test(e && e.message)) {
      throw new Error('Nie można pobrać ' + path + ' z tej strony. Zaznacz ten plik razem z HTML.');
    }
    throw e;
  }
}

async function _inlineAppScriptsIntoHtml(html, picked) {
  var paths = (typeof APP_ASSET_PATHS !== 'undefined' && APP_ASSET_PATHS.slice)
    ? APP_ASSET_PATHS.filter(function (p) { return /\.js$/i.test(p) && p !== 'service-worker.js'; })
    : ['js/data-layer.js', 'js/catalog.js', 'js/photos.js', 'js/sync.js', 'js/github-update.js', 'js/pwa.js'];
  var out = html;
  var missing = [];
  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    try {
      var code = await _ghFileContent(path, picked);
      var next = typeof inlineScriptSrc === 'function' ? inlineScriptSrc(out, path, code) : out;
      if (next === out && new RegExp('src=["\\\']' + path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\\\']').test(out)) {
        missing.push(path + ' (nie wstawiono do HTML)');
      } else {
        out = next;
      }
    } catch (e) {
      missing.push(path);
    }
  }
  if (missing.length) {
    throw new Error('Brak plików JS do złożenia HTML: ' + missing.join(', ') + '. Zaznacz index.html oraz cały folder js z komputera.');
  }
  return out;
}

var _WRANGLER_TOML = 'name = "naprawy"\ncompatibility_date = "2024-07-02"\nassets = { directory = "." }\n';

function _ghAuthHeaders(token) {
  return {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

async function _ghUpsertRepoFile(repo, path, content, token, branch) {
  var url = 'https://api.github.com/repos/' + repo + '/contents/' + path;
  var getHeaders = _ghAuthHeaders(token);
  var sha = null;
  try {
    var getRes = await fetch(url + '?ref=' + encodeURIComponent(branch || 'main'), { headers: getHeaders });
    if (getRes.status === 200) sha = (await getRes.json()).sha;
    else if (!(typeof githubGetTreatAsMissing === 'function' ? githubGetTreatAsMissing(getRes.status) : getRes.status === 404)) {
      var msg = '';
      try { msg = (await getRes.json()).message || ''; } catch {}
      throw new Error(msg || ('GitHub GET ' + path + ': HTTP ' + getRes.status));
    }
  } catch (e) {
    var treatMissing = typeof githubGetTreatAsMissing === 'function'
      ? githubGetTreatAsMissing(0, e)
      : /Failed to fetch/i.test(e && e.message);
    if (!treatMissing) throw e;
    sha = null;
  }
  var body = {
    message: 'Update App ' + new Date().toLocaleString('pl-PL'),
    content: btoa(unescape(encodeURIComponent(content))),
    branch: branch || 'main'
  };
  if (sha) body.sha = sha;
  var putHeaders = Object.assign({ 'Content-Type': 'application/json' }, getHeaders);
  var putRes;
  try {
    putRes = await fetch(url, { method: 'PUT', headers: putHeaders, body: JSON.stringify(body) });
  } catch (e) {
    throw new Error('GitHub nie przyjął ' + path + ' (' + ((e && e.message) || e) + '). Sprawdź internet i token.');
  }
  if (!putRes.ok) {
    var errBody = null;
    try { errBody = await putRes.json(); } catch {}
    throw new Error((errBody && errBody.message) ? (path + ': ' + errBody.message) : ('GitHub PUT ' + path + ': HTTP ' + putRes.status));
  }
}

// ── Auto-update GitHub ──
async function githubUpdate() {
  var token = (document.getElementById('gh-token-input') || {value:''}).value.trim();
  var repoEl = document.getElementById('gh-repo-input');
  var repo = _normalizeGhRepo(repoEl ? repoEl.value : '');
  if (repoEl && repo) repoEl.value = repo;
  var fileInput = document.getElementById('gh-file-input');
  var collected = typeof collectGhUploadMap === 'function'
    ? collectGhUploadMap(fileInput && fileInput.files)
    : { byPath: {}, skipped: [] };
  var picked = collected.byPath || {};

  if (!token) { ghStatus('⚠️ Wpisz Token!', 'err'); return; }
  if (!/^ghp_[A-Za-z0-9_]{20,}$/.test(token) && !/^github_pat_[A-Za-z0-9_]{20,}$/.test(token)) {
    ghStatus('⚠️ Token wygląda niepoprawnie (oczekiwane: ghp_… lub github_pat_…)', 'err');
    return;
  }
  if (!repo || repo.indexOf('/') < 0) {
    ghStatus('⚠️ Wpisz repo GitHub: user/nazwa (np. df92x/serwis)', 'err');
    return;
  }
  if (!picked['index.html']) { ghStatus('⚠️ Dodaj plik HTML (możesz zaznaczyć HTML + JS naraz).', 'err'); return; }

  var saveEl = document.getElementById('gh-save');
  var cfHookEl = document.getElementById('cf-hook-input');
  var cfHook = cfHookEl ? String(cfHookEl.value || '').trim() : '';
  try { localStorage.removeItem('gh_token'); } catch (_) {}
  var remember = !!(saveEl && saveEl.checked);
  var driveSavePromise = Promise.resolve(false);
  if (remember) {
    sessionStorage.setItem(GH_TOKEN_SESSION_KEY, token);
    localStorage.setItem('gh_repo',  repo);
    if (cfHook) localStorage.setItem('cf_deploy_hook', cfHook);
    else localStorage.removeItem('cf_deploy_hook');
    var settings = { ghToken: token, ghRepo: repo, cfDeployHook: cfHook };
    if (typeof queueAppSettingsPending === 'function') queueAppSettingsPending(settings);
    driveSavePromise = new Promise(function (resolve) {
      if (typeof hydrateAppSettingsWithDriveToken !== 'function') { resolve(false); return; }
      var settled = false;
      var t = setTimeout(function () { if (!settled) { settled = true; resolve(false); } }, 12000);
      hydrateAppSettingsWithDriveToken(function (ok) {
        if (settled) return;
        settled = true;
        clearTimeout(t);
        resolve(!!ok);
      });
    });
  } else {
    sessionStorage.removeItem(GH_TOKEN_SESSION_KEY);
    try { sessionStorage.removeItem(typeof GH_SETTINGS_PENDING_KEY === 'string' ? GH_SETTINGS_PENDING_KEY : 'gh_settings_pending'); } catch (_) {}
    localStorage.removeItem('gh_repo');
    localStorage.removeItem('cf_deploy_hook');
  }

  var btn = document.getElementById('gh-upload-btn');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }

  try {
    ghStatus('📄 Wczytywanie plików…', 'info');
    var html = await _readFileText(picked['index.html']);

    var buildIso = new Date().toISOString();
    if (/<meta\s+name=["']app-build["']/i.test(html)) {
      html = html.replace(/<meta\s+name=["']app-build["'][^>]*>/i, '<meta name="app-build" content="' + buildIso + '">');
    } else {
      html = html.replace(/<meta\s+name=["']viewport["'][^>]*>/i, function(m) { return m + '\n<meta name="app-build" content="' + buildIso + '">'; });
    }

    ghStatus('📦 Składanie HTML (JS w środku)…', 'info');
    html = await _inlineAppScriptsIntoHtml(html, picked);

    ghStatus('⬆️ Wysyłanie index.html…', 'info');
    await _ghUpsertRepoFile(repo, 'index.html', html, token, 'main');

    ghStatus('⚙️ Wysyłanie wrangler.toml…', 'info');
    var wrangler = await _ghFileContent('wrangler.toml', picked);
    await _ghUpsertRepoFile(repo, 'wrangler.toml', wrangler, token, 'main');

    var assetWarn = [];
    for (var ai = 0; ai < APP_ASSET_PATHS.length; ai++) {
      var assetPath = APP_ASSET_PATHS[ai];
      try {
        var fromDisk = !!(picked && picked[assetPath]);
        ghStatus('⬆️ Wysyłanie ' + assetPath + (fromDisk ? '' : ' (z aplikacji)') + '…', 'info');
        var assetText = await _ghFileContent(assetPath, picked);
        await _ghUpsertRepoFile(repo, assetPath, assetText, token, 'main');
      } catch (assetErr) {
        console.warn('[update] asset', assetPath, assetErr);
        assetWarn.push(assetPath);
      }
    }

    if (cfHook) {
      ghStatus('☁️ Uruchamianie builda Cloudflare…', 'info');
      try {
        await fetch(cfHook, { method: 'POST', mode: 'no-cors' });
      } catch (hookErr) {
        console.warn('[update] Cloudflare hook', hookErr);
      }
    }

    localStorage.setItem('gh_last_update', new Date().toISOString());
    if (typeof refreshServerAppVersion === 'function') refreshServerAppVersion();

    var driveOk = false;
    try { driveOk = await driveSavePromise; } catch (_) {}
    var extra = assetWarn.length ? ' JS osobno: ' + assetWarn.join(', ') + ' (HTML ma skrypty w środku).' : '';
    ghStatus(driveOk
      ? '✅ Wykonano — token zapisany na koncie Google. Odświeżam…' + extra
      : (remember
        ? '✅ GitHub OK. Zaloguj się do Drive, żeby trzymać token na koncie Google. Odświeżam…' + extra
        : '✅ Wykonano — odświeżam aplikację…' + extra), 'ok');
    try {
      if ('caches' in window) {
        var keys = await caches.keys();
        await Promise.all(keys.map(function(k) { return caches.delete(k); }));
      }
      if ('serviceWorker' in navigator) {
        var regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(function(r) { return r.unregister(); }));
      }
    } catch (_) {}
    setTimeout(function() {
      sessionStorage.setItem('allow-reload', '1');
      location.reload();
    }, 800);
  } catch(e) {
    ghStatus('❌ ' + (e.message || String(e)), 'err');
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
  }
}

window.otworzGithubUpdate = otworzGithubUpdate;
window.githubUpdate = githubUpdate;
