// app/api/process-prescription/route.ts

import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const PDF_TO_IMAGE_API_URL = 'https://pdftobase64image-jzfcn33k5q-uc.a.run.app/pdf-to-base64/';
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';


if (!BASE_URL) {
  throw new Error('NEXT_PUBLIC_BASE_URL is not set in the environment variables');
}

interface MedicineTimes {
  morning: string;
  afternoon: string;
  evening: string;
  night: string;
}

interface Medicine {
  medicine: string;
  before_after_food: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  medicine_times: MedicineTimes;
}

interface PrescriptionAnalysisResult {
  prescription_date: string;
  doctor: string;
  medicines: Medicine[];
  public_url: string;
}

async function convertPdfToImages(file: File): Promise<string[]> {
  console.log(`[PDF Conversion] Starting conversion for file: ${file.name}`);
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(PDF_TO_IMAGE_API_URL, {
    method: 'POST',
    body: formData
  });

  console.log(`[PDF Conversion] Response status: ${response.status}`);

  if (!response.ok) {
    const responseText = await response.text();
    console.error(`[PDF Conversion] Failed with status ${response.status}. Response: ${responseText}`);
    throw new Error(`PDF conversion failed with status ${response.status}. Response: ${responseText}`);
  }

  const data = await response.json();

  if (!data.base64_images || data.base64_images.length === 0) {
    console.error('[PDF Conversion] No images returned');
    throw new Error('PDF conversion returned no images');
  }

  console.log(`[PDF Conversion] Successfully converted ${data.base64_images.length} pages`);
  return data.base64_images;
}

async function processFile(file: File): Promise<{ base64Images: string[]; mimeType: string; }> {
  console.log(`[File Processing] Processing file: ${file.name}, type: ${file.type}`);
  
  if (file.type === 'application/pdf') {
    const images = await convertPdfToImages(file);
    return {
      base64Images: images,
      mimeType: 'image/png'
    };
  } else {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    return {
      base64Images: [base64Image],
      mimeType: file.type
    };
  }
}

async function analyzePrescription(images: string[], mimeType: string): Promise<PrescriptionAnalysisResult[]> {
  console.log(`[Prescription Analysis] Analyzing ${images.length} images`);
  try {
    const analyzeResponse = await fetch(`${BASE_URL}/api/analyze-prescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images, mimeType })
    });
    
    if (!analyzeResponse.ok) {
      const errorText = await analyzeResponse.text();
      throw new Error(`Analysis failed with status ${analyzeResponse.status}. Error: ${errorText}`);
    }
    
    const analysisResults: PrescriptionAnalysisResult[] = await analyzeResponse.json();
    console.log("[Prescription Analysis] Analysis results:", JSON.stringify(analysisResults, null, 2));
    return analysisResults;
  } catch (error) {
    console.error('[Prescription Analysis] Error:', error);
    throw error;
  }
}

async function storePrescription(results: PrescriptionAnalysisResult[]): Promise<void> {
  console.log(`[Prescription Storage] Storing prescriptions`);
  const endpoint = '/api/store-prescription';

  // Assuming we're only dealing with one prescription at a time
  const result = results[0];

  const prescriptionData = {
    prescription: {
      prescription_date: result.prescription_date,
      doctor: result.doctor,
      medicines: result.medicines.map(medicine => ({
        medicine: medicine.medicine,
        before_after_food: medicine.before_after_food,
        start_date: medicine.start_date,
        end_date: medicine.end_date,
        notes: medicine.notes,
        medicine_times: medicine.medicine_times
      })),
      public_url: result.public_url
    }
  };

  console.log('[Prescription Storage] Data to be sent:', JSON.stringify(prescriptionData, null, 2));

  const storeResponse = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prescriptionData)
  });
  
  if (!storeResponse.ok) {
    const errorText = await storeResponse.text();
    console.error(`[Prescription Storage] Failed with status ${storeResponse.status}. Error: ${errorText}`);
    throw new Error(`Storage failed with status ${storeResponse.status}. Error: ${errorText}`);
  }

  console.log(`[Prescription Storage] Successfully stored prescriptions`);
}

export async function POST(request: NextRequest) {
  console.log('[POST] Starting prescription processing');
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      console.error('[POST] No file uploaded');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    console.log(`[POST] File received: ${file.name}, type: ${file.type}`);

    // Upload file
    console.log('[POST] Uploading file');
    const uploadResponse = await fetch(`${BASE_URL}/api/upload-file-supabase`, {
      method: 'POST',
      body: formData
    });
    
    if (!uploadResponse.ok) {
      console.error(`[POST] Upload failed with status ${uploadResponse.status}`);
      throw new Error(`Upload failed with status ${uploadResponse.status}`);
    }
    
    const { publicUrl } = await uploadResponse.json();
    console.log(`[POST] File uploaded successfully. Public URL: ${publicUrl}`);

    const { base64Images, mimeType } = await processFile(file);
    console.log(`[POST] File processed into ${base64Images.length} images`);

    const analysisResults = await analyzePrescription(base64Images, mimeType);

    // Ensure public_url is set in the analysis results
    analysisResults[0].public_url = publicUrl;

    // Store results
    await storePrescription(analysisResults);

    console.log('[POST] All processing completed successfully');
    return NextResponse.json({ results: analysisResults, publicUrl });
  } catch (error) {
    console.error('Error processing prescription:', error);
    return NextResponse.json({ 
      error: 'Error processing prescription', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

//p