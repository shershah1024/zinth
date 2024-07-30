// components/MedicationDashboardWrapper.tsx

'use client'

import { useState, useEffect } from 'react';
import MedicationDashboard from './MedicationDashboard';
import { StreakMedication, StreakPastMedication, StreakTiming, StreakTimingStatus, TimingValue } from '@/types/StreakTypes';

interface MedicationDashboardWrapperProps {
  initialCurrentMedications: StreakMedication[];
  initialPastMedications: StreakPastMedication[];
}

export default function MedicationDashboardWrapper({
  initialCurrentMedications,
  initialPastMedications
}: MedicationDashboardWrapperProps) {
  const [currentMedications, setCurrentMedications] = useState<StreakMedication[] | null>(null);
  const [pastMedications, setPastMedications] = useState<StreakPastMedication[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentMedications(initialCurrentMedications);
    setPastMedications(initialPastMedications);
  }, [initialCurrentMedications, initialPastMedications]);

  const handleUpdateAdherence = async (medicationId: number, date: string, timing: StreakTiming, taken: boolean) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/update-adherence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prescriptionId: medicationId, 
          date, 
          timing, 
          status: taken ? StreakTimingStatus.Taken : StreakTimingStatus.NotTaken 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update adherence');
      }
      
      const { updatedStreak } = await response.json();
      
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
                    [timing]: taken ? StreakTimingStatus.Taken : StreakTimingStatus.NotTaken
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