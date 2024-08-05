// app/api/update-adherence/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  try {
    const { patientNumber, medicationName, date, timing, taken } = await req.json();

    if (!patientNumber || !medicationName || !date || !timing || taken === undefined) {
      throw new Error('Missing required fields');
    }

    // Check if the prescription is current
    const { data: prescriptionData, error: prescriptionError } = await supabase
      .from('prescriptions')
      .select('id')
      .eq('patient_number', patientNumber)
      .eq('medicine', medicationName)
      .lte('start_date', date)
      .gte('end_date', date)
      .single();

    if (prescriptionError) throw prescriptionError;
    if (!prescriptionData) {
      return NextResponse.json({ error: 'Prescription not found or not current' }, { status: 400 });
    }

    const prescriptionId = prescriptionData.id;

    // Check if an entry already exists
    const { data: existingEntry, error: selectError } = await supabase
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
          medicine_name: medicationName,
          date: date,
          [timing]: taken
        })
        .select();
      
      if (insertError) throw insertError;
      result = data;
    }

    return NextResponse.json({ 
      success: true, 
      data: result
    });
  } catch (error) {
    console.error('Error updating adherence:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}