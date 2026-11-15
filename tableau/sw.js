// Permet d'ouvrir le tableau de bord sans connexion.
// La météo (api.open-meteo.com) n'est jamais mise en cache ici.
const CACHE = 'tableau-v3';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Réseau d'abord (pour recevoir les mises à jour), sinon la copie enregistrée.
  e.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    });
    try {
      if (!cached) return await net;
      return await Promise.race([net, new Promise((_, rej) => setTimeout(rej, 3000))]);
    } catch (err) {
      return cached || (await caches.match('./index.html')) || Response.error();
    }
  })());
});
