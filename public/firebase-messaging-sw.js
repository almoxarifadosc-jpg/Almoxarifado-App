// /public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Substitua com as credenciais reais do seu projeto Firebase
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_AUTH_DOMAIN",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_STORAGE_BUCKET",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID",
  measurementId: "SEU_MEASUREMENT_ID"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Trata notificações recebidas em segundo plano (com o app fechado)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Notificação recebida em segundo plano: ', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'Novo Alerta';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'new-transfer',
    renotify: true,
    requireInteraction: true,
    data: {
      url: '/'
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Evento de clique na notificação para reabrir o app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});