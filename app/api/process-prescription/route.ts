import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const ANALYZE_PRESCRIPTION_URL = `${BASE_URL}/api/analyze-prescription`;
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
}

async function uploadAndConvert(file: File): Promise<{ publicUrl: string; base64Data: string[]; mimeType: string }> {
  console.log('[Upload and Convert] Starting file upload and conversion');
  
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${BASE_URL}/api/upload-and-convert`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Upload and Convert] Failed with status ${response.status}. Error: ${errorText}`);
    throw new Error(`Upload and convert failed with status ${response.status}. Error: ${errorText}`);
  }

  const result = await response.json();
  console.log('[Upload and Convert] Successfully uploaded and converted file');
  console.log('[Upload and Convert] Result:', JSON.stringify(result, null, 2));

  if (!result.url) {
    console.error('[Upload and Convert] Missing URL in response');
    throw new Error('Missing URL in upload and convert response');
  }

  return {
    publicUrl: result.url,
    base64Data: result.base64_images,
    mimeType: result.mimeType
  };
}

async function analyzePrescription(base64Data: string[], mimeType: string, publicUrl: string): Promise<PrescriptionAnalysisResult[]> {
  console.log(`[Prescription Analysis] Starting analysis. MIME type: ${mimeType}`);
  console.log(`[Prescription Analysis] Number of images: ${base64Data.length}`);
  
  const analyzeResponse = await fetch(ANALYZE_PRESCRIPTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: base64Data, mimeType, publicUrl })
  });
  
  if (!analyzeResponse.ok) {
    const errorText = await analyzeResponse.text();
    console.error(`[Prescription Analysis] Failed with status ${analyzeResponse.status}. Error: ${errorText}`);
    throw new Error(`Analysis failed with status ${analyzeResponse.status}. Error: ${errorText}`);
  }
  
  const analysisResults: PrescriptionAnalysisResult[] = await analyzeResponse.json();
  console.log("[Prescription Analysis] Analysis results:", JSON.stringify(analysisResults, null, 2));
  return analysisResults;
}

export async function POST(request: NextRequest) {
  console.log('[POST] Starting prescription processing');
  try {
    const formData = await request.formData();
    console.log('[POST] Received form data keys:', Array.from(formData.keys()));

    const file = formData.get('file') as File;
    if (!file) {
      console.error('[POST] Missing file in form data');
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    console.log(`[POST] Received file:`);
    console.log(`  File name: ${file.name}`);
    console.log(`  File type: ${file.type}`);
    console.log(`  File size: ${file.size} bytes`);

    // Step 1: Upload and Convert
    const { publicUrl, base64Data, mimeType } = await uploadAndConvert(file);
    console.log(`[POST] File uploaded and converted. Public URL: ${publicUrl}`);

    // Step 2: Analyze Prescription (which now includes storage)
    const analysisResults = await analyzePrescription(base64Data, mimeType, publicUrl);

    console.log('[POST] All processing completed successfully');
    const response = { results: analysisResults, publicUrl };
    console.log('[POST] Sending response:', JSON.stringify(response, null, 2));
    return NextResponse.json(response);
  } catch (error) {
    console.error('[POST] Error processing prescription:', error);
    return NextResponse.json({ 
      error: 'Error processing prescription', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}