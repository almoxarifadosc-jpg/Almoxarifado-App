export async function sendGoogleChatNotification(message: string, isSignature: boolean = false) {
  try {
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, isSignature }),
    });

    if (!response.ok) {
      console.error('Erro ao enviar notificação');
    }
  } catch (error) {
    console.error('Erro de rede na notificação:', error);
  }
}
