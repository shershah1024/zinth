//app/api/medication-management


import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Define types for your Supabase tables
interface Prescription {
  id: number;
  medicine: string;
  before_after_food: string;
  start_date: string;
  end_date: string;
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
  night: boolean;
}

interface MedicationStreak {
  prescription_id: number;
  medicine_name: string;
  date: string;
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
  night: boolean;
}

// Create a more strongly typed Supabase client
const supabase = createClient<{
  prescriptions: Prescription;
  medication_streak: MedicationStreak;
}>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    await handleGetCurrentMedications(req, res);
  } else if (req.method === 'POST') {
    await handleUpdateAdherence(req, res);
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleGetCurrentMedications(req: NextApiRequest, res: NextApiResponse) {
  try {
    const medications = await fetchCurrentMedications();
    res.status(200).json(medications);
  } catch (error) {
    console.error('Error fetching current medications:', error);
    res.status(500).json({ message: 'Error fetching current medications' });
  }
}

async function handleUpdateAdherence(req: NextApiRequest, res: NextApiResponse) {
  const { prescriptionId, medicineName, date, timing, taken } = req.body;
  try {
    const updatedStreak = await updateStreakEntry(prescriptionId, medicineName, date, timing, taken);
    res.status(200).json(updatedStreak);
  } catch (error) {
    console.error('Error updating medication adherence:', error);
    res.status(500).json({ message: 'Error updating medication adherence' });
  }
}

async function fetchCurrentMedications() {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('prescriptions')
    .select(`
      *,
      medication_streak!inner (
        date,
        morning,
        afternoon,
        evening,
        night
      )
    `)
    .gte('end_date', today)
    .gte('medication_streak.date', today.slice(0, 7) + '-01') // Start of the current month
    .lte('medication_streak.date', today)
    .order('start_date', { ascending: false });

  if (error) throw error;

  return data.map(med => {
    const streak: Record<string, boolean> = {};
    med.medication_streak.forEach((s: any) => {
      ['morning', 'afternoon', 'evening', 'night'].forEach(timing => {
        if (med[timing as keyof Prescription]) {
          streak[`${s.date}-${timing}`] = s[timing as keyof MedicationStreak];
        }
      });
    });
    return {
      id: med.id,
      medicine: med.medicine,
      before_after_food: med.before_after_food,
      start_date: med.start_date,
      end_date: med.end_date,
      morning: Boolean(med.morning),
      afternoon: Boolean(med.afternoon),
      evening: Boolean(med.evening),
      night: Boolean(med.night),
      streak
    };
  });
}

async function updateStreakEntry(
  prescriptionId: number, 
  medicineName: string, 
  date: string, 
  timing: 'morning' | 'afternoon' | 'evening' | 'night', 
  taken: boolean
) {
  const { data, error } = await supabase
    .from('medication_streak')
    .update({ [timing]: taken })
    .match({ 
      prescription_id: prescriptionId, 
      medicine_name: medicineName,
      date: date 
    })
    .select();

  if (error) {
    console.error('Error updating streak:', error);
    throw error;
  }
  
  if (data && data.length === 0) {
    console.warn('No streak entry found to update. Creating new entry.');
    return createStreakEntry(prescriptionId, medicineName, date, { [timing]: taken });
  }
  return data;
}

async function createStreakEntry(
  prescriptionId: number, 
  medicineName: string, 
  date: string,
  initialState: Partial<Record<'morning' | 'afternoon' | 'evening' | 'night', boolean>> = {}
) {
  const { data, error } = await supabase
    .from('medication_streak')
    .insert({
      prescription_id: prescriptionId,
      medicine_name: medicineName,
      date: date,
      morning: initialState.morning || false,
      afternoon: initialState.afternoon || false,
      evening: initialState.evening || false,
      night: initialState.night || false
    })
    .select();

  if (error) {
    console.error('Error creating streak entry:', error);
    throw error;
  }
  return data;
}