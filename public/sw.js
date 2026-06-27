importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAXdU4i0oXCBpwtUQXF4vpJyp0n_bhFLuw",
  authDomain: "gen-lang-client-0412067480.firebaseapp.com",
  projectId: "gen-lang-client-0412067480",
  storageBucket: "gen-lang-client-0412067480.firebasestorage.app",
  messagingSenderId: "587255945999",
  appId: "1:587255945999:web:607fed54beaa44eb187c7a"
};

// Inicializa o Firebase no Service Worker
if (firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}
const messaging = firebase.messaging();

// Trata notificações recebidas em segundo plano (com o app fechado) via FCM
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Notificação FCM recebida em segundo plano: ', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'Novo Alerta';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: '/app-logo.png',
    badge: '/favicon.ico',
    tag: payload.data?.tag || 'new-transfer',
    renotify: true,
    requireInteraction: true,
    data: {
      url: payload.data?.url || '/'
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

const CACHE_NAME = 'almoxarifado-cache-v14';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/app-logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/maskable-icon.png',
  '/screenshot-mobile.png',
  '/screenshot-desktop.png'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching initial assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Stale-While-Revalidate Strategy
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip caching for supabase and external APIs to avoid stale data issues with auth
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Only cache valid responses from our origin
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Optional: Return a fallback for offline
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// Push Notifications
self.addEventListener('push', function(event) {
  // Se for mensagem do FCM, o SDK do Firebase (onBackgroundMessage) cuida dela.
  let isFCM = false;
  try {
    const rawData = event.data ? event.data.json() : null;
    if (rawData && (rawData.from || rawData.gcm || rawData.multicast_id || rawData.notification || (rawData.data && rawData.data.gcm))) {
      isFCM = true;
    }
  } catch (e) {
    // Se falhar no parse, pode não ser um JSON (logo, não é do FCM)
  }

  if (isFCM) {
    console.log('[sw.js] Ignorando evento push genérico porque pertence ao FCM SDK.');
    return;
  }

  let data = {};
  try {
    data = event.data ? event.data.json() : { title: 'Nova Notificação', body: 'Você tem uma nova atualização.' };
  } catch (e) {
    data = { title: 'Nova Notificação', body: event.data ? event.data.text() : 'Você tem uma nova atualização.' };
  }

  const options = {
    body: data.body,
    icon: '/app-logo.png',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Almoxarifado App', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow(event.notification.data.url);
    })
  );
});

// Evento Sync de Segundo Plano (Background Sync)
self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-transfers' || event.tag === 'ventisol-bg-sync') {
    console.log('Sincronização em segundo plano disparada (silenciosa):', event.tag);
  }
});

// Evento Periodic Sync (Sincronização Periódica de Segundo Plano)
self.addEventListener('periodicsync', function(event) {
  if (event.tag === 'get-latest-transfers' || event.tag === 'ventisol-periodic-sync') {
    console.log('Sincronização periódica em segundo plano disparada (silenciosa):', event.tag);
  }
});
