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

  const publicUrl = publicUrlData.publicUrl;
  console.log(`[Supabase Upload] File uploaded successfully. Public URL: ${publicUrl}`);

  // Verify that the URL is publicly accessible
  try {
    const verifyResponse = await fetch(publicUrl, { method: 'HEAD' });
    if (!verifyResponse.ok) {
      throw new Error(`URL is not publicly accessible: ${verifyResponse.status}`);
    }
  } catch (error) {
    console.error('[Supabase Upload] Error verifying public URL:', error);
    throw new Error('Failed to verify public URL accessibility');
  }

  return publicUrl;
}

async function getBase64(file: File): Promise<string> {
  console.log(`[File to Base64] Converting file to base64: ${file.name}`);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');
  console.log(`[File to Base64] Conversion complete. Base64 string length: ${base64.length}`);
  return base64;
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

    let result: { url: string; base64_images: string | string[]; mimeType: string };

    if (file.type === 'application/pdf') {
      // For PDF files, convert to images
      result = await convertPdfToImages(publicUrl);
      console.log(`[PDF Processing] Converted PDF into ${result.base64_images.length} images. MIME type: ${result.mimeType}`);
    } else {
      // For all other file types, use the actual MIME type of the file
      const base64 = await getBase64(file);
      result = {
        url: publicUrl,
        base64_images: base64,
        mimeType: file.type || 'application/octet-stream'  // Use actual MIME type or fallback if undefined
      };
      console.log(`[File Processing] Converted file to base64. MIME type: ${result.mimeType}`);
    }

    console.log(`[File Processing] Final result:`, JSON.stringify(result, (key, value) => {
      if (key === 'base64_images' && Array.isArray(value)) {
        return value.map(img => img.substring(0, 50) + '...');
      }
      if (key === 'base64_images' && typeof value === 'string') {
        return value.substring(0, 50) + '...';
      }
      return value;
    }, 2));

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Error] Error processing file:', error);
    return NextResponse.json({ 
      error: 'Error processing file', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}