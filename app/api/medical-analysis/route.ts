import { NextRequest, NextResponse } from 'next/server';
import { AnalysisResult } from '@/types/medical';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const PDF_TO_IMAGE_API_URL = 'https://pdftobase64image-jzfcn33k5q-uc.a.run.app/pdf-to-base64/';

if (!BASE_URL) {
  throw new Error('NEXT_PUBLIC_BASE_URL is not set in the environment variables');
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

async function processFile(file: File): Promise<{ base64Image: string; mimeType: string; pageNumber: number }[]> {
  console.log(`[File Processing] Processing file: ${file.name}, type: ${file.type}`);
  
  if (file.type === 'application/pdf') {
    const images = await convertPdfToImages(file);
    return images.map((base64Image, index) => ({
      base64Image,
      mimeType: 'image/png',
      pageNumber: index + 1
    }));
  } else {
    const fileBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(fileBuffer).toString('base64');
    return [{
      base64Image,
      mimeType: file.type,
      pageNumber: 1
    }];
  }
}

async function analyzeImages(images: { base64Image: string; mimeType: string; pageNumber: number }[]): Promise<AnalysisResult[]> {
  console.log(`[Image Analysis] Analyzing ${images.length} images`);
  const analyzeResponse = await fetch(`${BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(images)
  });
  
  if (!analyzeResponse.ok) {
    console.error(`[Image Analysis] Failed with status ${analyzeResponse.status}`);
    throw new Error(`Analysis failed with status ${analyzeResponse.status}`);
  }
  
  const analysisResults: AnalysisResult[] = await analyzeResponse.json();
  console.log("result is,", analysisResults)
  return analysisResults;
}

async function storeResult(result: AnalysisResult, publicUrl: string, pageNumber: number): Promise<void> {
  console.log(`[Result Storage] Storing result for page ${pageNumber}`);
  const endpoint = result.imaging_description ? '/api/store/imaging-result' : '/api/store/test-result';
  const storeResponse = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ result, publicUrl })
  });
  
  if (!storeResponse.ok) {
    console.error(`[Result Storage] Failed with status ${storeResponse.status}`);
    throw new Error(`Storage failed with status ${storeResponse.status}`);
  }
}

export async function POST(request: NextRequest) {
  console.log('[POST] Starting medical report processing');
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
    const uploadResponse = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!uploadResponse.ok) {
      console.error(`[POST] Upload failed with status ${uploadResponse.status}`);
      throw new Error(`Upload failed with status ${uploadResponse.status}`);
    }
    
    const { publicUrl } = await uploadResponse.json();
    console.log(`[POST] File uploaded successfully. Public URL: ${publicUrl}`);

    const processedImages = await processFile(file);
    console.log(`[POST] File processed into ${processedImages.length} images`);

    const analysisResults = await analyzeImages(processedImages);

    // Store results
    await Promise.all(analysisResults.map((result, index) => 
      storeResult(result, publicUrl, processedImages[index].pageNumber)
    ));

    console.log('[POST] All processing completed successfully');
    return NextResponse.json({ results: analysisResults, publicUrl });
  } catch (error) {
    console.error('Error processing medical report:', error);
    return NextResponse.json({ 
      error: 'Error processing medical report', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}