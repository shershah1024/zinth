// app/old-imaging-results/page.tsx
import { createClient } from '@supabase/supabase-js';
import OldImagingResultsDashboard from '@/components/OldImagingResultsDashboard';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const PATIENT_NUMBER = '919885842349';

async function getOldImagingResults() {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const { data, error } = await supabase
    .from('imaging_results')
    .select('*')
    .eq('patient_number', PATIENT_NUMBER)
    .lt('date', oneYearAgo.toISOString())
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching older imaging results:', error);
    throw new Error('Failed to fetch older imaging results');
  }

  return data;
}

export default async function OldImagingResultsPage() {
  const oldResults = await getOldImagingResults();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Old Imaging Results</h1>
      <OldImagingResultsDashboard results={oldResults} />
    </div>
  );
}
