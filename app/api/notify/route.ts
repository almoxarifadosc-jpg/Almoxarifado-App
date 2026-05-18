import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, isSignature } = await req.json();
    const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error('GOOGLE_CHAT_WEBHOOK_URL não configurada');
      return NextResponse.json({ error: 'Configuração de Notificação indisponível' }, { status: 500 });
    }

    const payload = {
      text: isSignature ? `📝 *Nova Assinatura Coletada*\n${message}` : message,
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Falha ao enviar para o Google Chat');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro na API de Notificação:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
