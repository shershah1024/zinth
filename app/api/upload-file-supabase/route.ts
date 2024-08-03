//app/api/upload-file-supabase/route.ts


import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Supabase environment variables are not set');
  throw new Error('Supabase environment variables are not set');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(request: NextRequest) {
  console.log('[Supabase Upload] Received request for file upload');
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('[Supabase Upload] No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = `${Date.now()}_${file.name}`;
    console.log(`[Supabase Upload] Generated filename: ${fileName}`);

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    // Upload the file
    const { data, error } = await supabase.storage
      .from('all_file')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
      });

    if (error) {
      console.error('[Supabase Upload] Error uploading file:', error);
      return NextResponse.json({ error: `Error uploading file: ${error.message}` }, { status: 500 });
    }

    if (!data) {
      console.error('[Supabase Upload] No data returned from upload');
      return NextResponse.json({ error: 'No data returned from upload' }, { status: 500 });
    }

    // Generate public URL
    const { data: publicUrlData } = supabase.storage
      .from('pdfs')
      .getPublicUrl(data.path);

    if (!publicUrlData) {
      console.error('[Supabase Upload] Error generating public URL: No data returned');
      return NextResponse.json({ error: 'Error generating public URL: No data returned' }, { status: 500 });
    }

    console.log('[Supabase Upload] Successfully uploaded file and generated public URL');
    return NextResponse.json({ 
      success: true, 
      path: data.path,
      publicUrl: publicUrlData.publicUrl
    });
  } catch (error) {
    console.error('[Supabase Upload] Unexpected error:', error);
    return NextResponse.json({ error: 'Unexpected error occurred', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';