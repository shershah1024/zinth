'use client'

import React, { useState } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

const MAX_FILES = 5;
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface PrescriptionUploadFormProps {
  onSubmit: (formData: FormData) => Promise<void>;
}

export function PrescriptionUploadForm({ onSubmit }: PrescriptionUploadFormProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files).filter(file => {
        if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
          setError(`File ${file.name} is not an accepted file type.`);
          return false;
        }
        if (file.size > MAX_FILE_SIZE) {
          setError(`File ${file.name} exceeds the maximum file size of 5MB.`);
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

    const formData = new FormData();
    uploadedFiles.forEach((file, index) => {
      formData.append(`file${index}`, file);
    });

    try {
      await onSubmit(formData);
      // Reset form after successful submission
      setUploadedFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-12">Upload Your Prescriptions</h1>
        <form onSubmit={handleSubmit} className="space-y-8 bg-white shadow-2xl rounded-2xl p-10">
          <h2 className="text-3xl font-semibold text-gray-900 mb-6">Upload Prescriptions</h2>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <Input
              type="file"
              onChange={handleFileUpload}
              multiple
              accept={ACCEPTED_FILE_TYPES.join(',')}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="mt-3 text-sm text-gray-600">
              Upload your prescription images or documents here. You can upload up to 5 files. Accepted formats: JPEG, PNG, PDF. Max file size: 5MB.
            </p>
          </div>
          
          <div className="space-y-3">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
                <span className="text-sm font-medium text-gray-700">{file.name}</span>
                <Button type="button" variant="destructive" size="sm" onClick={() => removeFile(index)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
          
          <Button 
            type="submit" 
            className="w-full py-4 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition duration-300 ease-in-out transform hover:-translate-y-1"
            disabled={uploadedFiles.length === 0 || isLoading}
          >
            {isLoading ? 'Uploading...' : 'Upload Prescriptions'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default PrescriptionUploadForm;