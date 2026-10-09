// Orbit — Academic Operating System Service Worker

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle push notifications sent from server (e.g. Supabase Edge Function / Web Push)
self.addEventListener('push', (event) => {
  let data = {
    title: 'Orbit · Check-in 🪐',
    body: 'Stay in Orbit. Check your study schedule for today.',
    url: '/planner',
    tag: 'orbit-push',
  };

  try {
    if (event.data) {
      data = Object.assign(data, event.data.json());
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon.svg',
    badge: '/favicon.svg',
    tag: data.tag || 'orbit-notification',
    sound: '/sounds/orbit-chime.wav',
    data: {
      url: data.url || '/planner',
    },
    actions: [
      { action: 'open', title: 'Open Orbit' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle clicking on the notification banner
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/planner';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // If no tab is open, launch a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
