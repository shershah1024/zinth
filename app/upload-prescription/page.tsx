// app/upload-prescriptions/page.tsx
import { Metadata } from 'next'
import { PrescriptionUploadForm } from '@/components/PrescriptionUploadForm'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Upload Prescriptions',
  description: 'Upload your prescription documents for processing',
}

async function uploadPrescriptions(formData: FormData) {
  'use server'

  // Process the files here
  // For example, you might save them to a file system or cloud storage
  // and then save the metadata to a database

  // This is a placeholder for your file processing logic
  for (let i = 0; i < 5; i++) {
    const file = formData.get(`file${i}`) as File | null
    if (file) {
      console.log(`Processing file: ${file.name}`)
      // Add your file processing logic here
      // For example:
      // const contents = await file.arrayBuffer()
      // await saveFileToStorage(file.name, contents)
      // await saveMetadataToDatabase(file.name, file.size, file.type)
    }
  }

  // Redirect to the prescriptions page after successful upload
  redirect('/prescriptions')
}

export default function UploadPrescriptionsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PrescriptionUploadForm onSubmit={uploadPrescriptions} />
    </div>
  )
}