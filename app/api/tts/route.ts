import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    const apiKey = process.env.ELEVEN_LABS_API_KEY;
    const voiceId = process.env.ELEVEN_LABS_VOICE_ID || 'pNInz6obpg8nEByWQX7d'; // Voz padrão (Fernanda ou similar)

    if (!apiKey) {
      console.error('TTS: ELEVEN_LABS_API_KEY não configurada no ambiente.');
      return NextResponse.json({ error: 'Configuração do ElevenLabs ausente.' }, { status: 500 });
    }

    console.log(`TTS: Gerando áudio para: "${text.substring(0, 30)}..." usando voz: ${voiceId}`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TTS: Erro na resposta da ElevenLabs:', response.status, errorText);
      return NextResponse.json({ error: `Erro ElevenLabs (${response.status})` }, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error: any) {
    console.error('TTS Error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
