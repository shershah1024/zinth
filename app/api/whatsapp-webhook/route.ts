// app/api/webhook/route.ts

import { NextResponse } from 'next/server';
import { sendMessage } from '@/utils/whatsappUtils';
import { downloadAndUploadMedia } from '@/utils/whatsappMediaUtils';
import { Buffer } from 'buffer';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const PDF_TO_IMAGE_API_URL = 'https://pdftobase64-4f8f77205c96.herokuapp.com/pdf-to-base64/';
const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || '';
const IMAGING_ANALYSIS_URL = `${NEXT_PUBLIC_BASE_URL}/api/imaging-analysis`;
const HEALTH_REPORT_ANALYSIS_URL = `${NEXT_PUBLIC_BASE_URL}/api/analyze-health-reports`;
const PRESCRIPTION_ANALYSIS_URL = `${NEXT_PUBLIC_BASE_URL}/api/analyze-prescription`;
const HEALTH_RECORDS_VIEW_URL = 'https://zinth.vercel.app/health-records';
const MAX_BATCH_SIZE = 3;
const DOCUMENT_CLASSIFICATION_URL = `${NEXT_PUBLIC_BASE_URL}/api/find-document-type`;
const UPLOAD_FILE_ENDPOINT = `${BASE_URL}/api/upload-file-supabase`;

interface AnalysisResult {
  pageNumber: number;
  analysis: string;
}

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

export async function POST(req: Request) {
  const okResponse = NextResponse.json({ status: "OK" });

  try {
    const data: WhatsAppWebhookData = await req.json();
    console.log('Received webhook data:', JSON.stringify(data, null, 2));

    const entry = data.entry[0];
    if (!entry) {
      console.log('No entry in webhook data');
      return okResponse;
    }

    const change = entry.changes[0];
    if (!change) {
      console.log('No change in webhook data');
      return okResponse;
    }

    const value = change.value;

    if (!value.contacts || value.contacts.length === 0) {
      console.log('Ignoring webhook data without contacts field');
      return okResponse;
    }

    if (!value.messages || value.messages.length === 0) {
      console.log('Ignoring webhook data without messages');
      return okResponse;
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

    // Send the response back to the user asynchronously
    sendMessage(sender, response).catch(error => {
      console.error('Error sending message:', error);
    });

    return okResponse;
  } catch (error) {
    console.error('Error processing webhook:', error);
    return okResponse;
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

async function analyzeHealthReport(base64Images: string[], mimeType: string, publicUrl: string): Promise<string> {
  console.log(`[Health Report Analysis] Analyzing ${base64Images.length} images`);
  const MAX_BATCH_SIZE = 3; // Adjust this value as needed

  for (let i = 0; i < base64Images.length; i += MAX_BATCH_SIZE) {
    const batch = base64Images.slice(i, i + MAX_BATCH_SIZE);
    console.log(`[Health Report Analysis] Processing batch ${i / MAX_BATCH_SIZE + 1} with ${batch.length} images`);

    const analyzeResponse = await fetch(HEALTH_REPORT_ANALYSIS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: batch, mimeType, publicUrl })
    });

    if (!analyzeResponse.ok) {
      const errorText = await analyzeResponse.text();
      console.error(`[Health Report Analysis] Batch analysis failed - Status: ${analyzeResponse.status}, Error: ${errorText}`);
      throw new Error(`Health report analysis failed with status ${analyzeResponse.status}: ${errorText}`);
    }

    const batchData = await analyzeResponse.json();
    if (!batchData || typeof batchData !== 'object') {
      console.error("[Health Report Analysis] Unexpected analysis results structure");
      throw new Error("Analysis results do not have the expected structure");
    }

    console.log(`[Health Report Analysis] Batch ${i / MAX_BATCH_SIZE + 1} processed successfully`);
  }

  console.log('[Health Report Analysis] All batches processed. Returning link to view results.');
  return HEALTH_RECORDS_VIEW_URL;
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
      base64Images = conversionResult.base64_images.map(removeDataUrlPrefix);
      mimeType = 'image/png';  // PDF conversion always results in PNG images
      console.log(`[PDF Processing] Converted PDF into ${base64Images.length} images. MIME type: ${mimeType}`);
    } else {
      console.log('[File Processing] Processing non-PDF file');
      const response = await fetch(publicUrl);
      mimeType = response.headers.get('content-type') || 'application/octet-stream';
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      base64Images = [base64];
      console.log(`[File Processing] Converted file to base64. MIME type: ${mimeType}`);
    }

    base64Images = base64Images.map((img, index) => {
      if (!isValidBase64(img)) {
        console.error(`Invalid base64 data for image ${index + 1}`);
        throw new Error(`Invalid base64 data for image ${index + 1}`);
      }
      return img;
    });

    console.log(`Processed media - mimeType: ${mimeType}, Number of images: ${base64Images.length}`);
    console.log("First 100 characters of first base64 image:", base64Images[0].substring(0, 100));

    const classificationType = await classifyDocument(base64Images[0], mimeType);
    console.log(`Document classified as: ${classificationType}`);

    let analysisResult: string;
    console.log(`Starting analysis for ${classificationType}`);
    console.log(`Analysis input - base64Images length: ${base64Images.length}, mimeType: ${mimeType}`);

    switch (classificationType) {
      case 'imaging_result':
        const imagingResults = await analyzeImagingResult(base64Images, mimeType);
        analysisResult = imagingResults.join('\n');
        break;
      case 'health_record':
        analysisResult = await analyzeHealthReport(base64Images, mimeType, publicUrl);
        break;
      case 'prescription':
        const prescriptionResults = await analyzePrescription(base64Images, mimeType);
        analysisResult = prescriptionResults.join('\n');
        break;
      default:
        throw new Error(`Unexpected document classification: ${classificationType}`);
    }

    console.log(`Analysis completed. Result: ${analysisResult.substring(0, 100)}...`);

    const responseMessage = `${message.type.charAt(0).toUpperCase() + message.type.slice(1)} received from ${sender} and processed.
Document Classification: ${classificationType}
Analysis Result: ${analysisResult}`;

    return responseMessage;
  } catch (error) {
    console.error(`Error handling ${message.type} message from ${sender}:`, error);
    return `Sorry, there was an error processing your ${message.type}: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

function removeDataUrlPrefix(base64String: string): string {
  const prefixRegex = /^data:image\/[a-z]+;base64,/;
  return base64String.replace(prefixRegex, '');
}

function isValidBase64(str: string) {
  if (str === '' || str.trim() === '') { return false; }
  try {
    return btoa(atob(str)) == str;
  } catch (err) {
    return false;
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