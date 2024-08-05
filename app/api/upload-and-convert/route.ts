import { NextRequest, NextResponse } from 'next/server';

const PDF_TO_IMAGE_API_URL = 'https://pdftobase64-4f8f77205c96.herokuapp.com/pdf-to-base64/';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const UPLOAD_FILE_ENDPOINT = `${BASE_URL}/api/upload-file-supabase`;

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

if (!BASE_URL) {
  throw new Error('NEXT_PUBLIC_BASE_URL is not set in the environment variables');
}

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

async function convertToBase64(publicUrl: string): Promise<{ url: string; base64_images: string[]; mimeType: string }> {
  console.log(`[File Conversion] Starting conversion for file at URL: ${publicUrl}`);

  const response = await fetch(PDF_TO_IMAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: publicUrl })
  });

  console.log(`[File Conversion] Response status: ${response.status}`);

  if (!response.ok) {
    const responseText = await response.text();
    console.error(`[File Conversion] Failed with status ${response.status}. Response: ${responseText}`);
    throw new Error(`File conversion failed with status ${response.status}. Response: ${responseText}`);
  }

  const data = await response.json();
  console.log('[File Conversion] Conversion result:', JSON.stringify(data, null, 2));

  if (!data.base64_images || data.base64_images.length === 0) {
    console.error('[File Conversion] No images returned');
    throw new Error('File conversion returned no images');
  }

  console.log(`[File Conversion] Successfully converted ${data.base64_images.length} images`);
  return {
    url: publicUrl,
    base64_images: data.base64_images,
    mimeType: data.mimeType || 'image/png'  // Use the returned mimeType or default to 'image/png'
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

    // Upload file using the existing endpoint
    const publicUrl = await uploadFile(file);

    // Convert the file to base64 using the PDF to Base64 API
    const result = await convertToBase64(publicUrl);

    console.log(`[File Processing] Final result:`, JSON.stringify(result, (key, value) => {
      if (key === 'base64_images' && Array.isArray(value)) {
        return value.map(img => img.substring(0, 50) + '...');
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