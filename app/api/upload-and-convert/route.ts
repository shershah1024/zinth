import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PDF_TO_IMAGE_API_URL = 'https://pdftobase64-4f8f77205c96.herokuapp.com/pdf-to-base64/';

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function uploadToSupabase(file: File): Promise<string> {
  console.log(`[Supabase Upload] Starting upload for file: ${file.name}, size: ${file.size} bytes`);
  
  const { data, error } = await supabase.storage
    .from('all_file')
    .upload(`${Date.now()}-${file.name}`, file);

  if (error) {
    console.error(`[Supabase Upload] Error:`, error);
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from('all_file')
    .getPublicUrl(data.path);

  console.log(`[Supabase Upload] File uploaded successfully. Public URL: ${publicUrlData.publicUrl}`);
  return publicUrlData.publicUrl;
}

async function getBase64(file: File): Promise<string> {
  console.log(`[File to Base64] Converting file to base64: ${file.name}`);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');
  console.log(`[File to Base64] Conversion complete. Base64 string length: ${base64.length}`);
  return base64;
}

async function convertPdfToImages(publicUrl: string): Promise<string[]> {
  console.log(`[PDF Conversion] Starting conversion for file at URL: ${publicUrl}`);

  const response = await fetch(`${PDF_TO_IMAGE_API_URL}?url=${encodeURIComponent(publicUrl)}`, {
    method: 'POST'
  });

  console.log(`[PDF Conversion] Response status: ${response.status}`);

  if (!response.ok) {
    const responseText = await response.text();
    console.error(`[PDF Conversion] Failed with status ${response.status}. Response: ${responseText}`);
    throw new Error(`PDF conversion failed with status ${response.status}. Response: ${responseText}`);
  }

  const data = await response.json();

  if (!data.base64_images || data.base64_images.length === 0) {
    console.error('[PDF Conversion] No images returned');
    throw new Error('PDF conversion returned no images');
  }

  console.log(`[PDF Conversion] Successfully converted ${data.base64_images.length} pages`);
  return data.base64_images;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      console.error('[File Upload] No file uploaded');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    console.log(`[File Upload] Received file: ${file.name}, type: ${file.type || 'undefined'}, size: ${file.size} bytes`);

    // Upload file to Supabase
    const publicUrl = await uploadToSupabase(file);

    // Get base64 data
    let base64Data: string | string[];
    let mimeType: string = 'image/png';  // Default to 'image/png'

    try {
      if (file.type === 'application/pdf') {
        // For PDF files, convert to PNG images
        base64Data = await convertPdfToImages(publicUrl);
        console.log(`[PDF Processing] Converted PDF into ${base64Data.length} PNG images`);
      } else {
        // For all other file types, including images and undefined types
        base64Data = await getBase64(file);
        mimeType = file.type || 'image/png';  // Use original type if defined, else default to 'image/png'
        console.log(`[File Processing] Converted file to base64, MIME type: ${mimeType}`);
      }
    } catch (error) {
      console.error('[File Processing] Error during file processing:', error);
      return NextResponse.json({ 
        error: 'Error processing file', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, { status: 500 });
    }

    if (!base64Data) {
      console.error('[File Processing] base64Data is undefined after processing');
      return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
    }

    console.log(`[File Processing] Final MIME type: ${mimeType}`);

    if (Array.isArray(base64Data)) {
      console.log(`[File Processing] Number of images: ${base64Data.length}`);
      if (base64Data.length > 0) {
        console.log(`[File Processing] First image base64 prefix: ${base64Data[0].substring(0, 50)}...`);
      }
    } else {
      console.log(`[File Processing] File base64 prefix: ${base64Data.substring(0, 50)}...`);
    }

    return NextResponse.json({
      publicUrl,
      base64Data,
      mimeType
    });
  } catch (error) {
    console.error('[Error] Error processing prescription:', error);
    return NextResponse.json({ 
      error: 'Error processing prescription', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}