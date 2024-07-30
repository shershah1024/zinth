// app/api/fetch-past-medications/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const STATIC_PATIENT_ID = '919885842349';

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_number', STATIC_PATIENT_ID)
      .lt('end_date', today)
      .order('end_date', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching past medications:', error);
    return NextResponse.json({ error: 'Error fetching past medications' }, { status: 500 });
  }
}