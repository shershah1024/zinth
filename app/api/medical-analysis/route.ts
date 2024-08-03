import { NextRequest, NextResponse } from 'next/server';
import { AnalysisResult, TestComponent } from '@/types/medical';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

if (!BASE_URL) {
  throw new Error('NEXT_PUBLIC_BASE_URL is not set in the environment variables');
}

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

async function uploadAndConvert(file: File): Promise<{ publicUrl: string; base64Images: string[]; mimeType: string }> {
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

  if (!result.url || !result.base64_images || !result.mimeType) {
    console.error('[Upload and Convert] Invalid response structure');
    throw new Error('Invalid response from upload and convert');
  }

  return {
    publicUrl: result.url,
    base64Images: result.base64_images,
    mimeType: result.mimeType
  };
}

async function analyzeImages(images: string[], mimeType: string): Promise<{ results: AnalysisResult[] }> {
  console.log(`[Image Analysis] Analyzing ${images.length} images`);
  const analyzeResponse = await fetch(`${BASE_URL}/api/analyze-health-reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images, mimeType })
  });
  
  if (!analyzeResponse.ok) {
    console.error(`[Image Analysis] Failed with status ${analyzeResponse.status}`);
    throw new Error(`Analysis failed with status ${analyzeResponse.status}`);
  }
  
  const analysisData = await analyzeResponse.json();
  console.log("[Image Analysis] Analysis results:", JSON.stringify(analysisData, null, 2));
  
  if (!analysisData.results || !Array.isArray(analysisData.results)) {
    console.error("[Image Analysis] Unexpected analysis results structure");
    throw new Error("Analysis results do not contain an array of results as expected");
  }
  
  return analysisData;
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

    // Upload and convert file
    const { publicUrl, base64Images, mimeType } = await uploadAndConvert(file);
    console.log(`[POST] File uploaded and converted. Public URL: ${publicUrl}`);

    // Analyze images
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