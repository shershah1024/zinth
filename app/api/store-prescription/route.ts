import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required Supabase environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface MedicineTimes {
  morning: string;
  afternoon: string;
  evening: string;
  night: string;
}

interface Medicine {
  medicine: string;
  before_after_food: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  medicine_times: MedicineTimes;
}

interface PrescriptionData {
  prescription_date: string;
  doctor: string;
  medicines: Medicine[];
  public_url: string;
}

interface RequestBody {
  prescription: PrescriptionData;
}

export async function POST(request: NextRequest) {
  console.log('Received POST request to store prescription');
  try {
    const requestBody: RequestBody = await request.json();
    console.log('Received request body:', JSON.stringify(requestBody, null, 2));

    const { prescription } = requestBody;

    if (!prescription || !Array.isArray(prescription.medicines) || prescription.medicines.length === 0) {
      console.error('Invalid prescription data structure');
      return NextResponse.json({ error: 'Invalid prescription data structure' }, { status: 400 });
    }

    // Generate a UUID for this prescription
    const prescriptionUuid = crypto.randomUUID();

    const prescriptionDataToInsert = prescription.medicines.map(medicine => ({
      prescription_date: prescription.prescription_date,
      doctor: prescription.doctor,
      public_url: prescription.public_url,
      patient_number: "919885842349", // Hardcoded patient number
      prescription_uuid: prescriptionUuid,
      medicine: medicine.medicine,
      before_after_food: medicine.before_after_food,
      start_date: medicine.start_date,
      end_date: medicine.end_date,
      notes: medicine.notes,
      morning: medicine.medicine_times.morning,
      afternoon: medicine.medicine_times.afternoon,
      evening: medicine.medicine_times.evening,
      night: medicine.medicine_times.night
    }));

    console.log('Inserting data into Supabase...');
    const { data, error } = await supabase.from('prescriptions').insert(prescriptionDataToInsert);
    
    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    console.log('Data inserted successfully:', data);
    return NextResponse.json({ message: 'Prescription stored successfully', prescription_uuid: prescriptionUuid });
  } catch (error) {
    console.error('Error storing prescription:', error);
    return NextResponse.json({ 
      error: 'Error storing prescription', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}