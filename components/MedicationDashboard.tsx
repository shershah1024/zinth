'use client'

import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { StreakMedication, StreakPastMedication, StreakTiming, StreakTimingStatus, TimingValue } from '@/types/StreakTypes';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface MedicationDashboardProps {
  currentMedications: StreakMedication[] | null;
  pastMedications: StreakPastMedication[] | null;
  onUpdateAdherence: (medicationId: number, date: string, timing: StreakTiming, taken: boolean) => void;
}

const MedicationDashboard: React.FC<MedicationDashboardProps> = ({ 
  currentMedications, 
  pastMedications, 
  onUpdateAdherence 
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [showPastMedications, setShowPastMedications] = useState(false);
  const [expandedMedication, setExpandedMedication] = useState<number | null>(null);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const getActiveTimings = (timings: Partial<Record<StreakTiming, TimingValue>>): StreakTiming[] => {
    return (Object.entries(timings) as [StreakTiming, TimingValue][])
      .filter(([_, value]) => value === 'true')
      .map(([timing, _]) => timing);
  };

  const renderCheckbox = (medication: StreakMedication, date: string) => {
    const activeTimings = getActiveTimings(medication.timings);
    return (
      <div className="flex flex-wrap gap-4">
        {activeTimings.map((timing) => {
          const isChecked = medication.streak[date]?.[timing] === StreakTimingStatus.Taken;
          return (
            <div key={timing} className="flex items-center space-x-2">
              <Checkbox
                id={`${medication.id}-${timing}`}
                checked={isChecked}
                onCheckedChange={() => onUpdateAdherence(medication.id, date, timing, !isChecked)}
              />
              <label
                htmlFor={`${medication.id}-${timing}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {timing}
              </label>
            </div>
          );
        })}
      </div>
    );
  };

  const renderStreak = (medication: StreakMedication) => {
    const days = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    });
    const activeTimings = getActiveTimings(medication.timings);

    return (
      <div className="grid grid-cols-7 gap-2 text-center">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="font-bold">{day}</div>
        ))}
        {days.map((day) => {
          const date = format(day, 'yyyy-MM-dd');
          return (
            <div key={date} className="flex flex-col items-center">
              <div className="text-sm">{format(day, 'd')}</div>
              <div className="flex flex-col gap-1 mt-1">
                {activeTimings.map((timing) => {
                  const status = medication.streak[date]?.[timing];
                  let bgColor = 'bg-gray-200';
                  if (status === StreakTimingStatus.Taken) bgColor = 'bg-green-500';
                  if (status === StreakTimingStatus.NotTaken) bgColor = 'bg-red-500';
                  return (
                    <div
                      key={`${date}-${timing}`}
                      className={`w-3 h-3 rounded-full ${bgColor}`}
                      title={`${timing}: ${status === StreakTimingStatus.Taken ? 'Taken' : 'Not taken'}`}
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
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Medication Dashboard</h1>
      <p className="text-sm text-gray-600">Click on a medication name to view its monthly streak data.</p>

      <Card>
        <CardHeader>
          <CardTitle>Current Medications</CardTitle>
        </CardHeader>
        <CardContent>
          {currentMedications.length === 0 ? (
            <p>No current medications.</p>
          ) : (
            currentMedications.map((med) => (
              <div key={med.id} className="mb-6 last:mb-0">
                <h3 
                  className="text-lg font-medium mb-2 cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => setExpandedMedication(expandedMedication === med.id ? null : med.id)}
                >
                  {med.medicine}
                </h3>
                <p className="text-sm text-gray-600 mb-2">{med.before_after_food}</p>
                {renderCheckbox(med, format(new Date(), 'yyyy-MM-dd'))}
                {expandedMedication === med.id && (
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-4">
                      <Button onClick={handlePrevMonth} variant="outline" size="icon">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-lg font-medium">{format(currentMonth, 'MMMM yyyy')}</span>
                      <Button onClick={handleNextMonth} variant="outline" size="icon">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    {renderStreak(med)}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <Button
              onClick={() => setShowPastMedications(!showPastMedications)}
              variant="ghost"
              className="w-full justify-between"
            >
              Past Medications
              {showPastMedications ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CardTitle>
        </CardHeader>
        {showPastMedications && (
          <CardContent>
            {pastMedications.length === 0 ? (
              <p>No past medications.</p>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {pastMedications.map((med) => (
                  <AccordionItem key={med.id} value={`past-med-${med.id}`}>
                    <AccordionTrigger>{med.medicine}</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-gray-600">
                        Taken from {med.start_date} to {med.end_date}
                      </p>
                      <p className="text-sm text-gray-600">
                        Timing: {getActiveTimings(med.timings).join(', ')}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default MedicationDashboard;