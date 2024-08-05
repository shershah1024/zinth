// app/api/fetch-current-medications/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 10;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const STATIC_PATIENT_ID = '919885842349';

function isTrue(value: any): boolean {
  return value === true || value === 'TRUE';
}

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log('Fetching medications for date:', today);

    const { data: currentMeds, error: currentError } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_number', STATIC_PATIENT_ID)
      .gte('end_date', today)
      .order('start_date', { ascending: false });
    
    if (currentError) throw currentError;
    console.log('Current Medications:', JSON.stringify(currentMeds, null, 2));

    // Fetch streak data for each medication
    const medicationsWithStreak = await Promise.all(currentMeds.map(async (med) => {
      console.log(`Fetching streak data for medication ID: ${med.id}`);
      const { data: streakData, error: streakError } = await supabase
        .from('medication_streak')
        .select('*')
        .eq('prescription_id', med.id);

      if (streakError) {
        console.error(`Error fetching streak for medication ${med.id}:`, streakError);
        return { ...med, streak: {} };
      }

      console.log(`Streak data for medication ${med.id}:`, JSON.stringify(streakData, null, 2));

      // Format streak data
      const formattedStreak = streakData.reduce((acc, entry) => {
        acc[entry.date] = {
          morning: isTrue(entry.morning),
          afternoon: isTrue(entry.afternoon),
          evening: isTrue(entry.evening),
          night: isTrue(entry.night)
        };
        return acc;
      }, {});

      return { ...med, streak: formattedStreak };
    }));

    console.log('Medications with streak:', JSON.stringify(medicationsWithStreak, null, 2));

    return NextResponse.json(medicationsWithStreak);
  } catch (error) {
    console.error('Error fetching current medications:', error);
    return NextResponse.json({ error: 'Error fetching current medications' }, { status: 500 });
  }
}