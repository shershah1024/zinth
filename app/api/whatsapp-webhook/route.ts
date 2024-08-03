// app/api/webhook/route.ts

import { NextResponse } from 'next/server';
import { sendMessage } from '@/utils/whatsappUtils';
import { downloadAndPrepareMedia } from '@/utils/whatsappMediaUtils';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const UPLOAD_FILE_ENDPOINT = `${BASE_URL}/api/upload-file-supabase`;


// Types
interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'audio' | 'document' | 'image' | 'interactive';
  text?: { body: string };
  audio?: { id: string; mime_type: string };
  document?: {
    filename: string;
    mime_type: string;
    sha256: string;
    id: string;
  };
  image?: {
    id: string;
    mime_type: string;
  };
  interactive?: {
    type: 'button_reply';
    button_reply: { id: string; title: string };
  };
}

interface WhatsAppWebhookData {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{ profile: { name: string }; wa_id: string }>;
        messages?: WhatsAppMessage[];
      };
      field: string;
    }>;
  }>;
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

    const entry = data.entry[0];
    if (!entry) {
      console.log('No entry in webhook data');
      return NextResponse.json({ status: "Ignored" });
    }

    const change = entry.changes[0];
    if (!change) {
      console.log('No change in webhook data');
      return NextResponse.json({ status: "Ignored" });
    }

    const value = change.value;

    // Check if the contacts field is present
    if (!value.contacts || value.contacts.length === 0) {
      console.log('Ignoring webhook data without contacts field');
      return NextResponse.json({ status: "Ignored" });
    }

    // Check if the messages field is present
    if (!value.messages || value.messages.length === 0) {
      console.log('Ignoring webhook data without messages');
      return NextResponse.json({ status: "Ignored" });
    }

    const message = value.messages[0];
    const sender = value.contacts[0].wa_id;

    let response: string;

    switch (message.type) {
      case 'text':
        response = await handleTextMessage(message, sender);
        break;
      case 'image':
      case 'document':
        response = await handleMediaMessage(message, sender);
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
  if (message.text?.body) {
    console.log('Received text message:', message.text.body);
    return `You said: ${message.text.body}`;
  }
  return "Received an empty text message";
}



async function handleMediaMessage(message: WhatsAppMessage, sender: string): Promise<string> {
  console.log(`Received ${message.type} message from ${sender}:`, message[message.type as 'image' | 'document']?.id);
  let tempFilePath: string | undefined;

  try {
    const mediaInfo = message[message.type as 'image' | 'document'];
    if (!mediaInfo) {
      throw new Error(`Invalid ${message.type} message structure`);
    }

    let filename: string | undefined;
    if (message.type === 'document' && message.document) {
      filename = message.document.filename;
    } else if (message.type === 'image' && message.image) {
      const fileExtension = message.image.mime_type.split('/')[1];
      filename = `image_${Date.now()}.${fileExtension}`;
    } else {
      throw new Error(`Unsupported media type: ${message.type}`);
    }

    const { filePath, filename: preparedFilename, mimeType } = await downloadAndPrepareMedia(mediaInfo.id, filename);
    tempFilePath = filePath;

    // Create FormData and append the file
    const formData = new FormData();
    const fileBuffer = await fs.readFile(tempFilePath);
    formData.append('file', new Blob([fileBuffer]), preparedFilename);

    // Get the base URL from environment variables
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
      throw new Error('NEXT_PUBLIC_API_URL is not set in environment variables');
    }

    // Call the upload-and-convert API with the full URL
    const response = await fetch(`${baseUrl}/api/upload-and-convert`, {
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

    // Prepare the response with public URL and MIME type
    const responseMessage = `${message.type.charAt(0).toUpperCase() + message.type.slice(1)} received from ${sender} and processed.
Filename: ${preparedFilename}
Public URL: ${result.url}
MIME Type: ${mimeType}
Truncated result: ${JSON.stringify(truncatedResult)}`;

    return responseMessage;
  } catch (error) {
    console.error(`Error handling ${message.type} message from ${sender}:`, error);
    return `Sorry, there was an error processing your ${message.type}.`;
  } finally {
    // Clean up: delete the temporary file
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(console.error);
    }
  }
}



async function handleInteractiveMessage(message: WhatsAppMessage, sender: string): Promise<string> {
  if (message.interactive?.type === 'button_reply') {
    console.log('Received button reply:', message.interactive.button_reply);
    return `You clicked: ${message.interactive.button_reply.title}`;
  }
  return 'Unsupported interactive message type';
}