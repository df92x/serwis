'use strict';

(function () {
  try { localStorage.removeItem('gh_token'); } catch (_) {}

  var icon = '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">' +
    '<rect width="512" height="512" rx="80" fill="#0a0a0f"/>' +
    '<svg x="56" y="56" width="400" height="400" viewBox="0 0 24 24">' +
    '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" fill="#3b7cf4"/>' +
    '</svg></svg>';
  var iconUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(icon)));
  var manifest = {
    name: 'Serwis ROW-POL',
    short_name: 'ROW-POL',
    start_url: '.',
    display: 'standalone',
    background_color: '#0a0a0f',
    theme_color: '#0a0a0f',
    icons: [{ src: iconUrl, sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' }]
  };
  var ml = document.getElementById('pwa-manifest');
  if (ml) ml.href = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }));

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js?v=serwis-v14').catch(function () {});
  }
})();
