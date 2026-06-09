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
const rawAdminDb = dbId && dbId !== '(default)' ? getFirestore(app, dbId) : getFirestore(app);
const rawAdminAuth = getAuth(app);

// Proxy para capturar chamadas de administração se FIREBASE_SERVICE_ACCOUNT_KEY estiver ausente
// Isto previne o erro "Could not load the default credentials" gerando instruções guiadas e claras em português de como resolver.
function createCheckedProxy<T extends object>(target: T, name: string): T {
  return new Proxy(target, {
    get(target, prop, receiver) {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (!serviceAccountKey) {
        throw new Error(
          `Erro de Configuração: A chave de administração 'FIREBASE_SERVICE_ACCOUNT_KEY' não está configurada no ambiente.\n\n` +
          `Para resolver este erro e ativar as funções de administração de e-mails/usuários (sincronizar, deletar, resetar senhas):\n\n` +
          `1. Acesse o Console do Firebase (https://console.firebase.google.com/)\n` +
          `2. Selecione o seu projeto e vá em 'Configurações do Projeto' (ícone de engrenagem) > Guia 'Contas de Serviço' (Service Accounts)\n` +
          `3. Clique no botão 'Gerar nova chave privada' (Generate new private key) e confirme o download do arquivo JSON.\n` +
          `4. Abra esse arquivo JSON baixado em seu computador e copie TODO o seu conteúdo (com chaves { }).\n` +
          `5. Aqui no painel do Google AI Studio, clique nas Configurações (ícone de engrenagem no topo direito) > Guia 'Environment Variables'.\n` +
          `6. Adicione uma variável de ambiente chamada 'FIREBASE_SERVICE_ACCOUNT_KEY' e cole todo o conteúdo do JSON copiado no valor.\n` +
          `7. Salve as alterações para recarregar o servidor.`
        );
      }
      const val = Reflect.get(target, prop, receiver);
      if (typeof val === 'function') {
        return val.bind(target);
      }
      return val;
    }
  });
}

const adminDb = createCheckedProxy(rawAdminDb, 'adminDb');
const adminAuth = createCheckedProxy(rawAdminAuth, 'adminAuth');

// Objeto de compatibilidade legado para referências como 'admin.firestore.FieldValue'
const adminLegacy = {
  firestore: {
    FieldValue: FieldValue
  }
};

export { adminLegacy as admin, adminDb, adminAuth };
