'use client'
import React, { useState, useEffect } from 'react';
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
    // Consolidate current medications
    const consolidatedCurrentMeds = initialCurrentMedications.reduce((acc, med) => {
      const existingMed = acc.find(m => m.medicine === med.medicine);
      if (existingMed) {
        // Merge streaks and timings
        existingMed.streak = { ...existingMed.streak, ...med.streak };
        existingMed.timings = {
          morning: existingMed.timings.morning === 'true' || med.timings.morning === 'true' ? 'true' : 'false',
          afternoon: existingMed.timings.afternoon === 'true' || med.timings.afternoon === 'true' ? 'true' : 'false',
          evening: existingMed.timings.evening === 'true' || med.timings.evening === 'true' ? 'true' : 'false',
          night: existingMed.timings.night === 'true' || med.timings.night === 'true' ? 'true' : 'false',
        };
        // Update start and end dates if necessary
        existingMed.start_date = new Date(existingMed.start_date) < new Date(med.start_date) ? existingMed.start_date : med.start_date;
        existingMed.end_date = new Date(existingMed.end_date) > new Date(med.end_date) ? existingMed.end_date : med.end_date;
      } else {
        acc.push({ ...med });
      }
      return acc;
    }, [] as StreakMedication[]);

    setCurrentMedications(consolidatedCurrentMeds);

    // Consolidate past medications
    const consolidatedPastMeds = initialPastMedications.reduce((acc, med) => {
      const existingMed = acc.find(m => m.medicine === med.medicine);
      if (existingMed) {
        // Update start and end dates if necessary
        existingMed.start_date = new Date(existingMed.start_date) < new Date(med.start_date) ? existingMed.start_date : med.start_date;
        existingMed.end_date = new Date(existingMed.end_date) > new Date(med.end_date) ? existingMed.end_date : med.end_date;
      } else {
        acc.push({ ...med });
      }
      return acc;
    }, [] as StreakPastMedication[]);

    setPastMedications(consolidatedPastMeds);
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