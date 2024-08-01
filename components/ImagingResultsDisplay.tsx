'use client'

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Download, FileText, Image as ImageIcon } from "lucide-react"

type ImagingResult = {
  id: string;
  testName: string;
  testDate: string;
  fileUrl: string;
  fileType: 'image' | 'pdf';
  observation?: string;
};

interface ImagingResultsDisplayProps {
  results: ImagingResult[];
}

export function ImagingResultsDisplay({ results }: ImagingResultsDisplayProps) {
  const [expandedResults, setExpandedResults] = useState<string[]>([]);

  const toggleExpand = (id: string) => {
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

  return (
    <div className="space-y-4">
      {results.map(result => (
        <Card key={result.id} className="overflow-hidden">
          <CardHeader className="cursor-pointer" onClick={() => toggleExpand(result.id)}>
            <CardTitle className="flex justify-between items-center">
              <span>{result.testName}</span>
              <span className="text-sm font-normal text-gray-500">{result.testDate}</span>
            </CardTitle>
          </CardHeader>
          {expandedResults.includes(result.id) && (
            <CardContent className="space-y-4">
              <div className="aspect-w-16 aspect-h-9">
                {result.fileType === 'pdf' ? (
                  <object
                    data={result.fileUrl}
                    type="application/pdf"
                    width="100%"
                    height="100%"
                  >
                    <p>Unable to display PDF file. <a href={result.fileUrl}>Download</a> instead.</p>
                  </object>
                ) : (
                  <img src={result.fileUrl} alt={result.testName} className="object-contain w-full h-full" />
                )}
              </div>
              {result.observation && (
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Observations:</h4>
                  <p>{result.observation}</p>
                </div>
              )}
            </CardContent>
          )}
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => toggleExpand(result.id)}>
              {expandedResults.includes(result.id) ? (
                <>
                  <ChevronUp className="mr-2 h-4 w-4" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="mr-2 h-4 w-4" />
                  Expand
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDownload(result.fileUrl, `${result.testName}.${result.fileType}`)}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}