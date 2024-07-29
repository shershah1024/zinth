// app/api/test/add/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Define the expected request body structure
interface AddTestResultRequest {
  patient_id: string;
  test_name: string;
  value: number;
  unit: string;
  test_date: string;
  normal_range_min: number;
  normal_range_max: number;
}

export async function POST(request: Request) {
  try {
    const body: AddTestResultRequest = await request.json();

    // Validate the request body
    if (!body.patient_id || !body.test_name || body.value === undefined || !body.unit || !body.test_date) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Insert the new test result
    const { data, error } = await supabase
      .from('test_results')
      .insert([
        {
          patient_id: body.patient_id,
          test_name: body.test_name,
          value: body.value,
          unit: body.unit,
          test_date: body.test_date,
          normal_range_min: body.normal_range_min,
          normal_range_max: body.normal_range_max,
        }
      ])
      .select();

    if (error) throw error;

    return NextResponse.json({ message: 'Test result added successfully', data }, { status: 201 });
  } catch (error) {
    console.error('Error adding test result:', error);
    return NextResponse.json({ message: 'An error occurred while adding the test result' }, { status: 500 });
  }
}