import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { email, action } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 });
    }

    let user;
    try {
      user = await adminAuth.getUserByEmail(email);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        return NextResponse.json({ error: 'Usuário não encontrado no sistema de autenticação.' }, { status: 404 });
      }
      throw err;
    }

    if (action === 'DELETE') {
      await adminAuth.deleteUser(user.uid);
      try {
        await adminDb.collection('profiles').doc(user.uid).delete();
      } catch (e) {}
      return NextResponse.json({ message: `Usuário ${email} removido completamente do sistema.` });
    }

    if (action === 'SYNC') {
      await adminDb.collection('profiles').doc(user.uid).set({
        id: user.uid,
        email: user.email,
        name: user.displayName || user.email?.split('@')[0] || 'Usuário Recuperado',
        status: 'PENDING',
        is_admin: false,
        created_at: new Date().toISOString()
      }, { merge: true });

      return NextResponse.json({ message: `Perfil do usuário ${email} sincronizado no banco de dados.` });
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
