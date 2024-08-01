import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required Supabase environment variables');
}
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
  descriptive_name?: string;
}

interface RequestBody {
  results: TestResult[];
  publicUrl: string;
}

export async function POST(request: NextRequest) {
  console.log('Received POST request to store test results');
  try {
    const requestBody: RequestBody = await request.json();
    console.log('Received request body:', JSON.stringify(requestBody, null, 2));

    if (!Array.isArray(requestBody.results) || requestBody.results.length === 0) {
      console.error('Invalid test data structure: results array is missing or empty');
      return NextResponse.json({ error: 'Invalid test data structure: results array is missing or empty' }, { status: 400 });
    }

    const allTestDataToInsert = requestBody.results.flatMap((result: TestResult, index: number) => {
      if (!result.date || !Array.isArray(result.components)) {
        console.error(`Invalid test result structure at index ${index}:`, JSON.stringify(result, null, 2));
        return [];
      }

      return result.components.map((component: TestComponent) => ({
        patient_number: '919885842349', // Replace with actual patient number logic
        test_id: crypto.randomUUID(),
        component: component.component,
        unit: component.unit,
        number_value: typeof component.value === 'number' ? component.value : null,
        text_value: typeof component.value === 'string' ? component.value : null,
        normal_range_min: component.normal_range_min,
        normal_range_max: component.normal_range_max,
        date: result.date,
        public_url: requestBody.publicUrl,
        normal_range_text: component.normal_range_text,
      }));
    });

    if (allTestDataToInsert.length === 0) {
      console.error('No valid test data to insert');
      return NextResponse.json({ error: 'No valid test data to insert' }, { status: 400 });
    }

    console.log('Inserting data into Supabase:', JSON.stringify(allTestDataToInsert, null, 2));
    const { data, error } = await supabase.from('test_results').insert(allTestDataToInsert);
    
    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    console.log('Data inserted successfully:', data);
    return NextResponse.json({ message: 'Test results stored successfully' });
  } catch (error) {
    console.error('Error storing test results:', error);
    return NextResponse.json({ 
      error: 'Error storing test results', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}