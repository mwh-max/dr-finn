const CACHE = 'finn-v1';
const CORE = [
  '/index.html',
  '/offline.html',
  '/style.css',
  '/app.js',
  '/favicon.svg',
  '/dr-finn.svg',
  '/who-qualifies.html',
  '/eligibility-check.html',
  '/eligibility.js',
  '/apply.html',
  '/checklist.html',
  '/after-you-apply.html',
  '/what-if-approved.html',
  '/what-if-denied.html',
  '/renewal.html',
  '/keep-coverage.html',
  '/lost-coverage.html',
  '/what-is-covered.html',
  '/who-accepts.html',
  '/who-drives.html',
  '/hoosier-healthwise.html',
  '/hip.html',
  '/emergency-care.html',
  '/dfr-offices.html',
  '/phone-numbers.html',
  '/glossary.html',
  '/faq.html',
  '/about.html',
  '/es/index.html',
  '/es/quien-califica.html',
  '/es/como-aplicar.html',
  '/es/despues-de-aplicar.html',
  '/es/si-me-aprueban.html',
  '/es/si-me-niegan.html',
  '/es/renovacion.html',
  '/es/preguntas-frecuentes.html',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => {
          if (e.request.headers.get('accept').includes('text/html')) {
            return caches.match('/offline.html');
          }
        });
    })
  );
});
