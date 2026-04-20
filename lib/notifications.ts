export async function sendGoogleChatNotification(message: string) {
  const webhookUrl = process.env.NEXT_PUBLIC_GOOGLE_CHAT_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.error('❌ ERRO: Google Chat Webhook URL não encontrado em process.env.NEXT_PUBLIC_GOOGLE_CHAT_WEBHOOK_URL');
    return;
  }

  console.log('📡 Tentando enviar notificação para o Google Chat...');

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({ text: message }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Falha no Google Chat (Status: ${response.status}):`, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log('✅ Notificação enviada com sucesso para o Google Chat!');
  } catch (error) {
    console.error('❌ Erro na requisição de notificação:', error);
  }
}
