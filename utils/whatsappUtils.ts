// utils/whatsappUtils.ts

export async function fetchWithTimeout(url: string, options: RequestInit, timeout = 8000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
  
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  }
  
  export async function handleFetchErrors(response: Response) {
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorBody = await response.text();
        errorMessage += ` - ${errorBody}`;
      } catch (e) {
        console.error('Error reading error response body:', e);
      }
      throw new Error(errorMessage);
    }
    return response;
  }
  
  function handleSendMessageError(error: unknown) {
    if (error instanceof TypeError) {
      console.error('Network error:', error);
    } else if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('Request timed out');
      } else {
        console.error('Error sending message:', error.message);
      }
    } else {
      console.error('Unknown error:', error);
    }
    // You might want to implement a retry mechanism here
  }
  
  export async function sendMessage(to: string, message: string) {
    const url = `https://graph.facebook.com/v20.0/${process.env.PHONE_NUMBER_ID}/messages`;
    const headers = {
      'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    };
  
    const data = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: { body: message },
    };
  
    try {
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data),
      });
  
      await handleFetchErrors(response);
  
      const responseData = await response.json();
      console.log('Message sent successfully:', responseData);
    } catch (error) {
      handleSendMessageError(error);
    }
  }
  
  export async function sendAudioMessage(to: string, audioId: string) {
    const url = `https://graph.facebook.com/v20.0/${process.env.PHONE_NUMBER_ID}/messages`;
    const headers = {
      'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    };
  
    const data = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'audio',
      audio: { id: audioId },
    };
  
    try {
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data),
      });
  
      await handleFetchErrors(response);
  
      const responseData = await response.json();
      console.log('Audio message sent successfully:', responseData);
    } catch (error) {
      handleSendMessageError(error);
    }
  }
  
  export async function sendDocumentMessage(to: string, documentId: string, filename: string) {
    const url = `https://graph.facebook.com/v20.0/${process.env.PHONE_NUMBER_ID}/messages`;
    const headers = {
      'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    };
  
    const data = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'document',
      document: { id: documentId, filename: filename },
    };
  
    try {
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data),
      });
  
      await handleFetchErrors(response);
  
      const responseData = await response.json();
      console.log('Document sent successfully:', responseData);
    } catch (error) {
      handleSendMessageError(error);
    }
  }
  
  export async function sendImageMessage(to: string, imageId: string) {
    const url = `https://graph.facebook.com/v20.0/${process.env.PHONE_NUMBER_ID}/messages`;
    const headers = {
      'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    };
  
    const data = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'image',
      image: { id: imageId },
    };
  
    try {
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data),
      });
  
      await handleFetchErrors(response);
  
      const responseData = await response.json();
      console.log('Image sent successfully:', responseData);
    } catch (error) {
      handleSendMessageError(error);
    }
  }

  interface TwoButtonMessage {
    bodyText: string;
    button1: {
      id: string;
      title: string;
    };
    button2: {
      id: string;
      title: string;
    };
  }
  
  export async function sendTwoButtonMessage(
    to: string,
    message: TwoButtonMessage
  ) {
    const url = `https://graph.facebook.com/v20.0/${process.env.PHONE_NUMBER_ID}/messages`;
    const headers = {
      'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    };
  
    const data = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: message.bodyText
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: message.button1.id,
                title: message.button1.title
              }
            },
            {
              type: 'reply',
              reply: {
                id: message.button2.id,
                title: message.button2.title
              }
            }
          ]
        }
      }
    };
  
    try {
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data),
      });
  
      await handleFetchErrors(response);
  
      const responseData = await response.json();
      console.log('Two-button message sent successfully:', responseData);
      return responseData;
    } catch (error) {
      console.error('Error sending two-button message:', error);
      throw error;
    }
  }
  