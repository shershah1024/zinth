'use client'
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Activity, X, Search, AlertCircle } from 'lucide-react';

// Updated types to allow string or number for values
interface HistoryRecord {
  date: string;
  value: number | string;
}

interface ProcessedTest {
  id: string;
  name: string;
  latestValue: number | string;
  latestDate: string;
  unit: string;
  normalRange: string;
  history: HistoryRecord[];
}

interface MedicalTestsDashboardProps {
  initialTestElements: ProcessedTest[];
}

const MedicalTestsDashboard: React.FC<MedicalTestsDashboardProps> = ({ initialTestElements }) => {
  const [selectedElement, setSelectedElement] = useState<ProcessedTest | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredTestElements = useMemo(() => 
    initialTestElements.filter(element =>
      element.name.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [initialTestElements, searchTerm]
  );

  const handleElementClick = (element: ProcessedTest) => setSelectedElement(element);
  const closeModal = () => setSelectedElement(null);
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value);

  const isAbnormal = (value: number | string, normalRange: string): boolean => {
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numericValue)) return false; // Handle non-numeric strings
    const [min, max] = normalRange.split('-').map(Number);
    return numericValue < min || numericValue > max;
  };

  const formatValue = (value: number | string): string => {
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return value;
  };

  const TestCard: React.FC<{ element: ProcessedTest }> = ({ element }) => {
    const abnormal = isAbnormal(element.latestValue, element.normalRange);

    return (
      <motion.div 
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
      >
        <Card 
          className={`cursor-pointer hover:shadow-lg transition-shadow duration-300 bg-white border-2 ${abnormal ? 'border-red-400' : 'border-green-400'}`}
          onClick={() => handleElementClick(element)}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-800">{element.name}</h2>
            {abnormal && <AlertCircle className="w-5 h-5 text-red-500" />}
          </CardHeader>
          <CardContent className="pt-4">
            <p className={`text-3xl font-bold ${abnormal ? 'text-red-600' : 'text-green-600'}`}>
              {formatValue(element.latestValue)} 
              <span className="text-sm font-normal text-gray-500 ml-1">{element.unit}</span>
            </p>
            <p className="text-sm text-gray-600 mt-2">Latest: {element.latestDate}</p>
            <p className="text-sm text-gray-600">Normal Range: {element.normalRange}</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const Modal: React.FC = () => {
    if (!selectedElement) return null;

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
              <h3 className="text-2xl font-bold text-gray-800">{selectedElement.name} History</h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Normal Range: {selectedElement.normalRange} {selectedElement.unit}
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
                      {selectedElement.history.map((record, index) => (
                        <tr key={index} className="border-t border-gray-200">
                          <td className="py-3 text-sm">{record.date}</td>
                          <td className={`py-3 text-sm ${isAbnormal(record.value, selectedElement.normalRange) ? 'text-red-600 font-semibold' : 'text-green-600'}`}>
                            {formatValue(record.value)} {selectedElement.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-3">Trend Visualization</h4>
                <div className="bg-white rounded-lg p-4 h-80 border border-gray-200">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={selectedElement.history.map(record => ({
                      ...record,
                      value: typeof record.value === 'string' ? parseFloat(record.value) : record.value
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#10b981" 
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
    <div className="p-6 max-w-7xl mx-auto bg-gray-100 min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">Medical Test Results Dashboard</h1>
      
      <div className="mb-6 relative">
        <input
          type="text"
          placeholder="Search tests..."
          value={searchTerm}
          onChange={handleSearch}
          className="w-full px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 pl-10"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
      </div>

      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {filteredTestElements.map(element => (
          <TestCard key={element.id} element={element} />
        ))}
      </motion.div>

      <AnimatePresence>
        {selectedElement && <Modal />}
      </AnimatePresence>
    </div>
  );
};

export default MedicalTestsDashboard;