import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const revalidate = 30;


if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const PATIENT_NUMBER = '919885842349';

export async function GET(request: NextRequest) {
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { data, error, count } = await supabase
      .from('imaging_results')
      .select('*', { count: 'exact' })
      .eq('patient_number', PATIENT_NUMBER)
      .lt('date', oneYearAgo.toISOString())
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching older imaging results:', error);
      return NextResponse.json({ error: 'Failed to fetch older imaging results' }, { status: 500 });
    }

    console.log(`Fetched ${data?.length} older records out of ${count} total older records`);

    return NextResponse.json({
      data: data,
      fetchedCount: data?.length,
      totalCount: count,
      message: 'Older imaging results (more than a year old) fetched successfully'
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}