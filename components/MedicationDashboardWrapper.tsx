'use client'

import React, { useState, useEffect, useCallback } from 'react';
import MedicationDashboard from './MedicationDashboard';

// Define the types more explicitly
type StreakTiming = 'Morning' | 'Afternoon' | 'Evening' | 'Night';
type TimingValue = 'true' | 'false';

enum StreakTimingStatus {
  Taken = 'Taken',
  NotTaken = 'NotTaken'
}

interface StreakMedication {
  id: number;
  medicine: string;
  before_after_food: string;
  start_date: string;
  end_date: string;
  timings: Record<StreakTiming, TimingValue>;
  streak: Record<string, Partial<Record<StreakTiming, StreakTimingStatus>>>;
  public_url?: string; // Add this line to include the prescription URL
}

interface StreakPastMedication {
  id: number;
  medicine: string;
  start_date: string;
  end_date: string;
  timings: Record<StreakTiming, TimingValue>;
}

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
    const consolidateCurrentMedications = (medications: StreakMedication[]): StreakMedication[] => {
      return medications.reduce((acc, med) => {
        const existingMed = acc.find(m => m.medicine === med.medicine);
        if (existingMed) {
          existingMed.streak = { ...existingMed.streak, ...med.streak };
          existingMed.timings = {
            Morning: existingMed.timings.Morning === 'true' || med.timings.Morning === 'true' ? 'true' : 'false',
            Afternoon: existingMed.timings.Afternoon === 'true' || med.timings.Afternoon === 'true' ? 'true' : 'false',
            Evening: existingMed.timings.Evening === 'true' || med.timings.Evening === 'true' ? 'true' : 'false',
            Night: existingMed.timings.Night === 'true' || med.timings.Night === 'true' ? 'true' : 'false',
          };
          existingMed.start_date = new Date(existingMed.start_date) < new Date(med.start_date) ? existingMed.start_date : med.start_date;
          existingMed.end_date = new Date(existingMed.end_date) > new Date(med.end_date) ? existingMed.end_date : med.end_date;
          // Preserve the public_url if it exists
          if (med.public_url) {
            existingMed.public_url = med.public_url;
          }
        } else {
          acc.push({ ...med });
        }
        return acc;
      }, [] as StreakMedication[]);
    };

    const consolidatePastMedications = (medications: StreakPastMedication[]): StreakPastMedication[] => {
      return medications.reduce((acc, med) => {
        const existingMed = acc.find(m => m.medicine === med.medicine);
        if (existingMed) {
          existingMed.start_date = new Date(existingMed.start_date) < new Date(med.start_date) ? existingMed.start_date : med.start_date;
          existingMed.end_date = new Date(existingMed.end_date) > new Date(med.end_date) ? existingMed.end_date : med.end_date;
        } else {
          acc.push({ ...med });
        }
        return acc;
      }, [] as StreakPastMedication[]);
    };

    setCurrentMedications(consolidateCurrentMedications(initialCurrentMedications));
    setPastMedications(consolidatePastMedications(initialPastMedications));
  }, [initialCurrentMedications, initialPastMedications]);

  const handleUpdateAdherence = useCallback(async (medicationId: number, date: string, timing: StreakTiming, taken: boolean) => {
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
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="bg-blue-50 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-blue-600 mb-4">Error</h2>
          <p className="text-gray-700">{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return (
    <MedicationDashboard 
      currentMedications={currentMedications}
      pastMedications={pastMedications}
      onUpdateAdherence={handleUpdateAdherence}
    />
  );
}