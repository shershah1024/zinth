// page.tsx

import { Suspense } from 'react';
import MedicationDashboardWrapper from '@/components/MedicationDashboardWrapper';
import { StreakMedication, StreakPastMedication, StreakTiming, StreakTimingStatus, TimingValue } from '@/types/StreakTypes';

interface RawMedication {
  id: number;
  medicine: string;
  before_after_food: string;
  start_date: string;
  end_date: string;
  streak: Record<string, Partial<Record<StreakTiming, boolean>>>;
  morning: TimingValue;
  afternoon: TimingValue;
  evening: TimingValue;
  night: TimingValue;
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

    // Convert boolean values to StreakTimingStatus
    const currentMedications: StreakMedication[] = currentMedicationsRaw.map(med => ({
      id: med.id,
      medicine: med.medicine,
      before_after_food: med.before_after_food,
      start_date: med.start_date,
      end_date: med.end_date,
      streak: Object.entries(med.streak).reduce((acc, [date, timings]) => {
        acc[date] = Object.entries(timings).reduce((timingAcc, [timing, value]) => {
          if (med[timing as StreakTiming] === 'true') {
            timingAcc[timing as StreakTiming] = value ? StreakTimingStatus.Taken : StreakTimingStatus.NotTaken;
          }
          return timingAcc;
        }, {} as Partial<Record<StreakTiming, StreakTimingStatus>>);
        return acc;
      }, {} as Record<string, Partial<Record<StreakTiming, StreakTimingStatus>>>),
      timings: {
        morning: med.morning,
        afternoon: med.afternoon,
        evening: med.evening,
        night: med.night
      }
    }));

    const pastMedications: StreakPastMedication[] = pastMedicationsRaw.map(med => ({
      id: med.id,
      medicine: med.medicine,
      start_date: med.start_date,
      end_date: med.end_date,
      timings: {
        morning: med.morning,
        afternoon: med.afternoon,
        evening: med.evening,
        night: med.night
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