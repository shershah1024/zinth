import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required Supabase environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Define types for the request body
interface TestComponent {
  component: string;
  value: number | string;
  unit: string;
  normal_range_min?: number;
  normal_range_max?: number;
  normal_range_text?: string;
}

interface TestResult {
  date: string;
  components: TestComponent[];
}

interface RequestBody {
  result: TestResult;
  publicUrl?: string;
}

export async function POST(request: NextRequest) {
  console.log('Received POST request to store test result');
  try {
    const requestBody: RequestBody = await request.json();
    console.log('Received request body:', JSON.stringify(requestBody, null, 2));

    const { result, publicUrl } = requestBody;

    if (!result || !result.date || !Array.isArray(result.components)) {
      console.error('Invalid test data structure');
      return NextResponse.json({ error: 'Invalid test data structure' }, { status: 400 });
    }

    const { date, components } = result;

    const testDataToInsert = components.map((component: TestComponent) => ({
      patient_number: '919885842349', // Replace with actual patient number logic
      test_id: crypto.randomUUID(),
      component: component.component,
      unit: component.unit,
      number_value: typeof component.value === 'number' ? component.value : null,
      text_value: typeof component.value === 'string' ? component.value : null,
      normal_range_min: component.normal_range_min,
      normal_range_max: component.normal_range_max,
      date: date,
      public_url: publicUrl || 'NOT_PROVIDED',
      normal_range_text: component.normal_range_text,
    }));

    console.log('Inserting data into Supabase...');
    const { data, error } = await supabase.from('test_results').insert(testDataToInsert);
    
    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    console.log('Data inserted successfully:', data);
    return NextResponse.json({ message: 'Test result stored successfully' });
  } catch (error) {
    console.error('Error storing test result:', error);
    return NextResponse.json({ error: 'Error storing test result' }, { status: 500 });
  }
}