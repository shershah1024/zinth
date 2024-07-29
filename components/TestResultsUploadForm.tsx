// components/TestResultsUploadForm.tsx
'use client'
import React, { useState } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

const MAX_FILES = 4;
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface TestResultsUploadFormProps {
  processFiles: (files: File[]) => Promise<any[]>;
}

export function TestResultsUploadForm({ processFiles }: TestResultsUploadFormProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files).filter(file => {
        if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
          setError(`File ${file.name} is not an accepted file type.`);
          return false;
        }
        if (file.size > MAX_FILE_SIZE) {
          setError(`File ${file.name} exceeds the maximum file size of 10MB.`);
          return false;
        }
        return true;
      });

      if (uploadedFiles.length + newFiles.length <= MAX_FILES) {
        setUploadedFiles(prevFiles => [...prevFiles, ...newFiles]);
        setError(null);
      } else {
        setError(`You can only upload up to ${MAX_FILES} files.`);
      }
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setAnalysisResults([]);

    try {
      const results = await processFiles(uploadedFiles);
      setAnalysisResults(results);
      setUploadedFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-gray-50 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900">Upload Medical Images, X-rays, or Scans</h2>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div>
        <Input
          type="file"
          onChange={handleFileUpload}
          multiple
          accept={ACCEPTED_FILE_TYPES.join(',')}
          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <p className="mt-1 text-sm text-gray-500">
          Upload your medical images, X-rays, or scans here. You can upload up to 4 files. Accepted formats: JPEG, PNG, PDF. Max file size: 10MB.
        </p>
      </div>
      
      <div className="space-y-2">
        {uploadedFiles.map((file, index) => (
          <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
            <span className="text-sm text-gray-700">{file.name}</span>
            <Button type="button" variant="destructive" size="sm" onClick={() => removeFile(index)}>
              Remove
            </Button>
          </div>
        ))}
      </div>
      
      <Button type="submit" className="w-full" disabled={uploadedFiles.length === 0 || isLoading}>
        {isLoading ? 'Analyzing...' : 'Analyze Images'}
      </Button>

      {analysisResults.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-4">Analysis Results</h3>
          {analysisResults.map((result, index) => (
            <div key={index} className="mb-4">
              <h4 className="font-semibold">{result.name}</h4>
              {result.analyses.map((analysis: string, analysisIndex: number) => (
                <div key={analysisIndex} className="mt-2">
                  <h5 className="font-medium">Analysis {analysisIndex + 1}</h5>
                  <p className="text-sm text-gray-700">{analysis}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </form>
  );
}