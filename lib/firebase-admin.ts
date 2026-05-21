import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '@/firebase-applet-config.json';

let app;

if (!getApps().length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccountKey) {
      // Se houver uma chave de conta de serviço no ambiente (em formato JSON string)
      const serviceAccount = JSON.parse(serviceAccountKey);
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
      console.log('Firebase Admin: Inicializado com conta de serviço.');
    } else {
      // Tenta inicializar com ADC (Application Default Credentials) - Funciona no Cloud Run se configurado
      app = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'gen-lang-client-0412067480',
      });
      console.log('Firebase Admin: Inicializado com credenciais padrão (ADC).');
    }
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin:', error);
  }
} else {
  app = getApps()[0];
}

const dbId = firebaseConfig.firestoreDatabaseId;
const adminDb = dbId && dbId !== '(default)' ? getFirestore(app, dbId) : getFirestore(app);
const adminAuth = getAuth(app);

// Objeto de compatibilidade legado para referências como 'admin.firestore.FieldValue'
const adminLegacy = {
  firestore: {
    FieldValue: FieldValue
  }
};

export { adminLegacy as admin, adminDb, adminAuth };
