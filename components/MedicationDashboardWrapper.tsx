'use client'

import React, { useState, useEffect, useCallback } from 'react';
import MedicationDashboard from './MedicationDashboard';

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

interface MedicationDashboardWrapperProps {
  initialCurrentMedications: StreakMedication[];
  initialPastMedications: StreakPastMedication[];
}

function convertTimingToBoolean(value: TimingValue | undefined): boolean {
  return value === 'true';
}

function convertStreakToBoolean(value: StreakValue | undefined): boolean {
  return value === 'TRUE';
}

function booleanToStreakValue(value: boolean): StreakValue {
  return value ? 'TRUE' : 'FALSE';
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
            Morning: convertTimingToBoolean(existingMed.timings.Morning) || convertTimingToBoolean(med.timings.Morning) ? 'true' : 'false',
            Afternoon: convertTimingToBoolean(existingMed.timings.Afternoon) || convertTimingToBoolean(med.timings.Afternoon) ? 'true' : 'false',
            Evening: convertTimingToBoolean(existingMed.timings.Evening) || convertTimingToBoolean(med.timings.Evening) ? 'true' : 'false',
            Night: convertTimingToBoolean(existingMed.timings.Night) || convertTimingToBoolean(med.timings.Night) ? 'true' : 'false',
          };
          existingMed.start_date = new Date(existingMed.start_date) < new Date(med.start_date) ? existingMed.start_date : med.start_date;
          existingMed.end_date = new Date(existingMed.end_date) > new Date(med.end_date) ? existingMed.end_date : med.end_date;
          if (med.public_url) {
            existingMed.public_url = med.public_url;
          }
        } else {
          acc.push(med);
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
          timing: timing.toLowerCase(), 
          taken: booleanToStreakValue(taken)  // Convert to 'TRUE' or 'FALSE'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update adherence');
      }
      
      const { success } = await response.json();
      
      if (success) {
        setCurrentMedications(prevMeds => 
          prevMeds?.map(med => 
            med.id === medicationId 
              ? { 
                  ...med, 
                  streak: {
                    ...med.streak,
                    [date]: {
                      ...med.streak[date],
                      [timing.toLowerCase()]: booleanToStreakValue(taken)
                    }
                  }
                }
              : med
          ) ?? null
        );
      } else {
        throw new Error('Failed to update adherence');
      }
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