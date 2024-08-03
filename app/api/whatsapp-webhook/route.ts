// app/api/webhook/route.ts

import { NextResponse } from 'next/server';
import { sendMessage } from '@/utils/whatsappUtils';
import { downloadAndUploadMedia} from '@/utils/whatsappMediaUtils'; // Update this import path as needed
const PDF_TO_IMAGE_API_URL = 'https://pdftobase64-4f8f77205c96.herokuapp.com/pdf-to-base64/';
const DOCUMENT_CLASSIFICATION_URL = '/api/find-document-type'; // Update this if the endpoint URL is different



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



async function convertPdfToImages(publicUrl: string): Promise<{ url: string; base64_images: string[]; mimeType: string }> {
  console.log(`[PDF Conversion] Starting conversion for file at URL: ${publicUrl}`);

  const response = await fetch(PDF_TO_IMAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: publicUrl })
  });

  console.log(`[PDF Conversion] Response status: ${response.status}`);

  if (!response.ok) {
    const responseText = await response.text();
    console.error(`[PDF Conversion] Failed with status ${response.status}. Response: ${responseText}`);
    throw new Error(`PDF conversion failed with status ${response.status}. Response: ${responseText}`);
  }

  const data = await response.json();
  console.log('[PDF Conversion] Conversion result:', JSON.stringify(data, null, 2));

  if (!data.base64_images || data.base64_images.length === 0) {
    console.error('[PDF Conversion] No images returned');
    throw new Error('PDF conversion returned no images');
  }

  console.log(`[PDF Conversion] Successfully converted ${data.base64_images.length} pages`);
  return {
    url: publicUrl,
    base64_images: data.base64_images,
    mimeType: 'image/png'  // PDF conversion always results in PNG images
  };
}

async function classifyDocument(base64Image: string, mimeType: string): Promise<string> {
  const response = await fetch(DOCUMENT_CLASSIFICATION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ image: base64Image, mimeType }),
  });

  if (!response.ok) {
    throw new Error(`Document classification failed with status ${response.status}`);
  }

  const result = await response.json();
  return result.type;
}

async function handleMediaMessage(message: WhatsAppMessage, sender: string): Promise<string> {
  console.log(`Received ${message.type} message from ${sender}:`, message[message.type as 'image' | 'document']?.id);

  try {
    const mediaInfo = message[message.type as 'image' | 'document'];
    if (!mediaInfo) {
      throw new Error(`Invalid ${message.type} message structure`);
    }

    // Use downloadAndUploadMedia function to handle the entire process
    const { path, publicUrl } = await downloadAndUploadMedia(mediaInfo.id);

    let base64Images: string[] = [];
    let mimeType: string;

    // Check if the file is a PDF
    if (path.toLowerCase().endsWith('.pdf')) {
      console.log('Processing PDF file');
      const conversionResult = await convertPdfToImages(publicUrl);
      base64Images = conversionResult.base64_images;
      mimeType = 'image/png'; // Explicitly set to 'image/png' for converted PDFs
    } else {
      console.log('Processing non-PDF file');
      // For non-PDF files, we need to download the file and convert it to base64
      const response = await fetch(publicUrl);
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      base64Images = [base64];
      mimeType = response.headers.get('content-type') || 'application/octet-stream';
    }

    // Classify the document
    const classificationType = await classifyDocument(base64Images[0], mimeType);

    // Prepare the response message
    const responseMessage = `${message.type.charAt(0).toUpperCase() + message.type.slice(1)} received from ${sender} and processed.
Path: ${path}
Public URL: ${publicUrl}
MIME Type: ${mimeType}
Number of images: ${base64Images.length}
Document Classification: ${classificationType}
Base64 Images: ${base64Images.map((img, index) => `\nImage ${index + 1}: ${img.substring(0, 50)}...`).join('')}`;

    return responseMessage;
  } catch (error) {
    console.error(`Error handling ${message.type} message from ${sender}:`, error);
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