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
  let tempFilePath: string | undefined;
  try {
    const mediaInfo = message[message.type as 'image' | 'document'];
    if (!mediaInfo) {
      throw new Error(`Invalid ${message.type} message structure`);
    }

    let filename: string | undefined;
    let isImage = false;

    if (message.type === 'document' && message.document) {
      filename = message.document.filename;
      console.log(`Processing document: ${filename}`);
    } else if (message.type === 'image' && message.image) {
      const fileExtension = message.image.mime_type.split('/')[1];
      filename = `image_${Date.now()}.${fileExtension}`;
      isImage = true;
      console.log(`Processing image: ${filename}`);
    } else {
      throw new Error(`Unsupported media type: ${message.type}`);
    }

    const { arrayBuffer, filename: preparedFilename, mimeType } = await downloadAndPrepareMedia(mediaInfo.id, filename);
    console.log(`Downloaded media. Prepared filename: ${preparedFilename}, Original MIME type: ${mimeType}`);

    // Create a temporary file
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, preparedFilename);
    await fs.writeFile(tempFilePath, Buffer.from(arrayBuffer));
    console.log(`Temporary file created at: ${tempFilePath}`);

    // Get the base URL from environment variables
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
      throw new Error('API_BASE_URL is not set in environment variables');
    }

    // Create FormData and append the file
    const formData = new FormData();
    const fileStream = await fs.readFile(tempFilePath);
    formData.append('file', new Blob([fileStream]), preparedFilename);

    console.log('Calling upload-and-convert API...');
    // Call the upload-and-convert API
    const uploadResponse = await fetch(`${baseUrl}/api/upload-and-convert`, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload and convert failed with status ${uploadResponse.status}: ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('Upload and convert result:', JSON.stringify(uploadResult, null, 2));

    // Check if the uploaded result is actually an image
    let base64Image = uploadResult.base64_images;
    let actualMimeType = uploadResult.mimeType;

    // If the result is HTML, we need to extract the image data
    if (base64Image.startsWith('PCFET0NUWVBFIGh0bWw+') || actualMimeType.includes('html')) {
      console.error('Received HTML instead of image data. Unable to process.');
      throw new Error('Received HTML instead of image data');
    }

    // Determine the MIME type for classification
    const classificationMimeType = isImage ? actualMimeType : 'image/png';
    console.log(`Classification MIME type: ${classificationMimeType}`);

    // Prepare the payload for the document classification API
    const classificationPayload = {
      image: base64Image,
      mimeType: classificationMimeType,
    };

    // Log a truncated version of the payload
    console.log('Payload for document classification API (truncated):');
    console.log(JSON.stringify({
      ...classificationPayload,
      image: classificationPayload.image.substring(0, 100) + '...' // Truncate only for logging
    }, null, 2));

    console.log(`Full base64 image length: ${classificationPayload.image.length}`);

    console.log('Calling document classification API...');
    // Call the document classification API with the full payload
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
    responseMessage += `Upload Result MIME Type: ${actualMimeType}\n`;
    responseMessage += `Classification MIME Type: ${classificationMimeType}\n`;
    responseMessage += `Public URL: ${uploadResult.url}\n`;

    // Truncate the base64 image data for the response
    const truncatedBase64 = base64Image.substring(0, 50) + '...';
    responseMessage += `Truncated Image Data: ${truncatedBase64}`;

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

async function handleInteractiveMessage(message: WhatsAppMessage, sender: string): Promise<string> {
  if (message.interactive?.type === 'button_reply') {
    console.log('Received button reply:', message.interactive.button_reply);
    return `You clicked: ${message.interactive.button_reply.title}`;
  }
  return 'Unsupported interactive message type';
}