// app/api/webhook/route.ts

import { NextResponse } from 'next/server';
import { sendMessage } from '@/utils/whatsappUtils';
import { downloadAndPrepareMedia } from '@/utils/whatsappMediaUtils';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';


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
    console.log(`Downloaded media. Prepared filename: ${preparedFilename}, Original MIME type: ${mimeType}`);

    console.log('Calling upload-and-convert API...');
    // Call the upload-and-convert API using the uploadAndConvertFile function
    const uploadResult = await uploadAndConvertFile(arrayBuffer, preparedFilename, mimeType);
    console.log('Upload and convert result:', JSON.stringify(uploadResult, null, 2));

    // Prepare the payload for the document classification API
    const classificationPayload = {
      image: uploadResult.base64_images[0], // We know this is always an array now
      mimeType: uploadResult.mimeType,
    };

    console.log('Payload for document classification API:', JSON.stringify({
      ...classificationPayload,
      image: classificationPayload.image.substring(0, 50) + '...' // Truncate for logging
    }, null, 2));

    console.log('Calling document classification API...');
    // Call the document classification API
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
      throw new Error('NEXT_PUBLIC_BASE_URL is not set in environment variables');
    }
    const classificationResponse = await fetch(`${baseUrl}/api/find-document-type`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(classificationPayload),
    });

    if (!classificationResponse.ok) {
      const errorText = await classificationResponse.text();
      console.error('Classification API error response:', errorText);
      throw new Error(`Document classification failed with status ${classificationResponse.status}: ${errorText}`);
    }

    const classificationResult = await classificationResponse.json();
    console.log('Document classification result:', JSON.stringify(classificationResult, null, 2));

    // Prepare the response message
    let responseMessage = `${message.type.charAt(0).toUpperCase() + message.type.slice(1)} received and processed.\n`;
    responseMessage += `Filename: ${preparedFilename}\n`;
    responseMessage += `Document Type: ${classificationResult.type}\n`;
    responseMessage += `Original MIME Type: ${mimeType}\n`;
    responseMessage += `Converted MIME Type: ${uploadResult.mimeType}\n`;
    responseMessage += `Public URL: ${uploadResult.url}\n`;

    console.log('Final response message:', responseMessage);

    return responseMessage;
  } catch (error) {
    console.error(`Error handling ${message.type} message:`, error);
    return `Sorry, there was an error processing your ${message.type}: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// Helper function to upload and convert file
async function uploadAndConvertFile(
  arrayBuffer: ArrayBuffer, 
  filename: string, 
  mimeType: string
): Promise<{ url: string; base64_images: string[]; mimeType: string }> {
  console.log(`[File Upload and Conversion] Starting for file: ${filename}`);
  
  const blob = new Blob([arrayBuffer], { type: mimeType });
  const formData = new FormData();
  formData.append('file', blob, filename);

  const UPLOAD_AND_CONVERT_ENDPOINT = `${process.env.NEXT_PUBLIC_BASE_URL}/api/upload-and-convert`;
  const response = await fetch(UPLOAD_AND_CONVERT_ENDPOINT, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[File Upload and Conversion] Failed with status ${response.status}. Error: ${errorText}`);
    throw new Error(`File upload and conversion failed with status ${response.status}. Error: ${errorText}`);
  }

  const result = await response.json();
  console.log(`[File Upload and Conversion] Completed successfully. URL: ${result.url}, MIME type: ${result.mimeType}`);
  
  // Ensure base64_images is always an array
  const base64Images = Array.isArray(result.base64_images) ? result.base64_images : [result.base64_images];
  
  return {
    url: result.url,
    base64_images: base64Images,
    mimeType: result.mimeType
  };
}
async function handleInteractiveMessage(message: WhatsAppMessage, sender: string): Promise<string> {
  if (message.interactive?.type === 'button_reply') {
    console.log('Received button reply:', message.interactive.button_reply);
    return `You clicked: ${message.interactive.button_reply.title}`;
  }
  return 'Unsupported interactive message type';
}