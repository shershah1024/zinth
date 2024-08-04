import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required Supabase environment variables');
  throw new Error('Missing required Supabase environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request: NextRequest) {
  console.log('Received POST request');
  try {
    const { result, publicUrl } = await request.json();
    console.log('Parsed request body:', { result, publicUrl });

    const patient_number = "919885842349";
    console.log('Patient number:', patient_number);

    const dataToInsert = {
      patient_number,
      date: result.date,
      test: result.test_title,
      comments: result.observations,
      doctor: result.doctor_name,
      public_url: publicUrl,
    };
    console.log('Data to be inserted:', dataToInsert);

    const { data, error } = await supabase.from('imaging_results').insert(dataToInsert).select();

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    console.log('Insert successful. Inserted data:', data);

    return NextResponse.json({ message: 'Imaging result stored successfully', data });
  } catch (error: unknown) {
    console.error('Error storing imaging result:', error);
    
    if (typeof error === 'object' && error !== null && 'message' in error) {
      return NextResponse.json({ error: 'Database error', details: (error as { message: string }).message }, { status: 500 });
    } else if (error instanceof Error) {
      return NextResponse.json({ error: 'Unexpected error', details: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
    }
  }
}