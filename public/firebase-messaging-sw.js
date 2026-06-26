// /public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Extrai credenciais reais do Firebase a partir dos query parameters da URL de registro do Service Worker
const urlParams = new URLSearchParams(self.location.search);
const firebaseConfig = {
  apiKey: urlParams.get('apiKey'),
  authDomain: urlParams.get('authDomain'),
  projectId: urlParams.get('projectId'),
  storageBucket: urlParams.get('storageBucket'),
  messagingSenderId: urlParams.get('messagingSenderId'),
  appId: urlParams.get('appId'),
  measurementId: urlParams.get('measurementId') || ""
};

// Verifica se os parâmetros obrigatórios estão presentes para inicializar
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
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
        url: payload.data?.url || '/'
      }
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
} else {
  console.warn('[firebase-messaging-sw.js] Credenciais do Firebase ausentes nos parâmetros da URL. SW ocioso.');
}

// Evento de clique na notificação para reabrir o app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

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