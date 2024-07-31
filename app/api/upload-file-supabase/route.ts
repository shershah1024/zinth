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
  console.log('[Supabase Upload] Received request for signed URL');
  try {
    const { filename, contentType, size } = await request.json();
    console.log(`[Supabase Upload] File details - Name: ${filename}, Type: ${contentType}, Size: ${size}`);

    if (!filename || !contentType) {
      console.error('[Supabase Upload] Missing filename or contentType');
      return NextResponse.json({ error: 'Missing filename or contentType' }, { status: 400 });
    }

    const fileName = `${Date.now()}_${filename}`;
    console.log(`[Supabase Upload] Generated filename: ${fileName}`);

    const { data, error } = await supabase.storage
      .from('pdfs')
      .createSignedUploadUrl(fileName);

    if (error) {
      console.error('[Supabase Upload] Error creating signed URL:', error);
      return NextResponse.json({ error: `Error creating signed URL: ${error.message}` }, { status: 500 });
    }

    if (!data) {
      console.error('[Supabase Upload] No data returned from createSignedUploadUrl');
      return NextResponse.json({ error: 'No data returned from createSignedUploadUrl' }, { status: 500 });
    }

    console.log('[Supabase Upload] Successfully created signed URL');
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Supabase Upload] Unexpected error:', error);
    return NextResponse.json({ error: 'Unexpected error occurred' }, { status: 500 });
  }
}