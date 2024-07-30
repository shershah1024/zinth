import { PrescriptionUploadForm } from '@/components/PrescriptionUploadForm'
import { PrescriptionAnalysisResult } from '@/types/medical'

async function uploadPrescription(formData: FormData): Promise<{ result: PrescriptionAnalysisResult; publicUrl: string }> {
  'use server'

  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/process-prescription`, {
    method: 'POST',
    body: formData
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.details || `Processing failed with status ${response.status}`);
  }

  if (!data.result || !data.publicUrl) {
    throw new Error('Invalid response from server');
  }

  return {
    result: data.result as PrescriptionAnalysisResult,
    publicUrl: data.publicUrl
  };
}

export default function UploadPrescriptionPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PrescriptionUploadForm onSubmit={uploadPrescription} />
    </div>
  )
}