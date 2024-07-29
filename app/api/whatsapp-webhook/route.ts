// app/api/webhook/route.ts

import { NextResponse } from 'next/server';

// Types
interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'audio' | 'document' | 'image' | 'interactive';
  text?: { body: string };
  audio?: { id: string; mime_type: string };
  document?: { id: string; mime_type: string; filename: string };
  image?: { id: string; mime_type: string };
  interactive?: {
    type: 'button_reply';
    button_reply: { id: string; title: string };
  };
}

interface WhatsAppWebhookData {
  object: string;
  entry: [{
    id: string;
    changes: [{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts: [{ profile: { name: string }; wa_id: string }];
        messages: WhatsAppMessage[];
      };
    }];
  }];
}

// Webhook verification (for GET requests)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified');
    return new Response(challenge, { status: 200 });
  } else {
    console.log('Webhook verification failed');
    return new Response('Verification failed', { status: 403 });
  }
}

// Webhook handler (for POST requests)
export async function POST(req: Request) {
  try {
    const data: WhatsAppWebhookData = await req.json();
    console.log('Received webhook data:', JSON.stringify(data, null, 2));

    const message = data.entry[0].changes[0].value.messages[0];
    const sender = data.entry[0].changes[0].value.contacts[0].wa_id;

    let response: string;

    switch (message.type) {
      case 'text':
        response = await handleTextMessage(message);
        break;
      case 'audio':
        response = await handleAudioMessage(message);
        break;
      case 'document':
        response = await handleDocumentMessage(message);
        break;
      case 'image':
        response = await handleImageMessage(message);
        break;
      case 'interactive':
        response = await handleInteractiveMessage(message);
        break;
      default:
        response = "Unsupported message type";
    }

    // Send response back to the user
    await sendMessage(sender, response);

    return NextResponse.json({ status: "OK" });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Error processing webhook' }, { status: 400 });
  }
}

// Message handlers
async function handleTextMessage(message: WhatsAppMessage): Promise<string> {
  console.log('Received text message:', message.text?.body);
  return `You said: ${message.text?.body}`;
}

async function handleAudioMessage(message: WhatsAppMessage): Promise<string> {
  console.log('Received audio message:', message.audio?.id);
  const audioUrl = await getMediaUrl(message.audio?.id as string);
  return `Received audio: ${audioUrl}`;
}

async function handleDocumentMessage(message: WhatsAppMessage): Promise<string> {
  console.log('Received document:', message.document?.filename);
  const documentUrl = await getMediaUrl(message.document?.id as string);
  return `Received document: ${message.document?.filename}, URL: ${documentUrl}`;
}

async function handleImageMessage(message: WhatsAppMessage): Promise<string> {
  console.log('Received image:', message.image?.id);
  const imageUrl = await getMediaUrl(message.image?.id as string);
  return `Received image: ${imageUrl}`;
}

async function handleInteractiveMessage(message: WhatsAppMessage): Promise<string> {
  if (message.interactive?.type === 'button_reply') {
    console.log('Received button reply:', message.interactive.button_reply);
    return `You clicked: ${message.interactive.button_reply.title}`;
  }
  return 'Unsupported interactive message type';
}

// Utility functions
async function getMediaUrl(mediaId: string): Promise<string> {
  // Implement this function to get the URL of media from WhatsApp
  // You'll need to make an API call to WhatsApp's servers
  return `https://example.com/media/${mediaId}`;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout = 8000): Promise<Response> {
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

async function handleFetchErrors(response: Response) {
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

async function sendMessage(to: string, message: string) {
  const url = `https://graph.facebook.com/v12.0/${process.env.PHONE_NUMBER_ID}/messages`;
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

async function sendAudioMessage(to: string, audioUrl: string) {
  const url = `https://graph.facebook.com/v12.0/${process.env.PHONE_NUMBER_ID}/messages`;
  const headers = {
    'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json',
  };

  const data = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'audio',
    audio: { link: audioUrl },
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

async function sendDocumentMessage(to: string, documentUrl: string, filename: string) {
  const url = `https://graph.facebook.com/v12.0/${process.env.PHONE_NUMBER_ID}/messages`;
  const headers = {
    'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json',
  };

  const data = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'document',
    document: { link: documentUrl, filename: filename },
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

async function sendInteractiveMessage(to: string, bodyText: string, buttons: { id: string; title: string }[]) {
  const url = `https://graph.facebook.com/v12.0/${process.env.PHONE_NUMBER_ID}/messages`;
  const headers = {
    'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json',
  };

  const data = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.map(button => ({
          type: 'reply',
          reply: { id: button.id, title: button.title }
        }))
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
    console.log('Interactive message sent successfully:', responseData);
  } catch (error) {
    handleSendMessageError(error);
  }
}