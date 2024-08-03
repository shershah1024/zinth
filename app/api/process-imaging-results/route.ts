// app/api/process-imaging-results/route.ts

import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const PDF_TO_IMAGE_API_URL = 'https://pdftobase64-4f8f77205c96.herokuapp.com/pdf-to-base64/';
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

async function convertPdfToImages(publicUrl: string): Promise<string[]> {
  console.log(`[PDF Conversion] Starting conversion for file at URL: ${publicUrl}`);

  const response = await fetch(`${PDF_TO_IMAGE_API_URL}?url=${encodeURIComponent(publicUrl)}`, {
    method: 'POST'
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

async function processFile(file: File, publicUrl: string): Promise<{ base64Images: string[]; mimeType: string; }> {
  console.log(`[File Processing] Processing file: ${file.name}, type: ${file.type}`);
  
  if (file.type === 'application/pdf') {
    const images = await convertPdfToImages(publicUrl);
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

    const { base64Images, mimeType } = await processFile(file, publicUrl);
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