// Muse Shopping - Service Worker
//
// 1. Offline page: pages load from the network; only when the network is down
//    does the cached /offline page show. Nothing else is cached, so a deploy is
//    never hidden behind a stale copy and API calls always go to the server.
// 2. Push alerts (web push, iOS 16.4+ when Muse is saved to the home screen):
//    show the alert, open the item on tap, and report opened / dismissed /
//    "fewer like this" back to Muse with the alert's signed ids.

const CACHE_NAME = 'muse-v2';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return; // let the browser handle everything else
  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error()))
  );
});

// ---- Push alerts ----

function report(data, eventName) {
  if (!data || !Array.isArray(data.ids) || !data.t) return Promise.resolve();
  return fetch('/api/v1/notifications/alerts/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: data.ids, t: data.t, event: eventName }),
    keepalive: true,
  }).catch(() => {});
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Muse', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Muse';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || undefined,
    data: { url: data.url || '/home', ids: data.ids || [], t: data.t || null },
    // Android/desktop show these; iPhone ignores them, so "fewer like this"
    // also lives on each alert in Profile > Notifications > Alert history.
    actions: Array.isArray(data.ids) && data.ids.length === 1 ? [{ action: 'fewer', title: 'Fewer like this' }] : [],
  };
  if (data.image) options.image = data.image;
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {};
  event.notification.close();

  if (event.action === 'fewer') {
    event.waitUntil(report(data, 'fewer'));
    return;
  }

  const target = new URL(data.url || '/home', self.location.origin).href;
  event.waitUntil(Promise.all([
    report(data, 'opened'),
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const sameOrigin = target.startsWith(self.location.origin);
      for (const w of wins) {
        if (sameOrigin && 'navigate' in w && w.url.startsWith(self.location.origin)) {
          return w.focus().then(() => w.navigate(target)).catch(() => self.clients.openWindow(target));
        }
      }
      return self.clients.openWindow(target);
    }),
  ]));
});

self.addEventListener('notificationclose', (event) => {
  event.waitUntil(report(event.notification.data, 'dismissed'));
});
