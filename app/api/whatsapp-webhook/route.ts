// app/api/webhook/route.ts

import { NextResponse } from 'next/server';
import { sendMessage, sendImageMessage, sendDocumentMessage } from '@/utils/whatsappUtils';
import { downloadAndPrepareMedia, uploadMedia } from '@/utils/whatsappMediaUtils';

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
      case 'image':
      case 'document':
        response = await handleMediaMessage(message, sender, phoneNumberId);
        break;
      case 'interactive':
        response = await handleInteractiveMessage(message, sender);
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
  return `You said: ${message.text?.body}`;
}

async function handleMediaMessage(message: WhatsAppMessage, sender: string, phoneNumberId: string): Promise<string> {
  console.log(`Received ${message.type} message:`, message[message.type as 'image' | 'document']?.id);
  try {
    const { buffer, filename, mimeType } = await downloadAndPrepareMedia(message[message.type as 'image' | 'document']?.id as string, message.type === 'document' ? message.document?.filename : undefined);
    
    // Create a File object from the buffer
    const file = new File([buffer], filename, { type: mimeType });

    // Create FormData and append the file
    const formData = new FormData();
    formData.append('file', file);

    // Call the upload-and-convert API
    const response = await fetch('/api/upload-and-convert', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload and convert failed with status ${response.status}`);
    }

    const result = await response.json();

    // Truncate the base64 data
    let truncatedResult;
    if (Array.isArray(result.base64_images)) {
      truncatedResult = result.base64_images.map((img: string) => img.substring(0, 50) + '...');
    } else {
      truncatedResult = (result.base64_images as string).substring(0, 50) + '...';
    }

    // Send the original file back to the user
    if (message.type === 'image') {
      await sendImageMessage(sender, await uploadMedia(phoneNumberId, buffer, filename, mimeType));
    } else {
      await sendDocumentMessage(sender, await uploadMedia(phoneNumberId, buffer, filename, mimeType), filename);
    }

    // Prepare the response with public URL and MIME type
    const responseMessage = `${message.type.charAt(0).toUpperCase() + message.type.slice(1)} received and processed. 
Filename: ${filename}
Public URL: ${result.url}
MIME Type: ${result.mimeType}
Truncated result: ${JSON.stringify(truncatedResult)}`;

    return responseMessage;
  } catch (error) {
    console.error(`Error handling ${message.type} message:`, error);
    return `Sorry, there was an error processing your ${message.type}.`;
  }
}

async function handleInteractiveMessage(message: WhatsAppMessage, sender: string): Promise<string> {
  if (message.interactive?.type === 'button_reply') {
    console.log('Received button reply:', message.interactive.button_reply);
    return `You clicked: ${message.interactive.button_reply.title}`;
  }
  return 'Unsupported interactive message type';
}