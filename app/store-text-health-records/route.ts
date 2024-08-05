import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';


const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

interface TestComponent {
  component: string;
  value: number | string;
  unit: string;
  normal_range_min?: number;
  normal_range_max?: number;
  normal_range_text?: string;
}

interface AnalysisResult {
  components: TestComponent[];
  date: string;
}

interface RequestBody {
  results: AnalysisResult;
  publicUrl: string;
}

async function storeResults(result: AnalysisResult, public_url: string): Promise<void> {
  console.log(`[Result Storage] Storing results`);

  const test_id = uuidv4();
  const PATIENT_NUMBER="919885842349"
  const dataToInsert = result.components.map(component => ({
    patient_number: PATIENT_NUMBER,
    test_id: test_id,
    component: component.component,
    unit: component.unit,
    number_value: typeof component.value === 'number' ? component.value : null,
    text_value: typeof component.value === 'string' ? component.value : null,
    normal_range_min: component.normal_range_min,
    normal_range_max: component.normal_range_max,
    date: result.date,
    normal_range_text: component.normal_range_text,
    public_url: public_url === "None" ? null : public_url
  }));

  const { data, error } = await supabase
    .from('medical_test_results')
    .insert(dataToInsert);

  if (error) {
    console.error('[Result Storage] Failed to store results:', error);
    throw new Error(`Storage failed: ${error.message}`);
  }

  console.log(`[Result Storage] Successfully stored ${dataToInsert.length} results`);
}

export async function POST(request: NextRequest) {
  try {
    const requestBody: RequestBody = await request.json();
    console.log('Received request body:', JSON.stringify(requestBody, null, 2));

    if (!requestBody.results || !requestBody.results.components || requestBody.results.components.length === 0) {
      console.error('Invalid input: results are missing or empty');
      return NextResponse.json({ error: 'Valid results are required' }, { status: 400 });
    }

    console.log(`Storing medical report results...`);

    await storeResults(requestBody.results, requestBody.publicUrl);

    return NextResponse.json({ 
      message: 'Medical report results stored successfully', 
      result: requestBody.results 
    });
  } catch (error) {
    console.error('Error storing medical report results:', error);
    return NextResponse.json({ 
      error: 'Error storing medical report results', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}