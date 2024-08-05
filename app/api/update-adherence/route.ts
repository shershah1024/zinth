// app/api/update-adherence/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  try {
    const { prescriptionId, date, timing, taken } = await req.json();
    console.log("teken is", taken)

    // First, fetch the medicine name from the prescriptions table
    const { data: prescriptionData, error: prescriptionError } = await supabase
      .from('prescriptions')
      .select('medicine')
      .eq('id', prescriptionId)
      .single();

    if (prescriptionError) throw prescriptionError;
    if (!prescriptionData) throw new Error('Prescription not found');

    const medicineName = prescriptionData.medicine;

    // Check if an entry already exists
    let { data: existingEntry, error: selectError } = await supabase
      .from('medication_streak')
      .select('*')
      .eq('prescription_id', prescriptionId)
      .eq('date', date)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 means no rows returned, which is fine
      throw selectError;
    }

    let result;
    if (existingEntry) {
      // If entry exists, update it 
      const { data, error: updateError } = await supabase
        .from('medication_streak')
        .update({ [timing]: taken })
        .eq('prescription_id', prescriptionId)
        .eq('date', date)
        .select();
      
      if (updateError) throw updateError;
      result = data;
    } else {
      // If entry doesn't exist, insert a new one
      const { data, error: insertError } = await supabase
        .from('medication_streak')
        .insert({
          prescription_id: prescriptionId,
          medicine_name: medicineName,
          date: date,
          [timing]: taken
        })
        .select();
      
      if (insertError) throw insertError;
      result = data;
    }

    // Fetch the updated streak data for the medication
    const { data: updatedStreak, error: streakError } = await supabase
      .from('medication_streak')
      .select('*')
      .eq('prescription_id', prescriptionId);

    if (streakError) throw streakError;

    return NextResponse.json({ 
      success: true, 
      data: result,
      updatedStreak: updatedStreak
    });
  } catch (error) {
    console.error('Error updating adherence:', error);
    return NextResponse.json({ error: 'Failed to update adherence' }, { status: 500 });
  }
}