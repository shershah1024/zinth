'use client'
import React, { useState } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { AlertCircle, Upload, FileText, Link } from "lucide-react"
import { PrescriptionAnalysisResult } from '@/types/medical'

interface PrescriptionUploadFormProps {
  onSubmit: (formData: FormData) => Promise<{ result: PrescriptionAnalysisResult; publicUrl: string }>;
}

export function PrescriptionUploadForm({ onSubmit }: PrescriptionUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PrescriptionAnalysisResult | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);
    setPublicUrl(null);

    if (!file) {
      setError('Please select a file to upload.');
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { result, publicUrl } = await onSubmit(formData);
      setResult(result);
      setPublicUrl(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Upload Prescription</CardTitle>
        <CardDescription>Upload your prescription image or PDF.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <div className="flex items-center justify-center w-full">
              <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-gray-500">JPEG, PNG, PDF (up to 10MB)</p>
                </div>
                <Input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept="image/jpeg,image/png,application/pdf"
                />
              </label>
            </div>
          </div>
          
          {file && (
            <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded">
              <FileText className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-gray-700">{file.name}</span>
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full py-6 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white" 
            disabled={!file || isLoading}
          >
            {isLoading ? 'Analyzing...' : 'Upload'}
          </Button>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Analysis Result</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {publicUrl && (
            <div className="flex items-center space-x-2">
              <Link className="h-5 w-5 text-blue-600" />
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                View Uploaded File
              </a>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}