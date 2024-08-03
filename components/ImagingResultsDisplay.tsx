'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Download, FileText, Image as ImageIcon, Clock, Calendar, Link } from "lucide-react"

type ImagingResult = {
  id: number;
  created_at: string;
  patient_number: string;
  date: string;
  test: string;
  comments: string;
  public_url: string;
  doctor: string;
};

interface ImagingResultsDisplayProps {
  results: ImagingResult[];
}

export function ImagingResultsDisplay({ results }: ImagingResultsDisplayProps) {
  const [expandedResults, setExpandedResults] = useState<number[]>([]);
  const router = useRouter();

  const toggleExpand = (id: number) => {
    setExpandedResults(prev =>
      prev.includes(id) ? prev.filter(resultId => resultId !== id) : [...prev, id]
    );
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const navigateToOlderResults = () => {
    router.push('/old-imaging-results');
  };

  const getFileType = (url: string): 'image' | 'pdf' => {
    return url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Imaging Results Display</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Date</TableHead>
              <TableHead className="w-[200px]">Test</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => (
              <React.Fragment key={result.id}>
                <TableRow>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{result.date}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{result.test}</TableCell>
                  <TableCell>{result.doctor}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => toggleExpand(result.id)}>
                        {expandedResults.includes(result.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(result.public_url, `${result.test}.${getFileType(result.public_url)}`)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <a href={result.public_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                        <Link className="h-4 w-4" />
                      </a>
                    </div>
                  </TableCell>
                </TableRow>
                {expandedResults.includes(result.id) && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="aspect-w-16 aspect-h-9 mb-4">
                          {getFileType(result.public_url) === 'pdf' ? (
                            <object
                              data={result.public_url}
                              type="application/pdf"
                              width="100%"
                              height="600px"
                            >
                              <p>Unable to display PDF file. <a href={result.public_url}>Download</a> instead.</p>
                            </object>
                          ) : (
                            <img src={result.public_url} alt={result.test} className="object-contain w-full h-full" />
                          )}
                        </div>
                        {result.comments && (
                          <div className="bg-white p-4 rounded-lg">
                            <h4 className="font-semibold mb-2">Comments:</h4>
                            <p>{result.comments}</p>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={navigateToOlderResults} 
          className="w-full"
          variant="secondary"
        >
          <Clock className="mr-2 h-4 w-4" />
          View Older Imaging Results
        </Button>
      </CardFooter>
    </Card>
  );
}