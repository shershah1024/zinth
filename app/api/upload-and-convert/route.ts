//app/api/upload-and-convert/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const PDF_TO_IMAGE_API_URL = 'https://pdftobase64-4f8f77205c96.herokuapp.com/pdf-to-base64/';

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function uploadToSupabase(file: File): Promise<string> {
  const { data, error } = await supabase.storage
    .from('imaging-results')
    .upload(`${Date.now()}-${file.name}`, file);

  if (error) throw error;

  const { data: publicUrlData } = supabase.storage
    .from('imaging-results')
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}

async function getBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

async function convertPdfToImages(publicUrl: string): Promise<string[]> {
  const response = await fetch(`${PDF_TO_IMAGE_API_URL}?url=${encodeURIComponent(publicUrl)}`, {
    method: 'POST'
  });

  if (!response.ok) {
    throw new Error(`PDF conversion failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.base64_images || [];
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Upload file to Supabase
    const publicUrl = await uploadToSupabase(file);

    // Get base64 data
    let base64Data: string | string[];
    if (file.type === 'application/pdf') {
      base64Data = await convertPdfToImages(publicUrl);
    } else {
      base64Data = await getBase64(file);
    }

    return NextResponse.json({
      publicUrl,
      base64Data,
      mimeType: file.type
    });
  } catch (error) {
    console.error('Error processing file:', error);
    return NextResponse.json({ 
      error: 'Error processing file', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}