import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import firebaseConfig from '@/firebase-applet-config.json';

// Chave VAPID pública padrão para desenvolvimento se nenhuma variável de ambiente estiver configurada.
// Caso contrário, usa a variável de ambiente pública NEXT_PUBLIC_FIREBASE_VAPID_KEY
const DEFAULT_VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';

export async function registerAndGetFCMToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  // 1. Verificar suporte a notificações e service worker
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    console.warn('⚠️ Este navegador não suporta notificações por push FCM.');
    return null;
  }

  try {
    // 2. Pedir permissão explicitamente se necessário
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('❌ Permissão para receber notificações foi recusada pelo usuário.');
        return null;
      }
    }

    console.log('🔄 Registrando o Service Worker dinâmico do FCM...');
    // Registrar o service worker específico para o FCM
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    console.log('✅ Service Worker do FCM registrado com sucesso!');

    // 3. Inicializar Firebase App e obter o Messaging SDK do cliente
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const messaging = getMessaging(app);

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || DEFAULT_VAPID_KEY;
    if (!vapidKey) {
      console.warn(
        '⚠️ Variável de ambiente NEXT_PUBLIC_FIREBASE_VAPID_KEY não está configurada.\n' +
        'O token FCM não pôde ser obtido sem a Web Push VAPID Key.'
      );
      return null;
    }

    console.log('📡 Obtendo token de registro FCM...');
    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey: vapidKey
    });

    if (token) {
      console.log('✅ Token FCM gerado com sucesso:', token.substring(0, 15) + '...');
      
      // 4. Salvar o token no Firestore associado ao usuário atual
      const currentUser = auth.currentUser;
      if (currentUser) {
        await setDoc(doc(db, 'fcm_tokens', token), {
          token,
          uid: currentUser.uid,
          email: currentUser.email || '',
          updated_at: serverTimestamp()
        });
        console.log('💾 Token FCM salvo no banco de dados Firestore.');
      }
      return token;
    } else {
      console.warn('⚠️ Nenhum token FCM retornado.');
      return null;
    }
  } catch (error) {
    console.error('❌ Erro durante o registro ou obtenção do token FCM:', error);
    return null;
  }
}
