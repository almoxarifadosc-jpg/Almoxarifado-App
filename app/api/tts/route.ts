import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { text, voiceId } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Texto é obrigatório' }, { status: 400 });
    }

    const apiKey = process.env.ELEVEN_LABS_API_KEY;
    const finalVoiceId = voiceId || process.env.ELEVEN_LABS_VOICE_ID || 'pNInz6obpg8ndclQU7Nc';

    if (!apiKey) {
      console.error('ELEVEN_LABS_API_KEY não configurada');
      return NextResponse.json({ error: 'Configuração de Voz indisponível' }, { status: 500 });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${finalVoiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erro ElevenLabs:', errorData);
      throw new Error('Erro ao gerar áudio na ElevenLabs');
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error: any) {
    console.error('Erro na API TTS:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 });
  }
}
