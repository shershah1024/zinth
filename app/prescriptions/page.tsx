// app/prescriptions/page.tsx

import { Suspense } from 'react';
import MedicationDashboardWrapper from '@/components/MedicationDashboardWrapper';

type StreakTiming = 'Morning' | 'Afternoon' | 'Evening' | 'Night';
type TimingValue = 'true' | 'false';
type StreakValue = 'TRUE' | 'FALSE';

interface StreakMedication {
  id: number;
  medicine: string;
  before_after_food: string;
  start_date: string;
  end_date: string;
  timings: Partial<Record<StreakTiming, TimingValue>>;
  streak: Record<string, {
    morning: StreakValue;
    afternoon: StreakValue;
    evening: StreakValue;
    night: StreakValue;
  }>;
  public_url?: string;
}

interface StreakPastMedication {
  id: number;
  medicine: string;
  start_date: string;
  end_date: string;
  timings: Partial<Record<StreakTiming, TimingValue>>;
}

interface RawMedication {
  id: number;
  medicine: string;
  before_after_food: string;
  start_date: string;
  end_date: string;
  streak: Record<string, {
    morning: StreakValue;
    afternoon: StreakValue;
    evening: StreakValue;
    night: StreakValue;
  }>;
  morning: TimingValue;
  afternoon: TimingValue;
  evening: TimingValue;
  night: TimingValue;
  public_url?: string;
}

interface RawPastMedication {
  id: number;
  medicine: string;
  start_date: string;
  end_date: string;
  morning: TimingValue;
  afternoon: TimingValue;
  evening: TimingValue;
  night: TimingValue;
}

async function fetchMedicationData() {
  try {
    const currentMedicationsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/fetch-current-medications`, { cache: 'no-store' });
    const pastMedicationsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/fetch-past-medications`, { cache: 'no-store' });

    if (!currentMedicationsRes.ok || !pastMedicationsRes.ok) {
      throw new Error('Failed to fetch medication data');
    }

    const currentMedicationsRaw: RawMedication[] = await currentMedicationsRes.json();
    const pastMedicationsRaw: RawPastMedication[] = await pastMedicationsRes.json();

    const currentMedications: StreakMedication[] = currentMedicationsRaw.map(med => ({
      id: med.id,
      medicine: med.medicine,
      before_after_food: med.before_after_food,
      start_date: med.start_date,
      end_date: med.end_date,
      streak: med.streak, // No need to transform, as it's already in the correct format
      timings: {
        Morning: med.morning,
        Afternoon: med.afternoon,
        Evening: med.evening,
        Night: med.night
      },
      public_url: med.public_url
    }));

    const pastMedications: StreakPastMedication[] = pastMedicationsRaw.map(med => ({
      id: med.id,
      medicine: med.medicine,
      start_date: med.start_date,
      end_date: med.end_date,
      timings: {
        Morning: med.morning,
        Afternoon: med.afternoon,
        Evening: med.evening,
        Night: med.night
      }
    }));

    return { 
      currentMedications, 
      pastMedications 
    };
  } catch (error) {
    console.error('Error fetching medication data:', error);
    throw error;
  }
}

export default async function MedicationPage() {
  try {
    const { currentMedications, pastMedications } = await fetchMedicationData();

    return (
      <Suspense fallback={<div>Loading...</div>}>
        <MedicationDashboardWrapper 
          initialCurrentMedications={currentMedications}
          initialPastMedications={pastMedications}
        />
      </Suspense>
    );
  } catch (error) {
    return <div>Error: Failed to load medication data. Please try again later.</div>;
  }
}