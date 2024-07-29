// components/MedicalTestsDashboard.tsx
'use client'
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Activity, X } from 'lucide-react';
import { ProcessedTest } from '@/types/medicalTests';

interface MedicalTestsDashboardProps {
  initialTestElements: ProcessedTest[];
}

const MedicalTestsDashboard: React.FC<MedicalTestsDashboardProps> = ({ initialTestElements }) => {
  const [state, setState] = useState<{
    testElements: ProcessedTest[];
    selectedElement: ProcessedTest | null;
  }>({
    testElements: initialTestElements,
    selectedElement: null
  });

  const handleElementClick = (element: ProcessedTest) => {
    setState(prevState => ({ ...prevState, selectedElement: element }));
  };

  const closeModal = () => {
    setState(prevState => ({ ...prevState, selectedElement: null }));
  };

  const renderModal = () => {
    if (!state.selectedElement) return null;

    return (
      <motion.div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="bg-white rounded-lg shadow-xl w-full max-w-4xl"
          initial={{ scale: 0.9, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 50 }}
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-gray-800">{state.selectedElement.name} History</h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Normal Range: {state.selectedElement.normalRange} {state.selectedElement.unit}
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold mb-3">Historical Data</h4>
                <div className="bg-gray-50 rounded-lg p-4 max-h-80 overflow-y-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="text-left text-sm font-medium text-gray-500 uppercase tracking-wider pb-3">Date</th>
                        <th className="text-left text-sm font-medium text-gray-500 uppercase tracking-wider pb-3">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.selectedElement.history.map((record, index) => (
                        <tr key={index} className="border-t border-gray-200">
                          <td className="py-3 text-sm">{record.date}</td>
                          <td className="py-3 text-sm">{record.value} {state.selectedElement?.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-3">Trend Visualization</h4>
                <div className="bg-white rounded-lg p-4 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={state.selectedElement.history}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#3b82f6" 
                        strokeWidth={2} 
                        dot={{ r: 4 }} 
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="p-4 max-w-6xl mx-auto bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Medical Test Results Dashboard</h1>
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {state.testElements.map(element => (
          <motion.div 
            key={element.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow duration-300"
              onClick={() => handleElementClick(element)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <h2 className="text-xl font-semibold">{element.name}</h2>
                <Activity className="w-5 h-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-800">
                  {element.latestValue} 
                  <span className="text-sm font-normal text-gray-500">{element.unit}</span>
                </p>
                <p className="text-sm text-gray-500 mt-2">Latest: {element.latestDate}</p>
                <p className="text-sm text-gray-500">Normal Range: {element.normalRange}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <AnimatePresence>
        {state.selectedElement && renderModal()}
      </AnimatePresence>
    </div>
  );
};

export default MedicalTestsDashboard;