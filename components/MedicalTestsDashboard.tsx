import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, Search } from 'lucide-react';
import { TestElement, MedicalTestsDashboardProps } from '@/types/types';

const MedicalTestsDashboard: React.FC<MedicalTestsDashboardProps> = ({ initialTestElements = [] }) => {
  const [testElements] = useState<TestElement[]>(initialTestElements);
  const [selectedElement, setSelectedElement] = useState<TestElement | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredElements = useMemo(() => {
    return testElements.filter(element =>
      element.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [testElements, searchTerm]);

  return (
    <div className="p-4 max-w-6xl mx-auto bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Medical Test Results Dashboard</h1>
      <div className="mb-6 relative">
        <Input
          type="text"
          placeholder="Search tests..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
      </div>
      {filteredElements.length > 0 ? (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {filteredElements.map(element => (
            <motion.div 
              key={element.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <h2 className="text-xl font-semibold">{element.name}</h2>
                  <Activity className="w-5 h-5 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-gray-800">{element.latestValue} <span className="text-sm font-normal text-gray-500">{element.unit}</span></p>
                  <p className="text-sm text-gray-500 mt-2">Latest: {element.latestDate}</p>
                  <p className="text-sm text-gray-500">Normal Range: {element.normalRange}</p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="mt-4 w-full">View Details</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>{element.name} History</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-lg font-semibold mb-3">Historical Data</h4>
                          <div className="bg-gray-50 rounded-lg p-4 max-h-80 overflow-y-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Value</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {element.history.map((record, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{record.date}</TableCell>
                                    <TableCell>{record.value} {element.unit}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold mb-3">Trend Visualization</h4>
                          <div className="bg-white rounded-lg p-4 h-80">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={element.history}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="text-center text-gray-500 mt-10">
          <p className="text-xl font-semibold">No test results found</p>
          <p className="mt-2">Try adjusting your search or add new test results</p>
        </div>
      )}
    </div>
  );
};

export default MedicalTestsDashboard;