import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MedicalTest, ProcessedTest } from '@/types/medicalTests';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required Supabase environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request: NextRequest) {
  console.log('Received GET request for test results');
  
  try {
    const { data, error } = await supabase
      .from('test_results')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      console.log('No test results found');
      return NextResponse.json([]);
    }

    console.log(`Fetched ${data.length} test results`);

    // Process the data to match the format expected by the component
    const processedData = (data as MedicalTest[]).reduce<ProcessedTest[]>((acc, test) => {
      const normalizedComponent = test.component.toLowerCase().trim();
      const existingTestIndex = acc.findIndex(t => t.name.toLowerCase().trim() === normalizedComponent);
      
      if (existingTestIndex !== -1) {
        acc[existingTestIndex].history.push({
          date: test.date,
          value: test.number_value ?? test.text_value ?? ''
        });
        // Update latest value and date if this test is more recent
        if (new Date(test.date) > new Date(acc[existingTestIndex].latestDate)) {
          acc[existingTestIndex].latestValue = test.number_value ?? test.text_value ?? '';
          acc[existingTestIndex].latestDate = test.date;
        }
      } else {
        acc.push({
          id: test.id,
          name: test.component, // Keep the original case for display
          latestValue: test.number_value ?? test.text_value ?? '',
          unit: test.unit,
          latestDate: test.date,
          normalRange: test.normal_range_text ?? `${test.normal_range_min}-${test.normal_range_max}`,
          history: [{
            date: test.date,
            value: test.number_value ?? test.text_value ?? ''
          }]
        });
      }
      
      return acc;
    }, []);

    console.log(`Processed ${processedData.length} unique test components`);
    return NextResponse.json(processedData);
  } catch (error) {
    console.error('Unexpected error in GET /api/test-results:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}