// Service Worker for 50-fakha PWA — Cache + Push Notifications + Admin Alerts
const CACHE_NAME = '50-fakha-cache-v4';
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

// ─── Message from page → SW ───────────────────────────────────────────────────
// The admin page sends messages here when the tab may be sleeping/hidden.
// The SW runs in a separate thread and can show OS notifications regardless.
self.addEventListener('message', event => {
  if (!event.data) return;

  // Admin: new order arrived
  if (event.data.type === 'SHOW_ADMIN_NOTIFICATION') {
    const { title, body, orderNumber, url } = event.data;
    event.waitUntil(
      self.registration.showNotification(title || '🚨 طلب جديد!', {
        body: body || ('طلب جديد #' + orderNumber + ' بانتظار قبولك'),
        icon: '/logo192.png',
        badge: '/logo192.png',
        dir: 'rtl',
        lang: 'ar',
        vibrate: [300, 100, 300, 100, 600],
        tag: 'admin-order-' + orderNumber,
        renotify: true,
        requireInteraction: true,
        data: { url: url || '/admin' }
      })
    );
  }

  // Client: order status changed
  if (event.data.type === 'SHOW_ORDER_STATUS_NOTIFICATION') {
    const { title, body, orderNumber, url } = event.data;
    event.waitUntil(
      self.registration.showNotification(title || 'تحديث طلبك', {
        body: body || ('تحديث جديد على طلبك #' + orderNumber),
        icon: '/logo192.png',
        badge: '/logo192.png',
        dir: 'rtl',
        lang: 'ar',
        vibrate: [200, 100, 200],
        tag: 'order-status-' + orderNumber,
        renotify: true,
        data: { url: url || '/orders' }
      })
    );
  }
});

// ─── Push Notification Handler (server-sent push) ─────────────────────────────
self.addEventListener('push', event => {
  var data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: '50 فاكهة', body: event.data ? event.data.text() : 'تحديث جديد' };
  }

  var options = {
    body: data.body || 'تحديث على طلبك',
    icon: '/logo192.png',
    badge: '/logo192.png',
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'order-update',
    renotify: true,
    data: { url: data.url || '/orders' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '50 فاكهة', options)
  );
});

// ─── Notification Click Handler ───────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  var targetUrl = (event.notification.data && event.notification.data.url) || '/admin';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (client.navigate) client.navigate(targetUrl);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
