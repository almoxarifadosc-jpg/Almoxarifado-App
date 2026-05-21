import * as admin from 'firebase-admin';
import firebaseConfig from '@/firebase-applet-config.json';

if (!admin.apps.length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccountKey) {
      // Se houver uma chave de conta de serviço no ambiente (em formato JSON string)
      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
      console.log('Firebase Admin: Inicializado com conta de serviço.');
    } else {
      // Tenta inicializar com ADC (Application Default Credentials) - Funciona no Cloud Run se configurado
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'gen-lang-client-0412067480',
      });
      console.log('Firebase Admin: Inicializado com credenciais padrão (ADC).');
    }
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin:', error);
  }
}

const dbId = firebaseConfig.firestoreDatabaseId;
const adminDb = dbId && dbId !== '(default)' ? admin.firestore(dbId) : admin.firestore();
const adminAuth = admin.auth();

export { admin, adminDb, adminAuth };
