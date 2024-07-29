import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AnalysisResult } from '@/types/medical';
import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required Supabase environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request: NextRequest) {
  console.log('Received POST request to store test result');
  try {
    const requestBody = await request.json();
    console.log('Received request body:', JSON.stringify(requestBody, null, 2));

    const { result, publicUrl } = requestBody;
    const analysisResult: AnalysisResult = result;

    console.log('Analysis Result:', JSON.stringify(analysisResult, null, 2));
    console.log('Public URL:', publicUrl);

    if (!analysisResult || !Array.isArray(analysisResult.components)) {
      console.error('Invalid analysis result structure');
      return NextResponse.json({ error: 'Invalid analysis result structure' }, { status: 400 });
    }

    const testDataToInsert = analysisResult.components.map(component => {
      const testData = {
        patient_number: '919885842349', // This should be dynamically set
        test_id: crypto.randomUUID(),
        component: component.component,
        unit: component.unit,
        number_value: typeof component.value === 'number' ? component.value : null,
        text_value: typeof component.value === 'string' ? component.value : null,
        normal_range_min: component.normal_range_min,
        normal_range_max: component.normal_range_max,
        date: analysisResult.date,
        public_url: publicUrl,
        normal_range_text: component.normal_range_text,
      };
      console.log('Prepared test data for component:', JSON.stringify(testData, null, 2));
      return testData;
    });

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