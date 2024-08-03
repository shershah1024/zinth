import React, { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calendar, Download, Eye } from 'lucide-react';

interface OldImagingResult {
  id: number;
  date: string;
  test: string;
  public_url: string;
}

interface OldImagingResultsDashboardProps {
  results: OldImagingResult[];
}

const OldImagingResultsDashboard: React.FC<OldImagingResultsDashboardProps> = ({ results }) => {
  const [viewingResult, setViewingResult] = useState<OldImagingResult | null>(null);

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleView = (result: OldImagingResult) => {
    setViewingResult(result);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Imaging Results Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead>Test</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => (
              <TableRow key={result.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(result.date), 'MMM dd, yyyy')}</span>
                  </div>
                </TableCell>
                <TableCell>{result.test}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(result.public_url, `${result.test}-${result.date}.pdf`)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(result)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      {viewingResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-4 w-full max-w-3xl max-h-[90vh] overflow-auto">
            <h2 className="text-xl font-bold mb-4">{viewingResult.test} - {format(new Date(viewingResult.date), 'MMM dd, yyyy')}</h2>
            <div className="aspect-w-16 aspect-h-9 mb-4">
              {viewingResult.public_url.toLowerCase().endsWith('.pdf') ? (
                <object
                  data={viewingResult.public_url}
                  type="application/pdf"
                  width="100%"
                  height="600px"
                >
                  <p>Unable to display PDF file. <a href={viewingResult.public_url}>Download</a> instead.</p>
                </object>
              ) : (
                <img src={viewingResult.public_url} alt={viewingResult.test} className="object-contain w-full h-full" />
              )}
            </div>
            <Button onClick={() => setViewingResult(null)}>Close</Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default OldImagingResultsDashboard;