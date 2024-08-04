import { NextResponse } from 'next/server';
import { sendMessage } from '@/utils/whatsappUtils';
import { downloadAndUploadMedia } from '@/utils/whatsappMediaUtils';
import { Buffer } from 'buffer';

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

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
const IMAGING_RESULTS_VIEW_URL = 'https://zinth.vercel.app/imaging-results';
const PRESCRIPTION_VIEW_URL = 'https://zinth.vercel.app/prescriptions';

console.log("nect public base url is", NEXT_PUBLIC_BASE_URL)

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

// Add a simple in-memory cache for message deduplication
const processedMessages = new Set<string>();

// Add this function to create a delay
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  try {
    const data: WhatsAppWebhookData = await req.json();
    console.log('Received webhook data:', JSON.stringify(data, null, 2));

    const message = data.entry[0]?.changes[0]?.value?.messages?.[0];
    if (!message) {
      console.log('No valid message in webhook data');
      return NextResponse.json({ status: "OK" });
    }

    const sender = data.entry[0]?.changes[0]?.value?.contacts?.[0]?.wa_id;
    if (!sender) {
      console.log('No valid sender in webhook data');
      return NextResponse.json({ status: "OK" });
    }

    // Check if we've already processed this message
    if (processedMessages.has(message.id)) {
      console.log(`Already processed message ${message.id}. Skipping.`);
      return NextResponse.json({ status: "OK" });
    }

    // Mark this message as processed
    processedMessages.add(message.id);

    // Clean up old messages from the set (e.g., keep only last 1000 messages)
    if (processedMessages.size > 1000) {
      const oldestMessages = Array.from(processedMessages).slice(0, 100);
      oldestMessages.forEach(id => processedMessages.delete(id));
    }

    if (isMessageOld(message.timestamp)) {
      console.log('Ignoring message older than 3 minutes');
      return NextResponse.json({ status: "OK" });
    }

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

    // Send the response back to the user
    await sendMessage(sender, response);

    // Return OK response after sending the message
    return NextResponse.json({ status: "OK" });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ status: "OK" });
  }
}

function isMessageOld(timestamp: string): boolean {
  const messageTime = new Date(parseInt(timestamp) * 1000);
  const currentTime = new Date();
  const timeDifference = currentTime.getTime() - messageTime.getTime();
  const threeMinutesInMs = 3 * 60 * 1000;
  return timeDifference > threeMinutesInMs;
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

async function analyzeImagingResult(base64Images: string[], mimeType: string, publicUrl: string): Promise<string> {
  console.log(`[Imaging Analysis] Analyzing ${base64Images.length} images`);

  let analysisResults: string[] = [];

  for (let i = 0; i < base64Images.length; i += MAX_BATCH_SIZE) {
    const batch = base64Images.slice(i, i + MAX_BATCH_SIZE);

    try {
      const analyzeResponse = await fetch(IMAGING_ANALYSIS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: batch, mimeType, publicUrl })
      });

      if (!analyzeResponse.ok) {
        const errorText = await analyzeResponse.text();
        console.error(`Batch analysis failed - Status: ${analyzeResponse.status}, Error: ${errorText}`);
        throw new Error(`Batch analysis failed with status ${analyzeResponse.status}: ${errorText}`);
      }

      const result = await analyzeResponse.json();
      analysisResults.push(result.analysis);
    } catch (error) {
      console.error(`[Imaging Analysis] Error processing batch:`, error);
      throw error;
    }
  }

  console.log(`[Imaging Analysis] Completed. Analyzed ${base64Images.length} images.`);
  
  return analysisResults.join("\n\n");
}

async function analyzeHealthReport(base64Images: string[], mimeType: string, publicUrl: string): Promise<string> {
  console.log(`[Health Report Analysis] Analyzing ${base64Images.length} images`);

  let analysisResults: string[] = [];

  for (let i = 0; i < base64Images.length; i += MAX_BATCH_SIZE) {
    const batch = base64Images.slice(i, i + MAX_BATCH_SIZE);

    try {
      const analyzeResponse = await fetch(HEALTH_REPORT_ANALYSIS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: batch, mimeType, publicUrl })
      });

      if (!analyzeResponse.ok) {
        throw new Error(`Batch analysis failed with status ${analyzeResponse.status}`);
      }

      const result = await analyzeResponse.json();
      analysisResults.push(result.analysis);
    } catch (error) {
      console.error(`[Health Report Analysis] Error processing batch:`, error);
      throw error;
    }
  }

  console.log(`[Health Report Analysis] Completed. Analyzed ${base64Images.length} images.`);
  
  return analysisResults.join("\n\n");
}

async function analyzePrescription(base64Images: string[], mimeType: string, publicUrl: string): Promise<string> {
  console.log(`Analyzing prescription - Number of images: ${base64Images.length}, MIME type: ${mimeType}`);
  
  const response = await fetch(PRESCRIPTION_ANALYSIS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: base64Images, mimeType, publicUrl }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Prescription analysis failed - Status: ${response.status}, Error: ${errorText}`);
    throw new Error(`Prescription analysis failed with status ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  console.log(`Prescription analysis completed`);
  
  return result.analysis;
}

async function handleMediaMessage(message: WhatsAppMessage, sender: string): Promise<string> {
  console.log(`Received ${message.type} message from ${sender}:`, message[message.type as 'image' | 'document']?.id);

  // Send an intermediary message
  await sendMessage(sender, `We've received your ${message.type}. We're analyzing it now and will send you the results soon.`);

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
        analysisResult = await analyzeImagingResult(base64Images, mimeType, publicUrl);
        break;
      case 'health_record':
        analysisResult = await analyzeHealthReport(base64Images, mimeType, publicUrl);
        break;
      case 'prescription':
        analysisResult = await analyzePrescription(base64Images, mimeType, publicUrl);
        break;
      default:
        throw new Error(`Unexpected document classification: ${classificationType}`);
    }

    console.log(`Analysis completed. Result: ${analysisResult}`);

    // Add a 60-second delay
    console.log("Waiting for 60 seconds before sending the final response...");
    await delay(60000);

    let resultUrl: string;
    switch (classificationType) {
      case 'imaging_result':
        resultUrl = IMAGING_RESULTS_VIEW_URL;
        break;
      case 'health_record':
        resultUrl = HEALTH_RECORDS_VIEW_URL;
        break;
      case 'prescription':
        resultUrl = PRESCRIPTION_VIEW_URL;
        break;
      default:
        resultUrl = 'https://zinth.vercel.app'; // Default URL
    }

    // Construct a single, consolidated response
    const finalResponse = `Analysis complete for your ${classificationType}.\n\n` +
                          `Summary: ${analysisResult}\n\n` +
                          `You can view the detailed results here: ${resultUrl}`;

                          return finalResponse;
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
                      
//redeploy