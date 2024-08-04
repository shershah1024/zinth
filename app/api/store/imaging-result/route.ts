import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required Supabase environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request: NextRequest) {
  try {
    const { result, publicUrl } = await request.json();
    const patient_number= "919885842349";


    const { error } = await supabase.from('imaging_results').insert({
      patient_number,
      date: result.date,
      test: result.test_title,
      comments: result.observations,
      doctor: result.doctor_name,
      public_url: publicUrl,
    });

    if (error) throw error;

    return NextResponse.json({ message: 'Imaging result stored successfully' });
  } catch (error) {
    console.error('Error storing imaging result:', error);
    return NextResponse.json({ error: 'Error storing imaging result' }, { status: 500 });
  }
}