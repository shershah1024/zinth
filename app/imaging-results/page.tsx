import React from 'react';
import { ImagingResultsDisplay } from '@/components/ImagingResultsDisplay';
import { Metadata } from 'next';

// Define the type for the raw data from the API
interface RawImagingResult {
  id: number;
  created_at: string;
  patient_number: string;
  date: string;
  test: string;
  comments: string;
  public_url: string;
  doctor: string;
}

// Define the type expected by ImagingResultsDisplay
interface FormattedImagingResult {
  id: string;
  testName: string;
  testDate: string;
  fileUrl: string;
  fileType: 'image' | 'pdf';
  observation: string;
}

// Function to determine file type based on URL
function getFileType(url: string): 'image' | 'pdf' {
  return url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';
}

// Function to format the raw data
function formatImagingResults(rawResults: RawImagingResult[]): FormattedImagingResult[] {
  if (!Array.isArray(rawResults)) {
    console.error('Raw results is not an array:', rawResults);
    return [];
  }
  return rawResults.map(result => ({
    id: result.id.toString(),
    testName: result.test,
    testDate: new Date(result.date).toLocaleDateString(),
    fileUrl: result.public_url,
    fileType: getFileType(result.public_url),
    observation: result.comments
  }));
}

// Metadata for the page
export const metadata: Metadata = {
  title: 'Your Imaging Results',
  description: 'View and download your recent imaging test results',
};

export default async function ImagingResultsPage() {
  let rawResults: RawImagingResult[] = [];
  let error: string | null = null;

  console.log('Starting to fetch imaging results');

  try {
    const apiUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/fetch-imaging-results`;
    console.log('Fetching from URL:', apiUrl);

    const response = await fetch(apiUrl, { 
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    console.log('Response status:', response.status);

    if (!response.ok) {
      throw new Error(`Failed to fetch imaging results: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Received data:', JSON.stringify(data, null, 2));
    
    if (!Array.isArray(data)) {
      console.error('API did not return an array. Received:', typeof data, data);
      throw new Error('API did not return an array');
    }

    rawResults = data;
    console.log(`Received ${rawResults.length} raw results`);
  } catch (e) {
    error = e instanceof Error ? e.message : 'An unknown error occurred';
    console.error('Error fetching imaging results:', error);
  }

  console.log('Formatting results');
  const formattedResults = formatImagingResults(rawResults);
  console.log(`Formatted ${formattedResults.length} results`);

  if (error) {
    console.log('Rendering error page');
    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Error</h1>
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  console.log('Rendering results page');
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Your Imaging Results</h1>
        <p className="text-gray-600 mb-8">
          Below are your recent imaging test results. Click on each test to view more details and download the images or reports. 
          To view older results, use the button at the bottom of the list.
        </p>
        {formattedResults.length > 0 ? (
          <ImagingResultsDisplay results={formattedResults} />
        ) : (
          <p>No imaging results found.</p>
        )}
      </div>
    </div>
  );
}