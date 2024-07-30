// components/MedicationDashboard.tsx

'use client'

import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

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

interface MedicationDashboardProps {
  currentMedications: Medication[] | null;
  pastMedications: PastMedication[] | null;
  onUpdateAdherence: (medicationId: number, date: string, timing: Timing, taken: boolean) => void;
}

const MedicationDashboard: React.FC<MedicationDashboardProps> = ({ 
  currentMedications, 
  pastMedications, 
  onUpdateAdherence 
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [expandedMedication, setExpandedMedication] = useState<number | null>(null);
  const [showPastMedications, setShowPastMedications] = useState<boolean>(false);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const getActiveTimes = (medication: Medication | PastMedication): Timing[] => {
    return ['morning', 'afternoon', 'evening', 'night'].filter(time => medication[time as Timing]) as Timing[];
  };

  const renderCheckbox = (medication: Medication, date: string) => {
    const activeTimes = getActiveTimes(medication);
    return (
      <div className="flex flex-wrap">
        {activeTimes.map(timing => {
          const isChecked = medication.streak[date]?.[timing] ?? false;
          return (
            <label key={timing} className="inline-flex items-center mr-4">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-blue-600"
                checked={isChecked}
                onChange={() => onUpdateAdherence(medication.id, date, timing, !isChecked)}
              />
              <span className="ml-2 capitalize">{timing}</span>
            </label>
          );
        })}
      </div>
    );
  };

  const renderStreak = (medication: Medication) => {
    const days = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    });

    const activeTimes = getActiveTimes(medication);

    return (
      <div className="grid grid-cols-7 gap-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-bold">{day}</div>
        ))}
        {days.map((day) => {
          const date = format(day, 'yyyy-MM-dd');
          return (
            <div key={date} className="flex flex-col items-center">
              <div className="mb-1">{format(day, 'd')}</div>
              <div className="flex flex-col gap-1">
                {activeTimes.map((timing) => {
                  const taken = medication.streak[date]?.[timing];
                  let bgColor = 'bg-gray-200';
                  if (taken === true) bgColor = 'bg-green-500';
                  if (taken === false) bgColor = 'bg-red-500';
                  return (
                    <div
                      key={`${date}-${timing}`}
                      className={`w-4 h-4 rounded-full ${bgColor}`}
                      title={`${timing}: ${taken ? 'Taken' : 'Not taken'}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (!currentMedications || !pastMedications) {
    return <div className="text-center py-4">Loading medications...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Medication Dashboard</h1>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Current Medications</h2>
        {currentMedications.length === 0 ? (
          <p>No current medications.</p>
        ) : (
          currentMedications.map((med) => (
            <div key={med.id} className="mb-4 p-4 border rounded">
              <button 
                className="text-lg font-medium mb-2 hover:text-blue-600 transition-colors"
                onClick={() => setExpandedMedication(expandedMedication === med.id ? null : med.id)}
              >
                {med.medicine}
              </button>
              <p className="text-sm text-gray-600 mb-2">{med.before_after_food}</p>
              {renderCheckbox(med, format(new Date(), 'yyyy-MM-dd'))}
              {expandedMedication === med.id && (
                <div className="mt-4">
                  <h3 className="text-lg font-medium mb-2">Monthly Streak</h3>
                  <div className="flex justify-between items-center mb-4">
                    <button onClick={handlePrevMonth} className="p-2"><ChevronLeft /></button>
                    <span className="text-lg font-medium">{format(currentMonth, 'MMMM yyyy')}</span>
                    <button onClick={handleNextMonth} className="p-2"><ChevronRight /></button>
                  </div>
                  {renderStreak(med)}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <button
          className="flex items-center justify-between w-full text-left"
          onClick={() => setShowPastMedications(!showPastMedications)}
        >
          <h2 className="text-xl font-semibold">Past Medications</h2>
          {showPastMedications ? <ChevronUp /> : <ChevronDown />}
        </button>
        {showPastMedications && (
          <div className="mt-4">
            {pastMedications.length === 0 ? (
              <p>No past medications.</p>
            ) : (
              pastMedications.map((med) => (
                <div key={med.id} className="mb-4 p-4 border rounded">
                  <h3 className="text-lg font-medium">{med.medicine}</h3>
                  <p className="text-sm text-gray-600">
                    Taken from {med.start_date} to {med.end_date}
                  </p>
                  <p className="text-sm text-gray-600">
                    Timing: {getActiveTimes(med).join(', ')}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicationDashboard;