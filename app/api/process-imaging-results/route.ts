//app/api/process-imaging-results/route.ts

import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

if (!BASE_URL) {
  throw new Error('NEXT_PUBLIC_BASE_URL is not set in the environment variables');
}

interface ImagingResult {
  test_title: string;
  test_date: string;
  observations: string;
  doctor_name: string;
}

async function analyzeImagingResult(images: string[], mimeType: string, doctorName: string): Promise<ImagingResult[]> {
  console.log(`[Imaging Analysis] Analyzing ${images.length} images`);
  try {
    const analyzeResponse = await fetch(`${BASE_URL}/api/imaging-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images, mimeType, doctorName })
    });
    
    if (!analyzeResponse.ok) {
      const errorText = await analyzeResponse.text();
      throw new Error(`Analysis failed with status ${analyzeResponse.status}. Error: ${errorText}`);
    }
    
    const analysisResults: ImagingResult[] = await analyzeResponse.json();
    console.log("[Imaging Analysis] Analysis results:", JSON.stringify(analysisResults, null, 2));
    return analysisResults;
  } catch (error) {
    console.error('[Imaging Analysis] Error:', error);
    throw error;
  }
}

async function storeImagingResult(result: ImagingResult, publicUrl: string, patientNumber: string): Promise<void> {
  console.log(`[Imaging Storage] Storing imaging result`);
  const endpoint = '/api/store/imaging-result';

  const imagingData = {
    result: {
      date: result.test_date,
      test: result.test_title,
      comments: result.observations,
      doctor: result.doctor_name
    },
    publicUrl,
    patient_number: patientNumber
  };

  console.log('[Imaging Storage] Data to be sent:', JSON.stringify(imagingData, null, 2));

  const storeResponse = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(imagingData)
  });
  
  if (!storeResponse.ok) {
    const errorText = await storeResponse.text();
    console.error(`[Imaging Storage] Failed with status ${storeResponse.status}. Error: ${errorText}`);
    throw new Error(`Storage failed with status ${storeResponse.status}. Error: ${errorText}`);
  }

  console.log(`[Imaging Storage] Successfully stored imaging result`);
}

export async function POST(request: NextRequest) {
  console.log('[POST] Starting imaging result processing');
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const patientNumber = '919885842349'; // Static patient number
    const doctorName = formData.get('doctorName') as string || 'Unknown Doctor'; // Get from form data or use default

    if (!file) {
      console.error('[POST] No file uploaded');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    console.log(`[POST] File received: ${file.name}, type: ${file.type}`);
    console.log(`[POST] Processing for Patient: ${patientNumber}, Doctor: ${doctorName}`);

    // Use the new upload-and-convert route
    const uploadConvertResponse = await fetch(`${BASE_URL}/api/upload-and-convert`, {
      method: 'POST',
      body: formData
    });
    
    if (!uploadConvertResponse.ok) {
      console.error(`[POST] Upload and convert failed with status ${uploadConvertResponse.status}`);
      throw new Error(`Upload and convert failed with status ${uploadConvertResponse.status}`);
    }
    
    const { publicUrl, base64Data, mimeType } = await uploadConvertResponse.json();
    console.log(`[POST] File uploaded and converted successfully. Public URL: ${publicUrl}`);

    const base64Images = Array.isArray(base64Data) ? base64Data : [base64Data];
    console.log(`[POST] File processed into ${base64Images.length} images`);

    const analysisResults = await analyzeImagingResult(base64Images, mimeType, doctorName);

    // Store results
    await storeImagingResult(analysisResults[0], publicUrl, patientNumber);

    console.log('[POST] All processing completed successfully');
    return NextResponse.json({ results: analysisResults, publicUrl, patientNumber });
  } catch (error) {
    console.error('Error processing imaging result:', error);
    return NextResponse.json({ 
      error: 'Error processing imaging result', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}