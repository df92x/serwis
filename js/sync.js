'use strict';

const GDRIVE_CLIENT_ID = '777523829575-8ash0ptk2rhlltjlq7tkpf3burcb2n9t.apps.googleusercontent.com';
const GDRIVE_SCOPE     = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email';
const GDRIVE_FOLDER    = 'Serwis Rowerowy';

var gdriveToken   = null;

let _tokenTimer   = null;

// ── Status UI ──────────────────────────────
// _syncUiLock zapobiega wzajemnemu wywoływaniu setSyncDot ↔ updateAdminSyncRow
let _syncUiLock = false;

function setSyncDot(state) {
  if (_syncUiLock) return;
  _syncUiLock = true;
  try {
    // Odczytaj przyciski RAZ przed mutacją DOM — updateAdminSyncRow (niżej)
    // wstawia nowe przyciski data-sync-btn; gdyby to nastąpiło w trakcie forEach,
    // nowe elementy mogłyby wywołać ponowne setSyncDot i zapętlić UI.
    const btns = Array.from(document.querySelectorAll('button[data-sync-btn]'));
    btns.forEach(btn => {
      if (state === 'busy') {
        btn.style.color = '#f59e0b';
        btn.style.opacity = '1';
        btn.disabled = true;
        btn.dataset.origText = btn.dataset.origText || btn.innerHTML;
        btn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Synchronizacja\u2026';
      } else {
        btn.disabled = false;
        btn.style.color = state === 'error' ? '#ef4444' : (state === 'ok' ? '#22c55e' : 'var(--text2)');
        btn.style.opacity = '';
        if (btn.dataset.origText) { btn.innerHTML = btn.dataset.origText; delete btn.dataset.origText; }
      }
    });
    // Odśwież panel admina — nie podczas busy, bo wstawienie nowego przycisku
    // data-sync-btn w środku synchronizacji mogłoby wywołać dodatkowy re-render.
    if (state !== 'busy') {
      updateAdminSyncRow();
    }
  } finally {
    _syncUiLock = false;
  }
  // Skeleton podczas synchronizacji / odświeżenie listy po zakończeniu.
  try {
    if (state === 'busy') {
      if (typeof showSyncSkeleton === 'function') showSyncSkeleton();
    } else {
      if (typeof rerenderCurrentHistoryTab === 'function') rerenderCurrentHistoryTab();
      if (state === 'ok' && typeof checkBackupReminder === 'function') checkBackupReminder();
    }
  } catch (e) {}
}

function updateAdminSyncRow() {
  const email = localStorage.getItem('gdrive-email');
  const ls    = localStorage.getItem('gdrive-last-sync');

  const avatar = safeImageSrc(localStorage.getItem('gdrive-avatar') || '');
  const maskEmail = e => {
    if (!e) return '';
    const [user, domain] = e.split('@');
    if (!domain) return e.slice(0,3) + '***';
    return user.slice(0,3) + '***@' + domain;
  };
  const emailMasked = escHTML(maskEmail(email || ''));
  const avatarHTML = avatar
    ? '<img src="' + escAttr(avatar) + '" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;" onerror="this.style.display=\'none\'">'
    : '';

  const loggedHTML =
    '<div style="display:flex;flex-direction:column;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border);gap:3px;text-align:center;">' +
      '<div style="display:flex;align-items:center;gap:8px;justify-content:center;">' +
        avatarHTML +
        '<span style="font-size:12px;color:#22c55e;">' + emailMasked + '</span>' +
      '</div>' +
      (ls ? '<span style="font-size:11px;color:var(--text3);">Ostatnia sync: ' +
        new Date(ls).toLocaleDateString('pl-PL',{day:'2-digit',month:'2-digit'}) + ' ' +
        new Date(ls).toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'}) + '</span>'
           : '<span style="font-size:11px;color:var(--text3);">Brak synchronizacji</span>') +
      _appVerLineHTML() +
    '</div>' +
    '<div style="display:flex;">' +
      '<button onclick="manualSync()" data-sync-btn="1" style="flex:1;background:var(--bg-panel);border:none;border-right:1px solid var(--border-panel);color:var(--text2);font-size:12px;font-weight:600;padding:10px 8px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;">' +
        '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>' +
        ' Synchronizuj' +
      '</button>' +
      '<button onclick="logoutGoogle()" style="background:var(--bg-panel);border:none;color:var(--text3);font-size:12px;font-weight:600;padding:10px 12px;cursor:pointer;">Wyloguj</button>' +
    '</div>';

  const guestHTML =
    '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 14px;border-bottom:1px solid var(--border);text-align:center;">' +
      '<button onclick="loginGoogle()" style="width:100%;background:none;border:none;color:var(--text3);font-size:13px;font-weight:600;padding:12px 16px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#556" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>' +
        'Zaloguj się z Google Drive' +
      '</button>' +
      _appVerLineHTML() +
    '</div>';

  const html = email ? loggedHTML : guestHTML;
  const mainPanel = $('main-sync-panel');
  if (mainPanel) mainPanel.innerHTML = html;
}
function _setToken(token) {
  gdriveToken = token;
  clearTimeout(_tokenTimer);
  _tokenTimer = setTimeout(() => {
    gdriveToken = null;
    setSyncDot('error');
  }, 55 * 60 * 1000);
}

function loginGoogle() {
  // Jeśli biblioteka GSI jeszcze się ładuje — poczekaj
  if (!window.google || !window.google.accounts) {
    var tries = 0;
    var wait = setInterval(function() {
      tries++;
      if (window.google && window.google.accounts) {
        clearInterval(wait);
        loginGoogle();
      } else if (tries > 30) {
        clearInterval(wait);
        alert('Nie można załadować Google Sign-In. Sprawdź połączenie z internetem i odśwież stronę.');
      }
    }, 200);
    return;
  }
  google.accounts.oauth2.initTokenClient({
    client_id: GDRIVE_CLIENT_ID,
    scope: GDRIVE_SCOPE,
    callback: async (resp) => {
      if (resp.error) { setSyncDot('error'); return; }
      _setToken(resp.access_token);
      try {
        const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo',
          { headers: { Authorization: 'Bearer ' + gdriveToken } });
        const d = await r.json();
        localStorage.setItem('gdrive-email', d.email || '');
        if (d.picture) localStorage.setItem('gdrive-avatar', d.picture);
      } catch {}
      // setSyncDot('off') już wywołuje updateAdminSyncRow wewnętrznie —
      // nie wywołujemy jej ponownie, żeby uniknąć podwójnego re-renderu panelu.
      // Sync NIE startuje automatycznie — użytkownik musi kliknąć "Synchronizuj".
      setSyncDot('off');
      try { await flushPendingAppSettings(); } catch (_) {}
    }
  }).requestAccessToken();
}

function logoutGoogle() {
  if (gdriveToken && window.google) google.accounts.oauth2.revoke(gdriveToken, () => {});
  gdriveToken = null;
  clearTimeout(_tokenTimer);
  localStorage.removeItem('gdrive-email');
  localStorage.removeItem('gdrive-avatar');
  localStorage.removeItem('gdrive-folder-id');
  setSyncDot('off');
}

// ── Cichy refresh tokenu przy zalogowaniu ─────────────────────────────────
// Odświeża token OAuth gdy użytkownik kliknie "Synchronizuj" i token wygasł.
// NIE uruchamia sync automatycznie — wyłącznie przygotowuje token do użycia.
function _refreshTokenSilently(onReady) {
  const email = localStorage.getItem('gdrive-email');
  if (!email) { onReady(false); return; }
  if (!window.google || !window.google.accounts) { onReady(false); return; }
  try {
    google.accounts.oauth2.initTokenClient({
      client_id: GDRIVE_CLIENT_ID,
      scope: GDRIVE_SCOPE,
      hint: email,
      prompt: 'none',
      error_callback: () => { onReady(false); },
      callback: (resp) => {
        if (resp.error) { onReady(false); return; }
        _setToken(resp.access_token);
        setSyncDot('off');
        onReady(true);
      }
    }).requestAccessToken({ prompt: 'none' });
  } catch(e) {
    console.warn('[sync] _refreshTokenSilently error:', e);
    onReady(false);
  }
}

// ── Drive API ─────────────────────────────
async function _driveReq(method, url, body) {
  const opts = { method, headers: { Authorization: 'Bearer ' + gdriveToken } };
  if (body) { opts.body = body; if (typeof body === 'string') opts.headers['Content-Type'] = 'application/json'; }
  const r = await fetch(url, opts);
  if (r.status === 401) { gdriveToken = null; setSyncDot('error'); throw new Error('token_expired'); }
  if (!r.ok) throw new Error('drive_' + r.status);
  return r.json();
}

async function _getFolderId() {
  let id = localStorage.getItem('gdrive-folder-id');
  if (id) return id;
  const res = await _driveReq('GET',
    "https://www.googleapis.com/drive/v3/files?q=" +
    encodeURIComponent("name='" + GDRIVE_FOLDER + "' and mimeType='application/vnd.google-apps.folder' and trashed=false") +
    "&fields=files(id)");
  if (res.files && res.files[0]) {
    id = res.files[0].id;
  } else {
    const created = await _driveReq('POST',
      'https://www.googleapis.com/drive/v3/files',
      JSON.stringify({ name: GDRIVE_FOLDER, mimeType: 'application/vnd.google-apps.folder' }));
    id = created.id;
  }
  localStorage.setItem('gdrive-folder-id', id);
  return id;
}

async function _saveFile(folderId, filename, body, contentType = 'application/json') {
  const fileBody = body instanceof Blob ? body : new Blob([body], { type: contentType });
  const q = encodeURIComponent("name='" + filename + "' and '" + folderId + "' in parents and trashed=false");
  const search = await _driveReq('GET',
    'https://www.googleapis.com/drive/v3/files?q=' + q + '&fields=files(id)');
  const fileId = search.files && search.files[0] ? search.files[0].id : null;
  if (fileId) {
    await fetch('https://www.googleapis.com/upload/drive/v3/files/' + fileId + '?uploadType=media', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + gdriveToken, 'Content-Type': contentType },
      body: fileBody
    });
  } else {
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify({ name: filename, parents: [folderId] })], { type: 'application/json' }));
    form.append('file', fileBody);
    await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST', headers: { Authorization: 'Bearer ' + gdriveToken }, body: form
    });
  }
}

function _appSettingsFileName() {
  return (typeof APP_SETTINGS_FILENAME === 'string' && APP_SETTINGS_FILENAME) || 'serwis-app-settings.json';
}
function _ghSessionKey() {
  return (typeof GH_TOKEN_SESSION_KEY === 'string' && GH_TOKEN_SESSION_KEY) || 'gh_token_session';
}
function _ghPendingKey() {
  return (typeof GH_SETTINGS_PENDING_KEY === 'string' && GH_SETTINGS_PENDING_KEY) || 'gh_settings_pending';
}

function applyAppSettingsLocally(settings) {
  var s = typeof parseAppSettings === 'function' ? parseAppSettings(settings) : (settings || {});
  try {
    if (s.ghToken) sessionStorage.setItem(_ghSessionKey(), s.ghToken);
    if (s.ghRepo) localStorage.setItem('gh_repo', s.ghRepo);
    if (s.cfDeployHook) localStorage.setItem('cf_deploy_hook', s.cfDeployHook);
  } catch (_) {}
}

async function _readDriveFileText(folderId, filename) {
  const q = encodeURIComponent("name='" + filename + "' and '" + folderId + "' in parents and trashed=false");
  const search = await _driveReq('GET',
    'https://www.googleapis.com/drive/v3/files?q=' + q + '&fields=files(id)');
  const fileId = search.files && search.files[0] ? search.files[0].id : null;
  if (!fileId) return null;
  const r = await fetch('https://www.googleapis.com/drive/v3/files/' + fileId + '?alt=media', {
    headers: { Authorization: 'Bearer ' + gdriveToken }
  });
  if (!r.ok) return null;
  return r.text();
}

async function loadAppSettingsFromDrive() {
  if (!gdriveToken) return null;
  const folderId = await _getFolderId();
  const raw = await _readDriveFileText(folderId, _appSettingsFileName());
  if (!raw) return null;
  const settings = typeof parseAppSettings === 'function' ? parseAppSettings(raw) : JSON.parse(raw);
  applyAppSettingsLocally(settings);
  return settings;
}

async function saveAppSettingsToDrive(settings) {
  if (!gdriveToken) return false;
  const s = typeof parseAppSettings === 'function' ? parseAppSettings(settings) : settings;
  const body = typeof serializeAppSettings === 'function'
    ? serializeAppSettings(s)
    : JSON.stringify(s);
  const folderId = await _getFolderId();
  await _saveFile(folderId, _appSettingsFileName(), body);
  applyAppSettingsLocally(s);
  try { sessionStorage.removeItem(_ghPendingKey()); } catch (_) {}
  return true;
}

function queueAppSettingsPending(settings) {
  const s = typeof parseAppSettings === 'function' ? parseAppSettings(settings) : settings;
  try {
    sessionStorage.setItem(_ghPendingKey(), JSON.stringify(s));
    applyAppSettingsLocally(s);
  } catch (_) {}
}

async function flushPendingAppSettings() {
  let pending = null;
  try {
    const raw = sessionStorage.getItem(_ghPendingKey());
    if (raw) pending = typeof parseAppSettings === 'function' ? parseAppSettings(raw) : JSON.parse(raw);
  } catch (_) {}
  if (pending && pending.ghToken) {
    return saveAppSettingsToDrive(pending);
  }
  return loadAppSettingsFromDrive();
}

function hydrateAppSettingsWithDriveToken(done) {
  const finish = function () {
    flushPendingAppSettings()
      .then(function (result) { if (done) done(!!result); })
      .catch(function () { if (done) done(false); });
  };
  if (gdriveToken) { finish(); return; }
  if (!localStorage.getItem('gdrive-email')) { if (done) done(false); return; }
  _refreshTokenSilently(function (ok) {
    if (ok) finish();
    else if (done) done(false);
  });
}

// ── Główna synchronizacja ─────────────────

// ── Status zlecenia (do scalania) ─────────
function _entryStatus(e) {
  // Priorytety konfliktów (im wyżej, tym ważniejsze):
  // 1. Przyjęte - SMS niewysłane
  // 2. Przyjęte - SMS wysłane
  // 3. Gotowe - SMS niewysłane
  // 4. Gotowe - SMS wysłane
  // 5. Wydane
  // 6. Kosz
  if (e.deletedAt) return 6; // kosz
  // Cofnięte z WYDANE → GOTOWE (unarchive): wyżej niż zwykłe WYDANE na Drive,
  // żeby scalanie nie przywracało archiwum. Bez wymogu raportKoncowy — inaczej
  // brak/niepełny raport dawał status 3–4 i przegrywał ze zdalnym WYDANE (5).
  if (e.unarchivedAt && !e.dataWydania && !e.archivedAt) return 5.5;
  if (e.dataWydania || e.archivedAt) return 5; // wydane
  if (e.raportKoncowy) return e.smsSent ? 4 : 3; // gotowe
  return e.smsSent ? 2 : 1; // przyjęte
}

// ── Pobierz dane z Drive ──────────────────
async function _fetchFromDrive() {
  const folderId = localStorage.getItem('gdrive-folder-id');
  const q = folderId
    ? encodeURIComponent("name='serwis-current.json' and '" + folderId + "' in parents and trashed=false")
    : encodeURIComponent("name='serwis-current.json' and trashed=false");
  const search = await _driveReq('GET',
    'https://www.googleapis.com/drive/v3/files?q=' + q + '&fields=files(id,modifiedTime)');
  if (!search.files || !search.files[0]) return null;
  const fileResp = await fetch(
    'https://www.googleapis.com/drive/v3/files/' + search.files[0].id + '?alt=media',
    { headers: { Authorization: 'Bearer ' + gdriveToken } });
  if (!fileResp.ok) return null;
  return fileResp.json();
}

// ── Scal lokalne z Drive (wyższy status wygrywa) ──
function _isUnarchivedState(e) {
  return !!(e && e.unarchivedAt && !e.dataWydania && !e.archivedAt);
}

function _archivedAtMs(e) {
  if (!e) return 0;
  if (e.archivedAt) return Date.parse(e.archivedAt) || 0;
  if (e.dataWydania) return _parseDateDMY(e.dataWydania) || 0;
  return 0;
}

function _pickMergeWinner(ex, entry) {
  // Cofnięcie (unarchivedAt) vs ponowne WYDAJ (archivedAt): wygrywa nowsza akcja.
  // Bez tego zdalny wpis z unarchivedAt (priorytet 5.5) nadpisuje lokalne WYDANE (5)
  // po sekwencji: WYDAJ → Cofnij → sync → WYDAJ → sync.
  const exUn = _isUnarchivedState(ex);
  const enUn = _isUnarchivedState(entry);
  const exAr = !!(ex && (ex.dataWydania || ex.archivedAt));
  const enAr = !!(entry && (entry.dataWydania || entry.archivedAt));
  if (exUn && enAr) {
    return _archivedAtMs(entry) >= (Date.parse(ex.unarchivedAt) || 0) ? entry : ex;
  }
  if (enUn && exAr) {
    return _archivedAtMs(ex) >= (Date.parse(entry.unarchivedAt) || 0) ? ex : entry;
  }

  const se = _entryStatus(entry);
  const sx = _entryStatus(ex);
  if (se > sx) return entry;
  if (sx > se) return ex;
  const merged = Object.assign({}, ex, entry);
  if (ex.smsSent || entry.smsSent) merged.smsSent = true;
  return merged;
}

async function _mergeData(remote) {
  const localH = getHistory();
  const localA = getArchive();
  const localK = getKosz();
  const remoteH = Array.isArray(remote.history) ? remote.history : [];
  const remoteA = Array.isArray(remote.archive) ? remote.archive : [];
  const remoteK = Array.isArray(remote.kosz)    ? remote.kosz    : [];
  const mergedPurged = _mergePurgedMaps(getPurgedMap(), remote.purged || {});

  const map = new Map();
  const add = (entry) => {
    const id  = String(entry.id);
    if (_isPurgedId(id, mergedPurged)) return;
    const ex  = map.get(id);
    if (!ex) { map.set(id, entry); return; }
    map.set(id, _pickMergeWinner(ex, entry));
  };
  // Lokalne mają priorytet przy równym statusie
  [...remoteH, ...remoteA, ...remoteK].forEach(add);
  [...localH,  ...localA,  ...localK ].forEach(add);

  const mergedH = [], mergedA = [], mergedK = [];
  for (const e of map.values()) {
    if (_isPurgedId(e.id, mergedPurged)) continue;
    // Docelowa lista wg realnego stanu wpisu (nie wg numeru priorytetu)
    if (e.deletedAt) mergedK.push(e);
    else if (e.dataWydania || e.archivedAt) mergedA.push(e);
    else mergedH.push(e);
  }

  if (typeof persistAndStripEntryPhotos === 'function') {
    await persistAndStripEntryPhotos(mergedH);
    await persistAndStripEntryPhotos(mergedA);
    await persistAndStripEntryPhotos(mergedK);
  }
  if (typeof mergeRabatyLists === 'function') {
    const remoteActive = remote.rabatyActive || remote.rabaty || [];
    const remoteUsed = remote.rabatyUsed || [];
    if (typeof saveRabatyActive === 'function') {
      saveRabatyActive(mergeRabatyLists(getRabatyActive(), remoteActive));
    }
    if (typeof saveRabatyUsed === 'function') {
      saveRabatyUsed(mergeRabatyLists(getRabatyUsed(), remoteUsed));
    }
  }

  const _storeEntries = (key, list) => {
    const payload = typeof entryPhotosForStorage === 'function'
      ? list.map(entryPhotosForStorage)
      : list;
    localStorage.setItem(key, JSON.stringify(payload));
  };
  _storeEntries('wycena-history', mergedH);
  _storeEntries('wycena-archive', mergedA);
  _storeEntries('wycena-kosz', mergedK);
  localStorage.setItem('wycena-purged', JSON.stringify(mergedPurged));

  // Wykryj zmiany: nowe wpisy LUB zmienione pola (np. smsSent)
  const localAll  = [...localH, ...localA, ...localK];
  const mergedAll = [...mergedH, ...mergedA, ...mergedK];
  const localMap  = new Map(localAll.map(e => [String(e.id), JSON.stringify(e)]));
  const changed   = mergedAll.filter(e => localMap.get(String(e.id)) !== JSON.stringify(e)).length;
  return changed; // > 0 oznacza cokolwiek się zmieniło
}

// ── Pełna synchronizacja (pobierz + scal + wyślij) ──
// Wywoływana WYŁĄCZNIE przez manualSync() — nigdy automatycznie.
async function _fullSync() {
  if (!gdriveToken) return;
  setSyncDot('busy');
  try {
    try { await flushPendingAppSettings(); } catch (_) {}
    const remote = await _fetchFromDrive();
    if (remote) {
      const changed = await _mergeData(remote);
      if (changed > 0) {
        // Odśwież aktywną zakładkę bez przeładowania strony
        const activeTab = typeof getCurrentTab === 'function' ? getCurrentTab() : null;
        if (activeTab === 'wydanie')       { try { renderWydanie($('wydanie-search-tel')?.value || ''); } catch(e){} }
        else if (activeTab === 'historia') { try { renderHistory(); } catch(e){} }
        else if (activeTab === 'archiwum') { try { renderArchive($('archive-search-tel')?.value || ''); } catch(e){} }
      }
    }
    await syncToDrive();
  } catch(e) {
    console.error('[sync]', e);
    if (e.message !== 'token_expired') setSyncDot('error');
  }
}

async function syncToDrive() {
  if (!gdriveToken) { setSyncDot('error'); return; }
  setSyncDot('busy');
  try {
    const folderId = await _getFolderId();
    const now      = new Date();
    let history = getHistory();
    let archive = getArchive();
    let kosz = getKosz();
    if (typeof hydrateEntriesPhotos === 'function') {
      history = await hydrateEntriesPhotos(history);
      archive = await hydrateEntriesPhotos(archive);
      kosz = await hydrateEntriesPhotos(kosz);
    }
    let stateRaw = localStorage.getItem('wycena-v2') || '';
    if (stateRaw && typeof hydratePhotoList === 'function') {
      try {
        const st = JSON.parse(stateRaw);
        if (Array.isArray(st.photos) && st.photos.length) {
          st.photos = await hydratePhotoList(st.photos);
          stateRaw = JSON.stringify(st);
        }
      } catch (_) {}
    }
    const payload  = JSON.stringify({
      syncedAt: now.toISOString(),
      version:  3,
      history,
      archive,
      kosz,
      purged:   getPurgedMap(),
      state:    stateRaw,
      rabatyActive: typeof getRabatyActive === 'function' ? getRabatyActive() : [],
      rabatyUsed: typeof getRabatyUsed === 'function' ? getRabatyUsed() : []
    });
    // Plik bieżący + dzienny snapshot
    await _saveFile(folderId, 'serwis-current.json', payload);
    await _saveFile(folderId, 'serwis-' + now.toISOString().slice(0,10) + '.json', payload);
    localStorage.setItem('gdrive-last-sync', now.toISOString());
    setSyncDot('ok');
  } catch(e) {
    console.error('[sync]', e);
    if (e.message !== 'token_expired') setSyncDot('error');
  }
}

function manualSync() {
  if (gdriveToken) {
    // Token aktywny — sync od razu
    _fullSync();
  } else if (localStorage.getItem('gdrive-email')) {
    // Był zalogowany, token wygasł — odśwież cicho i sync
    setSyncDot('busy');
    _refreshTokenSilently((ok) => {
      if (ok) _fullSync();
      else    loginGoogle(); // wymaga interakcji użytkownika
    });
  } else {
    // Nigdy nie logował — otwórz okno logowania
    loginGoogle();
  }
}

window.loginGoogle  = loginGoogle;
window.logoutGoogle = logoutGoogle;
window.manualSync   = manualSync;
window.saveAppSettingsToDrive = saveAppSettingsToDrive;
window.loadAppSettingsFromDrive = loadAppSettingsFromDrive;
window.queueAppSettingsPending = queueAppSettingsPending;
window.flushPendingAppSettings = flushPendingAppSettings;
window.hydrateAppSettingsWithDriveToken = hydrateAppSettingsWithDriveToken;

// Inicjalizacja przy starcie
document.addEventListener('DOMContentLoaded', () => {
  updateAdminSyncRow();
  refreshServerAppVersion();
  hydrateAppSettingsWithDriveToken();
});

// Auto-purge expired kosz items on startup
try { if (typeof purgExpiredKosz === 'function') purgExpiredKosz(); } catch(e) {}
