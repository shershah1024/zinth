import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FileText, Calendar, User, MessageSquare, Link } from 'lucide-react';

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
              <TableHead>Doctor</TableHead>
              <TableHead>Comments</TableHead>
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
                    <a href={result.public_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                      <Link className="h-4 w-4" />
                    </a>
                    <a href={`/patient/${result.patient_number}`} className="text-green-500 hover:text-green-700">
                      <User className="h-4 w-4" />
                    </a>
                    <a href={`/result/${result.id}`} className="text-purple-500 hover:text-purple-700">
                      <FileText className="h-4 w-4" />
                    </a>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default OldImagingResultsDashboard;