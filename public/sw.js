// Orbit — minimal service worker.
//
// Deliberately does NOT cache API calls or app pages. Orbit's data changes
// constantly (tasks, mistakes, revisions) and is per-user via Supabase auth,
// so a stale-while-revalidate or cache-first strategy here would risk
// showing one user's cached data to another on a shared device, or just
// showing stale plans. This worker exists only so the app satisfies PWA
// installability criteria (Chrome/Android "Add to Home Screen", iOS Safari
// "Add to Home Screen") — everything still goes to the network.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// No fetch handler — all requests fall through to the network untouched.
