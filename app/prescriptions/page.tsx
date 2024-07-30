import { Suspense } from 'react';
import MedicationDashboardWrapper from '@/components/MedicationDashboardWrapper';

type Timing = 'morning' | 'afternoon' | 'evening' | 'night';

interface Medication {
  id: number;
  medicine: string;
  before_after_food: string;
  start_date: string;
  end_date: string;
  streak: Record<string, Record<Timing, boolean>>;
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
  night: boolean;
}

interface PastMedication {
  id: number;
  medicine: string;
  start_date: string;
  end_date: string;
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
  night: boolean;
}

async function fetchMedicationData() {
  try {
    const currentMedicationsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/fetch-current-medications`, { cache: 'no-store' });
    const pastMedicationsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/fetch-past-medications`, { cache: 'no-store' });

    if (!currentMedicationsRes.ok || !pastMedicationsRes.ok) {
      throw new Error('Failed to fetch medication data');
    }

    const currentMedications: Medication[] = await currentMedicationsRes.json();
    const pastMedications: PastMedication[] = await pastMedicationsRes.json();

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