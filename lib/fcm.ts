import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import firebaseConfig from '@/firebase-applet-config.json';

// Chave VAPID pública padrão para desenvolvimento se nenhuma variável de ambiente estiver configurada.
// Caso contrário, usa a variável de ambiente pública NEXT_PUBLIC_FIREBASE_VAPID_KEY
const DEFAULT_VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || 'BAX8VLVefy9iiCfdLOvYqSB2aoACR-rS6Wfdchb9ntyO9nKkTX47O9Le3426_mNycZIjfQ1OwSEFUgoFfjQMXG0';

export async function registerAndGetFCMToken(userId?: string, userEmail?: string): Promise<string | null> {
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

    console.log('🔄 Obtendo o registro do Service Worker principal (/sw.js)...');
    let registration = await navigator.serviceWorker.getRegistration('/');
    
    if (!registration) {
      console.log('🔄 Nenhum Service Worker encontrado no escopo /. Registrando /sw.js...');
      registration = await navigator.serviceWorker.register('/sw.js');
    } else {
      console.log('✅ Service Worker principal (/sw.js) já está ativo e registrado!');
    }

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
      const finalUid = userId || auth.currentUser?.uid;
      const finalEmail = userEmail || auth.currentUser?.email || '';

      if (finalUid) {
        try {
          await setDoc(doc(db, 'fcm_tokens', token), {
            token,
            uid: finalUid,
            email: finalEmail,
            updated_at: serverTimestamp()
          });
          console.log('💾 Token FCM salvo no banco de dados Firestore.');
        } catch (dbErr: any) {
          const isPermissionErr = dbErr?.message?.includes('permission') || dbErr?.code === 'permission-denied';
          if (isPermissionErr) {
            console.warn('⚠️ Erro de permissão inicial ao salvar o token. Tentando novamente em 1.5s...');
            await new Promise((resolve) => setTimeout(resolve, 1500));
            await setDoc(doc(db, 'fcm_tokens', token), {
              token,
              uid: finalUid,
              email: finalEmail,
              updated_at: serverTimestamp()
            });
            console.log('💾 Token FCM salvo no banco de dados Firestore após segunda tentativa.');
          } else {
            throw dbErr;
          }
        }
      } else {
        console.warn('⚠️ Token FCM gerado, mas nenhum usuário ativo encontrado para persistir o token no Firestore.');
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
