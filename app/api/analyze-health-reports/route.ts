import { NextRequest, NextResponse } from 'next/server';
import { AnalysisResult, TestComponent } from '@/types/medical';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const PDF_TO_IMAGE_API_URL = 'https://pdftobase64-4f8f77205c96.herokuapp.com/pdf-to-base64/';

if (!BASE_URL) {
  throw new Error('NEXT_PUBLIC_BASE_URL is not set in the environment variables');
}

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

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
    const fileBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(fileBuffer).toString('base64');
    return {
      base64Images: [base64Image],
      mimeType: file.type
    };
  }
}

async function analyzeImages(images: string[], mimeType: string): Promise<{ results: AnalysisResult[] }> {
  console.log(`[Image Analysis] Analyzing ${images.length} images`);
  const batchSize = 3;
  const allResults: AnalysisResult[] = [];

  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);
    console.log(`[Image Analysis] Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(images.length / batchSize)}`);

    const analyzeResponse = await fetch(`${BASE_URL}/api/analyze-health-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: batch, mimeType })
    });
  
    if (!analyzeResponse.ok) {
      console.error(`[Image Analysis] Failed with status ${analyzeResponse.status} for batch ${Math.floor(i / batchSize) + 1}`);
      throw new Error(`Analysis failed with status ${analyzeResponse.status} for batch ${Math.floor(i / batchSize) + 1}`);
    }
  
    const analysisData = await analyzeResponse.json();
    console.log(`[Image Analysis] Successfully processed batch ${Math.floor(i / batchSize) + 1}`);
  
    if (!analysisData.results || !Array.isArray(analysisData.results)) {
      console.error("[Image Analysis] Unexpected analysis results structure");
      throw new Error("Analysis results do not contain an array of results as expected");
    }
  
    allResults.push(...analysisData.results);
  }

  console.log(`[Image Analysis] Completed analysis of all ${images.length} images`);
  return { results: allResults };
}

async function storeResult(result: AnalysisResult, publicUrl: string, pageNumber: number): Promise<void> {
  console.log(`[Result Storage] Storing result for page ${pageNumber}`);
  const endpoint = '/api/store/test-results';

  const storeResponse = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ results: [result], publicUrl })
  });
  
  if (!storeResponse.ok) {
    const errorText = await storeResponse.text();
    console.error(`[Result Storage] Failed with status ${storeResponse.status}. Error: ${errorText}`);
    throw new Error(`Storage failed with status ${storeResponse.status}. Error: ${errorText}`);
  }

  console.log(`[Result Storage] Successfully stored result for page ${pageNumber}`);
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

    const analysisResults = await analyzeImages(base64Images, mimeType);

    // Store results
    for (let i = 0; i < analysisResults.results.length; i++) {
      await storeResult(analysisResults.results[i], publicUrl, i + 1);
    }

    console.log('[POST] All processing completed successfully');
    return NextResponse.json({ results: analysisResults.results, publicUrl });
  } catch (error) {
    console.error('Error processing medical report:', error);
    return NextResponse.json({ 
      error: 'Error processing medical report', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}