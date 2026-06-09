import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { message, isSignature } = await request.json();
    
    const defaultWebhook = process.env.NEXT_PUBLIC_GOOGLE_CHAT_WEBHOOK_URL;
    const signatureWebhook = process.env.NEXT_PUBLIC_GOOGLE_CHAT_SIGNATURE_WEBHOOK_URL;

    const webhookUrl = isSignature ? (signatureWebhook || defaultWebhook) : defaultWebhook;

    if (!webhookUrl) {
      return NextResponse.json({ error: 'Webhook URL not configured' }, { status: 500 });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({ text: message }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
