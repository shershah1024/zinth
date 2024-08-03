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
  console.log(`Received ${message.type} message:`, message[message.type as 'image' | 'document']?.id);
  let tempFilePath: string | undefined;

  try {
    const mediaInfo = message[message.type as 'image' | 'document'];
    if (!mediaInfo) {
      throw new Error(`Invalid ${message.type} message structure`);
    }

    let filename: string;
    if (message.type === 'document' && message.document) {
      filename = message.document.filename;
      console.log(`Processing document: ${filename}`);
    } else if (message.type === 'image' && message.image) {
      const fileExtension = message.image.mime_type.split('/')[1];
      filename = `image_${Date.now()}.${fileExtension}`;
      console.log(`Processing image: ${filename}`);
    } else {
      throw new Error(`Unsupported media type: ${message.type}`);
    }

    const { arrayBuffer, filename: preparedFilename, mimeType } = await downloadAndPrepareMedia(mediaInfo.id, filename);
    console.log(`Downloaded media. Prepared filename: ${preparedFilename}, Original MIME type: ${mimeType}, Size: ${arrayBuffer.byteLength} bytes`);

    // Create a temporary file
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, preparedFilename);
    await fs.writeFile(tempFilePath, Buffer.from(arrayBuffer));
    console.log(`Temporary file created at: ${tempFilePath}`);

    // Read the file and create a File object
    const fileBuffer = await fs.readFile(tempFilePath);
    const file = new File([fileBuffer], preparedFilename, { type: mimeType });

    console.log('Calling uploadFile function...');
    // Call the uploadFile function
    const publicUrl = await uploadFile(file);
    console.log(`File uploaded successfully. Public URL: ${publicUrl}`);

    // Prepare the response message
    let responseMessage = `${message.type.charAt(0).toUpperCase() + message.type.slice(1)} received and processed.\n`;
    responseMessage += `Filename: ${preparedFilename}\n`;
    responseMessage += `Public URL: ${publicUrl}\n`;
    responseMessage += `Original MIME Type: ${mimeType}\n`;

    console.log('Final response message:', responseMessage);

    return responseMessage;
  } catch (error) {
    console.error(`Error handling ${message.type} message:`, error);
    return `Sorry, there was an error processing your ${message.type}: ${error instanceof Error ? error.message : 'Unknown error'}`;
  } finally {
    // Clean up: delete the temporary file
    if (tempFilePath) {
      console.log(`Deleting temporary file: ${tempFilePath}`);
      await fs.unlink(tempFilePath).catch(console.error);
    }
  }
}

// The uploadFile function you provided
async function uploadFile(file: File): Promise<string> {
  console.log(`[File Upload] Starting upload for file: ${file.name}, size: ${file.size} bytes`);
  
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(UPLOAD_FILE_ENDPOINT, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[File Upload] Upload failed with status ${response.status}. Error: ${errorText}`);
    throw new Error(`Upload failed with status ${response.status}. Error: ${errorText}`);
  }

  const data = await response.json();

  if (!data.success || !data.publicUrl) {
    console.error('[File Upload] Invalid response from server:', data);
    throw new Error('Invalid response from server');
  }

  console.log(`[File Upload] File uploaded successfully. Public URL: ${data.publicUrl}`);
  return data.publicUrl;
}

async function handleInteractiveMessage(message: WhatsAppMessage, sender: string): Promise<string> {
  if (message.interactive?.type === 'button_reply') {
    console.log('Received button reply:', message.interactive.button_reply);
    return `You clicked: ${message.interactive.button_reply.title}`;
  }
  return 'Unsupported interactive message type';
}