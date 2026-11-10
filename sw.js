// איזון · שומר את קבצי האפליקציה בטלפון, כדי שתיפתח מיד וגם בלי קליטה.
// הנתונים עצמם נשמרים במכשיר ולא עוברים דרך כאן.
const CACHE = 'izun-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'css/app.css', 'fonts/heebo-vf-hebrew.woff2', 'fonts/heebo-vf-latin.woff2', 'icons/icon.svg', 'icons/icon-192.png',
  'js/core.js', 'js/data-food.js', 'js/data-fit.js', 'js/plan.js', 'js/app.js', 'js/v-setup.js', 'js/v-today.js', 'js/v-food.js', 'js/v-move.js', 'js/v-sleep.js', 'js/v-tasks.js', 'js/v-week.js', 'js/v-settings.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // קודם הרשת, כדי שעדכון יגיע מיד. בלי קליטה: מהעותק השמור.
  e.respondWith(fetch(e.request).then(res => {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
