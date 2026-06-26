import { NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { title, body, senderUid } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'Título e corpo são obrigatórios' }, { status: 400 });
    }

    console.log('📡 Buscando tokens FCM no Firestore...');
    const snapshot = await adminDb.collection('fcm_tokens').get();
    
    if (snapshot.empty) {
      console.log('ℹ️ Nenhum token FCM registrado.');
      return NextResponse.json({ success: true, message: 'Nenhum token encontrado.' });
    }

    const tokens: string[] = [];
    const docIds: string[] = [];

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      // Não envia para o próprio remetente se senderUid for fornecido
      if (senderUid && data.uid === senderUid) {
        return;
      }
      tokens.push(doc.id);
      docIds.push(doc.id);
    });

    if (tokens.length === 0) {
      return NextResponse.json({ success: true, message: 'Nenhum token de outros dispositivos encontrado.' });
    }

    console.log(`🚀 Enviando notificação FCM para ${tokens.length} dispositivos...`);

    const message = {
      notification: {
        title,
        body,
      },
      android: {
        priority: 'high' as const,
      },
      webpush: {
        headers: {
          Urgency: 'high',
        },
        notification: {
          title,
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'new-transfer',
          renotify: true,
          requireInteraction: true,
          data: {
            url: '/'
          }
        }
      },
      tokens: tokens
    };

    const response = await adminMessaging.sendEachForMulticast(message);
    console.log(`✅ FCM enviado. Sucessos: ${response.successCount}, Falhas: ${response.failureCount}`);

    // Limpeza automática de tokens inválidos ou não registrados
    if (response.failureCount > 0) {
      const batch = adminDb.batch();
      let hasCleanup = false;

      response.responses.forEach((res, idx) => {
        if (!res.success && res.error) {
          const code = res.error.code;
          if (
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered'
          ) {
            const tokenToDelete = tokens[idx];
            console.log(`🗑️ Removendo token FCM inválido do banco: ${tokenToDelete.substring(0, 10)}...`);
            const docRef = adminDb.collection('fcm_tokens').doc(tokenToDelete);
            batch.delete(docRef);
            hasCleanup = true;
          }
        }
      });

      if (hasCleanup) {
        await batch.commit();
        console.log('🧹 Limpeza de tokens inválidos concluída.');
      }
    }

    return NextResponse.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount
    });

  } catch (error: any) {
    console.error('❌ Erro no envio de push FCM:', error);
    // Retornamos 200 com o erro para evitar que a interface do usuário quebre,
    // mas informando o status da operação.
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
