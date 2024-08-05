// app/api/fetch-current-medications/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const revalidate = 10;


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const STATIC_PATIENT_ID = '919885842349';

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: currentMeds, error: currentError } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_number', STATIC_PATIENT_ID)
      .gte('end_date', today)
      .order('start_date', { ascending: false });
    
    if (currentError) throw currentError;
    console.log('Current Medications:', currentMeds);



    // Fetch streak data for each medication
    const streakPromises = currentMeds.map(async (med) => {
      const { data: streakData, error: streakError } = await supabase
        .from('medication_streak')
        .select('*')
        .eq('prescription_id', med.id);

      if (streakError) throw streakError;

      return { ...med, streak: streakData };
    });

    const medicationsWithStreak = await Promise.all(streakPromises);

    return NextResponse.json(medicationsWithStreak);
  } catch (error) {
    console.error('Error fetching current medications:', error);
    return NextResponse.json({ error: 'Error fetching current medications' }, { status: 500 });
  }
}