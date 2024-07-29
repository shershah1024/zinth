// app/upload-test/page.tsx
'use client';
import { NextPage } from 'next';
import { TestResultsUploadForm } from '@/components/TestResultsUploadForm';

const API_BASE_URL = 'http://localhost:3000';

interface AnalysisComponent {
  name: string;
  value: number;
  unit: string;
  normal_range: {
    min: number;
    max: number;
  };
}

interface TestResultAnalysis {
  components: AnalysisComponent[];
  imaging_description?: string;
}

interface ProcessingResult {
  fileType: 'test_result' | 'image_result';
  descriptiveName: string;
  analysis?: TestResultAnalysis;
  publicUrl?: string;
}

const TestResultsUploadPage: NextPage = () => {
  async function processFiles(files: File[]): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/api/medical-analysis`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: ProcessingResult = await response.json();
        results.push(data);
        console.log(`Processed file: ${file.name}`, data);
      } catch (error) {
        console.error('Error processing file:', file.name, error);
        // You might want to handle errors differently, e.g., show a notification to the user
      }
    }
    return results;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-center mb-6">Test Results Upload</h1>
        <TestResultsUploadForm processFiles={processFiles} />
      </div>
    </div>
  );
};

export default TestResultsUploadPage;