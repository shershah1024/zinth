// app/api/whatsapp-webhook/route.ts

import { NextResponse } from 'next/server';
import { sendMessage, sendAudioMessage, sendDocumentMessage, sendImageMessage } from '@/utils/whatsappUtils';
import { downloadAndSendMedia, uploadMedia } from '@/utils/whatsappMediaUtils';

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
    const phoneNumberId = data.entry[0].changes[0].value.metadata.phone_number_id;

    let response: string;

    switch (message.type) {
      case 'text':
        response = await handleTextMessage(message, sender);
        break;
      case 'audio':
        response = await handleAudioMessage(message, sender, phoneNumberId);
        break;
      case 'document':
        response = await handleDocumentMessage(message, sender, phoneNumberId);
        break;
      case 'image':
        response = await handleImageMessage(message, sender, phoneNumberId);
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

async function handleTextMessage(message: WhatsAppMessage, sender: string): Promise<string> {
  console.log('Received text message:', message.text?.body);
  // Echo the text message back to the user
  return `You said: ${message.text?.body}`;
}

async function handleAudioMessage(message: WhatsAppMessage, sender: string, phoneNumberId: string): Promise<string> {
  console.log('Received audio message:', message.audio?.id);
  try {
    const { buffer, filename } = await downloadAndSendMedia(message.audio?.id as string, message.audio?.mime_type as string);
    const mediaId = await uploadMedia(phoneNumberId, buffer, filename, message.audio?.mime_type as string);
    await sendAudioMessage(sender, mediaId);
    return `Audio received and sent back. Filename: ${filename}`;
  } catch (error) {
    console.error('Error handling audio message:', error);
    return 'Sorry, there was an error processing your audio message.';
  }
}

async function handleDocumentMessage(message: WhatsAppMessage, sender: string, phoneNumberId: string): Promise<string> {
  console.log('Received document:', message.document?.filename);
  try {
    const { buffer, filename } = await downloadAndSendMedia(message.document?.id as string, message.document?.mime_type as string);
    const mediaId = await uploadMedia(phoneNumberId, buffer, filename, message.document?.mime_type as string);
    await sendDocumentMessage(sender, mediaId, filename);
    return `Document received and sent back. Filename: ${filename}`;
  } catch (error) {
    console.error('Error handling document message:', error);
    return 'Sorry, there was an error processing your document.';
  }
}

async function handleImageMessage(message: WhatsAppMessage, sender: string, phoneNumberId: string): Promise<string> {
  console.log('Received image:', message.image?.id);
  try {
    const { buffer, filename } = await downloadAndSendMedia(message.image?.id as string, message.image?.mime_type as string);
    const mediaId = await uploadMedia(phoneNumberId, buffer, filename, message.image?.mime_type as string);
    await sendImageMessage(sender, mediaId);
    return `Image received and sent back. Filename: ${filename}`;
  } catch (error) {
    console.error('Error handling image message:', error);
    return 'Sorry, there was an error processing your image.';
  }
}