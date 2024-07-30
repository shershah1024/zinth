// components/MedicationDashboardWrapper.tsx

'use client'

import { useState, useEffect } from 'react';
import MedicationDashboard from './MedicationDashboard';

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

interface MedicationDashboardWrapperProps {
  initialCurrentMedications: Medication[];
  initialPastMedications: PastMedication[];
}

export default function MedicationDashboardWrapper({
  initialCurrentMedications,
  initialPastMedications
}: MedicationDashboardWrapperProps) {
  const [currentMedications, setCurrentMedications] = useState<Medication[] | null>(null);
  const [pastMedications, setPastMedications] = useState<PastMedication[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentMedications(initialCurrentMedications);
    setPastMedications(initialPastMedications);
  }, [initialCurrentMedications, initialPastMedications]);

  const handleUpdateAdherence = async (medicationId: number, date: string, timing: Timing, taken: boolean) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/update-adherence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prescriptionId: medicationId, date, timing, taken }),
      });
      if (!response.ok) throw new Error('Failed to update adherence');
      
      // Optimistically update the UI
      setCurrentMedications(prevMeds => 
        prevMeds?.map(med => 
          med.id === medicationId 
            ? { 
                ...med, 
                streak: { 
                  ...med.streak,
                  [date]: {
                    ...med.streak[date],
                    [timing]: taken
                  }
                } 
              }
            : med
        ) ?? null
      );
    } catch (error) {
      console.error('Error updating adherence:', error);
      setError('Failed to update adherence. Please try again.');
    }
  };

  if (error) {
    return <div className="text-red-500 text-center py-4">{error}</div>;
  }

  return (
    <MedicationDashboard 
      currentMedications={currentMedications}
      pastMedications={pastMedications}
      onUpdateAdherence={handleUpdateAdherence}
    />
  );
}