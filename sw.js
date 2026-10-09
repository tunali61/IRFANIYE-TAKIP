// sw.js - Ömer Avniyel Akademi PWA Service Worker (v10.6 - Kur'an Takip Kesintisiz Sayfa Girişi & Silme Koruması)
const CACHE_NAME = 'oay-takip-cache-v10.6';

// Statik temel dosyalar (HTML ve JS dosyaları KESİNLİKLE buraya eklenmez, daima taze çekilir!)
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon.svg',
  '/css/custom.css'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Önbellek yükleme:', err);
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'FORCE_PURGE') {
    caches.keys().then((keys) => {
      keys.forEach((k) => caches.delete(k));
    });
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First stratejisi (Canlı veri öncelikli, HTML ve JS asla bayat önbellekten açılmaz)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // Firebase Realtime, Formsubmit, CDN servislerini SW karışmasın
  if (
    url.includes('firebasedatabase.app') ||
    url.includes('formsubmit.co') ||
    url.includes('cdn.tailwindcss.com') ||
    url.includes('cdnjs.cloudflare.com')
  ) {
    return;
  }

  // HTML navigasyonları ve JS dosyaları için DAİMA doğrudan ağa git
  if (event.request.mode === 'navigate' || url.endsWith('.html') || url.includes('/js/')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((networkResponse) => {
          return networkResponse;
        })
        .catch(() => {
          // Yalnızca internet tamamen kesilmişse önbelleğe bak
          return caches.match(event.request);
        })
    );
    return;
  }

  // Diğer statik varlıklar (resimler, css vb.)
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
