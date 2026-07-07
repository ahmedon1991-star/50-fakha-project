// Service Worker for 50-fakha PWA — Cache + Push Notifications
const CACHE_NAME = '50-fakha-cache-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/logo.png',
  '/manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});

// ─── Push Notification Handler ───────────────────────────────────────────────
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: '50 فاكهة', body: event.data ? event.data.text() : 'تحديث جديد' };
  }

  const options = {
    body: data.body || 'تحديث على طلبك',
    icon: '/logo192.png',
    badge: '/logo192.png',
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'order-update',
    renotify: true,
    data: {
      url: data.url || '/orders'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '🍹 50 فاكهة', options)
  );
});

// ─── Notification Click Handler ───────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/orders';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
