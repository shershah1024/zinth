import React, { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, User, MessageSquare, Download, ChevronDown, ChevronUp, Link } from "lucide-react";

interface OldImagingResult {
  id: number;
  created_at: string;
  patient_number: string;
  date: string;
  test: string;
  comments: string;
  public_url: string;
  doctor: string;
}

interface OldImagingResultsDashboardProps {
  results: OldImagingResult[];
}

const OldImagingResultsDashboard: React.FC<OldImagingResultsDashboardProps> = ({ results }) => {
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  const toggleExpand = (id: number) => {
    setExpandedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Old Imaging Results Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead>Test</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Comments</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => (
              <React.Fragment key={result.id}>
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(result.date), 'MMM dd, yyyy')}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{result.test}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${result.doctor}`} />
                        <AvatarFallback>{result.doctor.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{result.doctor}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate max-w-[200px]" title={result.comments}>
                        {result.comments}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleExpand(result.id)}
                        title={expandedRows.includes(result.id) ? "Collapse" : "Expand"}
                      >
                        {expandedRows.includes(result.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDownload(result.public_url, `${result.test}-${result.date}.pdf`)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        asChild
                        title="View"
                      >
                        <a
                          href={result.public_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Link className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {expandedRows.includes(result.id) && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        {result.public_url.toLowerCase().endsWith('.pdf') ? (
                          <object
                            data={result.public_url}
                            type="application/pdf"
                            width="100%"
                            height="600px"
                          >
                            <p>Unable to display PDF file. <a href={result.public_url}>Download</a> instead.</p>
                          </object>
                        ) : (
                          <img src={result.public_url} alt={result.test} className="max-w-full h-auto" />
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
    </Card>
  );
};

export default OldImagingResultsDashboard;