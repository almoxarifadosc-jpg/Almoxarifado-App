export async function sendGoogleChatNotification(message: string, isSignature: boolean = false) {
  console.log('📡 Tentando enviar notificação para o Google Chat...');

  try {
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, isSignature }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na resposta do Google Chat:', errorText);
    } else {
      console.log('✅ Notificação enviada com sucesso!');
    }
  } catch (error) {
    console.error('❌ Erro ao enviar notificação para o Google Chat:', error);
  }
}
