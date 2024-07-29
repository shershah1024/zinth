'use client'
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type AdherenceStatus = boolean | null;

interface Medication {
  id: number;
  name: string;
  dosage: string;
  timeOfDay: string;
}

interface AdherenceRecord {
  [key: number]: AdherenceStatus[];
}

interface LastLoggedTime {
  [key: number]: string;
}

const medications: Medication[] = [
  { id: 1, name: 'Lisinopril', dosage: '10mg', timeOfDay: 'Morning' },
  { id: 2, name: 'Metformin', dosage: '500mg', timeOfDay: 'Morning, Evening' },
  { id: 3, name: 'Atorvastatin', dosage: '20mg', timeOfDay: 'Evening' },
  { id: 4, name: 'Levothyroxine', dosage: '100mcg', timeOfDay: 'Morning' },
];

const MedicationTracker: React.FC = () => {
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [adherence, setAdherence] = useState<AdherenceRecord>(
    medications.reduce((acc, med) => ({
      ...acc,
      [med.id]: Array(31).fill(null)
    }), {})
  );
  const [recentlyTaken, setRecentlyTaken] = useState<{ [key: number]: boolean }>({});
  const [lastLoggedTime, setLastLoggedTime] = useState<LastLoggedTime>({});

  const handleMedClick = (med: Medication): void => setSelectedMed(med);

  const handleAdherenceToggle = (medId: number, day: number): void => {
    setAdherence(prev => ({
      ...prev,
      [medId]: prev[medId].map((status, index) => 
        index === day ? (status === true ? false : true) : status
      )
    }));
  };

  const handleQuickTake = useCallback((medId: number, event: React.MouseEvent): void => {
    event.stopPropagation();
    const today = new Date().getDate() - 1; // Adjust for 0-based index
    handleAdherenceToggle(medId, today);
    setRecentlyTaken(prev => ({ ...prev, [medId]: true }));
    setLastLoggedTime(prev => ({ ...prev, [medId]: new Date().toLocaleTimeString() }));
    setTimeout(() => setRecentlyTaken(prev => ({ ...prev, [medId]: false })), 2000);
  }, []);

  const getCircleColor = (status: AdherenceStatus): string => {
    if (status === true) return 'bg-green-500';
    if (status === false) return 'bg-red-500';
    return 'bg-gray-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center text-indigo-800">
          Medication Tracker
        </h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {medications.map((med) => (
            <Card key={med.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-indigo-700">{med.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-1">{med.dosage}</p>
                <p className="text-xs text-gray-500 mb-3">{med.timeOfDay}</p>
                <Button 
                  className={`w-full mb-2 ${recentlyTaken[med.id] ? 'bg-green-500 hover:bg-green-600' : 'bg-indigo-500 hover:bg-indigo-600'}`}
                  onClick={(e) => handleQuickTake(med.id, e)}
                >
                  {recentlyTaken[med.id] ? (
                    <span className="flex items-center justify-center">
                      Dose Logged <Check className="ml-2" size={16} />
                    </span>
                  ) : (
                    "Log Dose"
                  )}
                </Button>
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={() => handleMedClick(med)}>
                    View History
                  </Button>
                  {lastLoggedTime[med.id] && (
                    <Badge variant="secondary" className="ml-2">
                      <Clock className="w-3 h-3 mr-1" />
                      {lastLoggedTime[med.id]}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedMed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          >
            <Card className="w-full max-w-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-2xl font-bold text-indigo-800">{selectedMed.name}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setSelectedMed(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Dosage: {selectedMed.dosage} | Time: {selectedMed.timeOfDay}
                </p>
                <div className="grid grid-cols-7 gap-2">
                  {adherence[selectedMed.id].map((status, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className={`w-10 h-10 p-0 ${getCircleColor(status)}`}
                      onClick={() => handleAdherenceToggle(selectedMed.id, index)}
                    >
                      <span className="text-xs font-bold">{index + 1}</span>
                    </Button>
                  ))}
                </div>
                <div className="mt-4 flex justify-center space-x-4">
                  <Badge variant="secondary">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                    Taken
                  </Badge>
                  <Badge variant="secondary">
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-2" />
                    Missed
                  </Badge>
                  <Badge variant="secondary">
                    <div className="w-3 h-3 rounded-full bg-gray-200 mr-2" />
                    Future
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MedicationTracker;