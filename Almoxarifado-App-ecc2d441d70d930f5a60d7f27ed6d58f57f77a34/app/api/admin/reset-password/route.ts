import { NextResponse } from 'next/server';
import { admin, adminDb, adminAuth } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { userId, email } = await request.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'Faltam dados do usuário.' }, { status: 400 });
    }

    // 1. Reset password in Firebase Auth
    await adminAuth.updateUser(userId, {
      password: 'Espin@123',
    });

    // 2. Set force_password_change flag in Firestore
    await adminDb.collection('profiles').doc(userId).update({
      force_password_change: true,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ message: 'Senha resetada com sucesso para Espin@123' });
  } catch (error: any) {
    console.error('Error resetting password:', error);
    return NextResponse.json({ error: error.message || 'Erro interno ao resetar senha.' }, { status: 500 });
  }
}
