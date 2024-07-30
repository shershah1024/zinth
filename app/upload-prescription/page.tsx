// UploadPrescriptionPage.tsx
import { PrescriptionUploadForm } from '@/components/PrescriptionUploadForm'
import { PrescriptionAnalysisResult } from '@/types/medical'
import UploadSuccessHandler from '@/components/UploadSuccesHandler'

async function uploadPrescription(formData: FormData): Promise<{ result: PrescriptionAnalysisResult; publicUrl: string }> {
  'use server'

  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/process-prescription`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Processing failed with status ${response.status}`);
  }

  return response.json();
}

export default function UploadPrescriptionPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PrescriptionUploadForm onSubmit={uploadPrescription} />
      <UploadSuccessHandler />
    </div>
  )
}