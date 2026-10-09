/* Civizen web push service worker (Phase 7 step 7.2). Shows the payload sent by push-dispatch and opens its page. */
self.addEventListener('push', function (event) {
  var data = { title: 'Civizen', body: '', url: '/notifications', tag: 'civizen' };
  try {
    if (event.data) data = Object.assign(data, event.data.json());
  } catch (e) {
    /* plain text payload */
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Civizen', {
      body: data.body || '',
      tag: data.tag || 'civizen',
      renotify: true,
      icon: '/favicon.png',
      data: { url: data.url || '/notifications' },
    }),
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/notifications';
  var target = new URL(url, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
      for (var i = 0; i < clients.length; i += 1) {
        var client = clients[i];
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
