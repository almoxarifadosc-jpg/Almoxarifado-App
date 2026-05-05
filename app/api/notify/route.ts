import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const webhookUrl = process.env.NEXT_PUBLIC_GOOGLE_CHAT_WEBHOOK_URL;

  if (!webhookUrl) {
    return NextResponse.json({ error: 'Webhook URL not configured' }, { status: 500 });
  }

  try {
    const { message } = await request.json();

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
