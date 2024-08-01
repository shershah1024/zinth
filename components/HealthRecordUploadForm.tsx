// components/HealthRecordUploadForm.tsx
'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Upload, X, File } from "lucide-react"

const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface HealthRecordUploadFormProps {
  processFile: (file: File) => Promise<any>;
}

export function HealthRecordUploadForm({ processFile }: HealthRecordUploadFormProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (uploadedFile && uploadedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(uploadedFile);
    } else {
      setPreview(null);
    }
  }, [uploadedFile]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        setError(`File ${file.name} is not an accepted file type.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`File ${file.name} exceeds the maximum file size of 10MB.`);
        return;
      }
      setUploadedFile(file);
      setError(null);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setPreview(null);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!uploadedFile) {
      setError("Please upload a file before submitting.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      await processFile(uploadedFile);
      router.push('/test-reports');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full h-[calc(100vh-4rem)] max-w-6xl mx-auto bg-gradient-to-br from-teal-50 to-emerald-100 shadow-lg overflow-hidden">
      <CardHeader className="border-b border-teal-200">
        <CardTitle className="text-3xl font-bold text-teal-800">Upload Health Record</CardTitle>
      </CardHeader>
      <CardContent className="p-6 h-[calc(100%-5rem)] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-6 h-full flex flex-col">
          {error && (
            <Alert variant="destructive" className="bg-red-50 border-red-300 text-red-800">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {!uploadedFile ? (
            <div className="border-2 border-dashed border-teal-300 rounded-lg p-12 bg-white transition-all hover:border-teal-400 hover:bg-teal-50 flex-grow flex items-center justify-center">
              <label htmlFor="file-upload" className="flex flex-col items-center justify-center cursor-pointer">
                <Upload className="w-16 h-16 mb-4 text-teal-500" />
                <span className="text-lg font-medium text-teal-700">Click to upload or drag and drop</span>
                <span className="text-sm text-teal-600 mt-2">PDF, DOC, or DOCX (MAX. 10MB)</span>
                <Input
                  id="file-upload"
                  type="file"
                  onChange={handleFileUpload}
                  accept={ACCEPTED_FILE_TYPES.join(',')}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center bg-white rounded-lg p-6">
              {preview ? (
                <img src={preview} alt="File preview" className="max-w-full max-h-[70vh] object-contain mb-4" />
              ) : (
                <File className="w-32 h-32 text-teal-500 mb-4" />
              )}
              <div className="text-center">
                <p className="text-lg font-medium text-teal-800 mb-2">{uploadedFile.name}</p>
                <p className="text-sm text-teal-600">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <Button type="button" onClick={removeFile} variant="outline" className="mt-4 text-teal-700 hover:text-teal-900 hover:bg-teal-100">
                Remove File
              </Button>
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-6 text-lg"
            disabled={!uploadedFile || isLoading}
          >
            {isLoading ? 'Processing...' : 'Upload Health Record'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}