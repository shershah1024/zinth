// app/api/webhook/route.ts

import { NextResponse } from 'next/server';
import { sendMessage } from '@/utils/whatsappUtils';
import { downloadAndUploadMedia} from '@/utils/whatsappMediaUtils'; // Update this import path as needed
import sharp from 'sharp';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const PDF_TO_IMAGE_API_URL = 'https://pdftobase64-4f8f77205c96.herokuapp.com/pdf-to-base64/';
const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || '';
const IMAGING_ANALYSIS_URL = `${NEXT_PUBLIC_BASE_URL}/api/imaging-analysis`;
const HEALTH_REPORT_ANALYSIS_URL = `${NEXT_PUBLIC_BASE_URL}/api/analyze-health-reports`;
const PRESCRIPTION_ANALYSIS_URL = `${NEXT_PUBLIC_BASE_URL}/api/analyze-prescription`;


const DOCUMENT_CLASSIFICATION_URL = `${NEXT_PUBLIC_BASE_URL}/api/find-document-type`;

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

async function classifyDocument(base64Image: string, mimeType: string): Promise<string> {
  const response = await fetch(DOCUMENT_CLASSIFICATION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image, mimeType }),
  });

  if (!response.ok) {
    throw new Error(`Document classification failed with status ${response.status}`);
  }

  const result = await response.json();
  return result.type;
}

async function analyzeImagingResult(base64Images: string[], mimeType: string): Promise<string[]> {
  console.log(`Analyzing imaging result - Number of images: ${base64Images.length}, MIME type: ${mimeType}`);
  
  const response = await fetch(IMAGING_ANALYSIS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: base64Images, mimeType }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Imaging analysis failed - Status: ${response.status}, Error: ${errorText}`);
    throw new Error(`Imaging analysis failed with status ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  console.log(`Imaging analysis completed - Result:`, result);
  return Array.isArray(result.analysis) ? result.analysis : [result.analysis];
}

async function analyzeHealthReport(base64Images: string[], mimeType: string, publicUrl: string): Promise<string[]> {
  console.log(`Analyzing health report - Number of images: ${base64Images.length}, MIME type: ${mimeType}`);
  
  const response = await fetch(HEALTH_REPORT_ANALYSIS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: base64Images, mimeType, publicUrl }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Health report analysis failed - Status: ${response.status}, Error: ${errorText}`);
    throw new Error(`Health report analysis failed with status ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  console.log(`Health report analysis completed - Result:`, result);
  return Array.isArray(result.analysis) ? result.analysis : [result.analysis];
}

async function analyzePrescription(base64Images: string[], mimeType: string): Promise<string[]> {
  console.log(`Analyzing prescription - Number of images: ${base64Images.length}, MIME type: ${mimeType}`);
  
  const response = await fetch(PRESCRIPTION_ANALYSIS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: base64Images, mimeType }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Prescription analysis failed - Status: ${response.status}, Error: ${errorText}`);
    throw new Error(`Prescription analysis failed with status ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  console.log(`Prescription analysis completed - Result:`, result);
  return Array.isArray(result.analysis) ? result.analysis : [result.analysis];
}

async function handleMediaMessage(message: WhatsAppMessage, sender: string): Promise<string> {
  console.log(`Received ${message.type} message from ${sender}:`, message[message.type as 'image' | 'document']?.id);

  try {
    const mediaInfo = message[message.type as 'image' | 'document'];
    if (!mediaInfo) {
      throw new Error(`Invalid ${message.type} message structure`);
    }

    const { path, publicUrl } = await downloadAndUploadMedia(mediaInfo.id);
    console.log("Downloaded media - path:", path, "publicUrl:", publicUrl);

    let base64Images: string[];
    let mimeType: string;

    if (path.toLowerCase().endsWith('.pdf')) {
      console.log('[PDF Processing] Starting conversion for PDF file');
      const conversionResult = await convertPdfToImages(publicUrl);
      base64Images = conversionResult.base64_images;
      mimeType = 'image/png';  // PDF conversion always results in PNG images
      console.log(`[PDF Processing] Converted PDF into ${base64Images.length} images. MIME type: ${mimeType}`);
    } else {
      console.log('[File Processing] Processing non-PDF file');
      const response = await fetch(publicUrl);
      mimeType = response.headers.get('content-type') || 'application/octet-stream';
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      base64Images = [base64];  // Store without data URL prefix
      console.log(`[File Processing] Converted file to base64. MIME type: ${mimeType}`);
    }

    console.log(`Processed media - mimeType: ${mimeType}, Number of images: ${base64Images.length}`);
    console.log("First 100 characters of first base64 image:", base64Images[0].substring(0, 100));

    // For classification and analysis, we need to ensure the base64 string includes the data URL prefix
    const base64WithPrefix = base64Images.map(img => 
      img.startsWith('data:') ? img : `data:${mimeType};base64,${img}`
    );

    const classificationType = await classifyDocument(base64WithPrefix[0], mimeType);
    console.log(`Document classified as: ${classificationType}`);

    let analysisResults: string[];
    console.log(`Starting analysis for ${classificationType}`);
    console.log(`Analysis input - base64Images length: ${base64WithPrefix.length}, mimeType: ${mimeType}`);

    switch (classificationType) {
      case 'imaging_result':
        analysisResults = await analyzeImagingResult(base64WithPrefix, mimeType);
        break;
      case 'health_record':
        analysisResults = await analyzeHealthReport(base64WithPrefix, mimeType, publicUrl);
        break;
      case 'prescription':
        analysisResults = await analyzePrescription(base64WithPrefix, mimeType);
        break;
      default:
        throw new Error(`Unexpected document classification: ${classificationType}`);
    }

    console.log(`Analysis completed. Number of results: ${analysisResults.length}`);
    console.log(`First analysis result: ${analysisResults[0]?.substring(0, 100)}`);

    const analysisResultsFormatted = analysisResults.map((result, index) => 
      `Page ${index + 1}: ${result}`
    ).join('\n');

    const responseMessage = `${message.type.charAt(0).toUpperCase() + message.type.slice(1)} received from ${sender} and processed.
Path: ${path}
Public URL: ${publicUrl}
MIME Type: ${mimeType}
Number of images: ${base64Images.length}
Document Classification: ${classificationType}
Analysis Results:
${analysisResultsFormatted}`;

    return responseMessage;
  } catch (error) {
    console.error(`Error handling ${message.type} message from ${sender}:`, error);
    return `Sorry, there was an error processing your ${message.type}: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

async function convertPdfToImages(publicUrl: string): Promise<{ base64_images: string[] }> {
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
  return { base64_images: data.base64_images };
}



async function handleInteractiveMessage(message: WhatsAppMessage, sender: string): Promise<string> {
  if (message.interactive?.type === 'button_reply') {
    console.log('Received button reply:', message.interactive.button_reply);
    return `You clicked: ${message.interactive.button_reply.title}`;
  }
  return 'Unsupported interactive message type';
}