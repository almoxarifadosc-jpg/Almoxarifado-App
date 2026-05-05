export async function sendGoogleChatNotification(message: string) {
  console.log('📡 Tentando enviar notificação para o Google Chat...');

  try {
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
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
