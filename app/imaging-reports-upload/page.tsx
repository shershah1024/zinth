//app/imaging-reports-upload/page.tsx


import React from 'react';
import { ImagingTestUploadForm } from '@/components/ImagingTestUploadForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Upload Imaging Test | MediScan',
};

async function processFile(formData: FormData) {
  'use server'
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/process-imaging-results`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
}

export default function ImagingTestUploadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Upload Your Imaging Test
          </h1>
          <p className="mt-3 max-w-md mx-auto text-lg text-gray-500 sm:text-xl md:mt-5 md:max-w-3xl">
            Securely upload your X-ray, MRI, CT scan, or other medical imaging files.
          </p>
        </div>
        
        <ImagingTestUploadForm processFile={processFile} />
      </div>
    </div>
  );
}