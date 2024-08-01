// app/api/fetch-imaging-results/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Static patient number
const PATIENT_NUMBER = '919885842349';

export async function GET(request: NextRequest) {
  try {
    // Fetch records for the specific patient number
    const { data, error } = await supabase
      .from('imaging_results')
      .select('*')
      .eq('patient_number', PATIENT_NUMBER)
      .order('date', { ascending: false }); // Optional: order by date, most recent first

    if (error) {
      console.error('Error fetching imaging results:', error);
      return NextResponse.json({ error: 'Failed to fetch imaging results' }, { status: 500 });
    }

    // If successful, return the data
    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}