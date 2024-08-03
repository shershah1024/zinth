import React from 'react';
import { ImagingResultsDisplay } from '@/components/ImagingResultsDisplay';
import { Metadata } from 'next';

// Define the type for the raw data from the API
interface ApiImagingResult {
  id: number;
  created_at: string;
  patient_number: string;
  date: string;
  test: string;
  comments: string;
  public_url: string;
  doctor: string;
}

// Define the type for the API response
interface ApiResponse {
  data: ApiImagingResult[];
  fetchedCount: number;
  totalCount: number;
  message: string;
}

// Define the type expected by ImagingResultsDisplay
type FormattedImagingResult = {
  id: string;
  testName: string;
  testDate: string;
  fileUrl: string;
  fileType: 'image' | 'pdf';
  observation?: string;
};

// Function to determine file type based on URL
function getFileType(url: string): 'image' | 'pdf' {
  return url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';
}

// Function to format the raw data
function formatImagingResults(rawResults: ApiImagingResult[]): FormattedImagingResult[] {
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
  let formattedResults: FormattedImagingResult[] = [];
  let error: string | null = null;

  try {
    const apiUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/fetch-imaging-results`;
    const response = await fetch(apiUrl, { 
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch imaging results: ${response.status} ${response.statusText}`);
    }
    
    const apiResponse: ApiResponse = await response.json();
    
    if (!apiResponse || !Array.isArray(apiResponse.data)) {
      throw new Error('API did not return expected data structure');
    }

    formattedResults = formatImagingResults(apiResponse.data);
    console.log(`Fetched and formatted ${formattedResults.length} results`);
  } catch (e) {
    error = e instanceof Error ? e.message : 'An unknown error occurred';
    console.error('Error fetching imaging results:', error);
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Error</h1>
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Your Imaging Results</h1>
        <p className="text-gray-600 mb-8">
          Below are your recent imaging test results. Click on each test to view more details and download the images or reports. 
          To view older results, use the button at the bottom of the list.
        </p>
        <ImagingResultsDisplay results={formattedResults} />
      </div>
    </div>
  );
}