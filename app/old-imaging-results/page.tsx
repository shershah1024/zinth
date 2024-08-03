import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileText, Calendar, User, MessageSquare, Link } from "lucide-react";

// Supabase setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const PATIENT_NUMBER = '919885842349';

// Types
interface ImagingResult {
  id: number;
  created_at: string;
  patient_number: string;
  date: string;
  test: string;
  comments: string;
  public_url: string;
  doctor: string;
}

async function getOldImagingResults() {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const { data, error } = await supabase
    .from('imaging_results')
    .select('*')
    .eq('patient_number', PATIENT_NUMBER)
    .lt('date', oneYearAgo.toISOString())
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching older imaging results:', error);
    throw new Error('Failed to fetch older imaging results');
  }

  return data;
}

export default async function OldImagingResultsPage() {
  const oldResults = await getOldImagingResults();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Old Imaging Results</h1>
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
              {oldResults.map((result: ImagingResult) => (
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
    </div>
  );
}