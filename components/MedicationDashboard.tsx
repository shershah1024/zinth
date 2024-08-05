import React, { useState, useMemo, useCallback } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Pill, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from 'framer-motion';

// Type definitions (unchanged)
interface HistoryRecord {
  date: string;
  value: StreakTimingStatus;
}

interface StreakMedication {
  id: number;
  medicine: string;
  before_after_food: string;
  timings: Partial<Record<StreakTiming, TimingValue>>;
  streak: Record<string, Partial<Record<StreakTiming, StreakTimingStatus>>>;
  public_url?: string;
}

interface StreakPastMedication {
  id: number;
  medicine: string;
  start_date: string;
  end_date: string;
  timings: Partial<Record<StreakTiming, TimingValue>>;
}

type StreakTiming = 'Morning' | 'Afternoon' | 'Evening' | 'Night';
type TimingValue = 'true' | 'false';

enum StreakTimingStatus {
  Taken = 'Taken',
  NotTaken = 'NotTaken'
}

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

  const handlePrevMonth = useCallback(() => setCurrentMonth(prev => subMonths(prev, 1)), []);
  const handleNextMonth = useCallback(() => setCurrentMonth(prev => addMonths(prev, 1)), []);

  const getActiveTimings = useCallback((timings: Partial<Record<StreakTiming, TimingValue>>): StreakTiming[] => {
    return (Object.entries(timings) as [StreakTiming, TimingValue][])
      .filter(([_, value]) => value === 'true')
      .map(([timing, _]) => timing);
  }, []);

  const handleDownload = useCallback((url: string, medicineName: string) => {
    const fileName = `${medicineName.replace(/\s+/g, '_')}_prescription.pdf`;
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch(error => console.error('Error downloading prescription:', error));
  }, []);

  const renderCheckbox = useCallback((medication: StreakMedication, date: string) => {
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
                className="text-blue-500 border-blue-500"
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
  }, [getActiveTimings, onUpdateAdherence]);

  const renderStreak = useCallback((medication: StreakMedication) => {
    const days = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    });
    const activeTimings = getActiveTimings(medication.timings);

    return (
      <div className="grid grid-cols-7 gap-2 text-center">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="font-bold text-gray-600">{day}</div>
        ))}
        {days.map((day) => {
          const date = format(day, 'yyyy-MM-dd');
          return (
            <div key={date} className="flex flex-col items-center">
              <div className="text-sm text-gray-600">{format(day, 'd')}</div>
              <div className="flex flex-col gap-1 mt-1">
                {activeTimings.map((timing) => {
                  const status = medication.streak[date]?.[timing];
                  let bgColor = 'bg-gray-200';
                  if (status === StreakTimingStatus.Taken) bgColor = 'bg-blue-500';
                  if (status === StreakTimingStatus.NotTaken) bgColor = 'bg-red-400';
                  return (
                    <div
                      key={`${date}-${timing}`}
                      className={`w-3 h-3 rounded-full ${bgColor} transition-all duration-300 ease-in-out`}
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
  }, [currentMonth, getActiveTimings]);

  const CurrentMedicationsCard = useMemo(() => {
    if (!currentMedications) return null;
    return (
      <Card className="bg-blue-50 shadow-lg rounded-lg overflow-hidden border border-blue-200">
        <CardHeader className="bg-blue-500 text-white">
          <CardTitle className="flex items-center">
            <Pill className="mr-2" />
            Current Medications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {currentMedications.length === 0 ? (
            <p className="text-gray-600">No current medications.</p>
          ) : (
            currentMedications.map((med) => (
              <motion.div 
                key={med.id} 
                className="mb-6 last:mb-0 bg-white p-4 rounded-lg shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 
                    className="text-lg font-medium cursor-pointer hover:text-blue-600 transition-colors flex items-center"
                    onClick={() => setExpandedMedication(prev => prev === med.id ? null : med.id)}
                  >
                    {med.medicine}
                    <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${expandedMedication === med.id ? 'transform rotate-180' : ''}`} />
                  </h3>
                  {med.public_url && (
                    <Button
                      onClick={() => handleDownload(med.public_url!, med.medicine)}
                      variant="outline"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Prescription
                    </Button>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">{med.before_after_food + " food"}</p>
                {renderCheckbox(med, format(new Date(), 'yyyy-MM-dd'))}
                {expandedMedication === med.id && (
                  <motion.div 
                    className="mt-4"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <Button onClick={handlePrevMonth} variant="outline" size="icon" className="text-blue-600 hover:text-blue-700">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-lg font-medium text-blue-600">{format(currentMonth, 'MMMM yyyy')}</span>
                      <Button onClick={handleNextMonth} variant="outline" size="icon" className="text-blue-600 hover:text-blue-700">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    {renderStreak(med)}
                  </motion.div>
                )}
              </motion.div>
            ))
          )}
        </CardContent>
      </Card>
    );
  }, [currentMedications, expandedMedication, currentMonth, renderCheckbox, renderStreak, handlePrevMonth, handleNextMonth, handleDownload]);

  const PastMedicationsCard = useMemo(() => {
    if (!pastMedications) return null;
    return (
      <Card className="bg-gray-50 shadow-lg rounded-lg overflow-hidden border border-gray-200">
        <CardHeader className="bg-gray-500 text-white">
          <CardTitle>
            <Button
              onClick={() => setShowPastMedications(prev => !prev)}
              variant="ghost"
              className="w-full justify-between text-white hover:text-white hover:bg-white/10"
            >
              Past Medications
              {showPastMedications ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CardTitle>
        </CardHeader>
        {showPastMedications && (
          <CardContent className="p-6">
            {pastMedications.length === 0 ? (
              <p className="text-gray-600">No past medications.</p>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {pastMedications.map((med) => (
                  <AccordionItem key={med.id} value={`past-med-${med.id}`} className="border-b border-gray-200 last:border-b-0">
                    <AccordionTrigger className="hover:text-blue-600">{med.medicine}</AccordionTrigger>
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
    );
  }, [pastMedications, showPastMedications, getActiveTimings]);

  if (!currentMedications || !pastMedications) {
    return (
      <div className="flex justify-center items-center h-screen bg-white">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <h1 className="text-4xl font-bold text-blue-800 mb-2">Medication Dashboard</h1>
        <p className="text-sm text-blue-600 mb-6">Click on a medication name to view its monthly streak data. Use the download button to get the prescription.</p>
        {CurrentMedicationsCard}
        {PastMedicationsCard}
      </div>
    </div>
  );
};

export default MedicationDashboard;