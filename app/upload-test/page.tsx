// app/upload-test/page.tsx
'use client';
import { NextPage } from 'next';
import { HealthRecordUploadForm } from '@/components/HealthRecordUploadForm';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

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
  async function processFile(file: File): Promise<ProcessingResult> {
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
      console.log(`Processed file: ${file.name}`, data);
      return data;
    } catch (error) {
      console.error('Error processing file:', file.name, error);
      throw error; // Re-throw the error to be handled by the component
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-2xl">
        <HealthRecordUploadForm processFile={processFile} />
      </div>
    </div>
  );
};

export default TestResultsUploadPage;