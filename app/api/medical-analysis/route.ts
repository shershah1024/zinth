import { NextRequest, NextResponse } from 'next/server';
import { AnalysisResult } from '@/types/medical';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

if (!BASE_URL) {
  throw new Error('NEXT_PUBLIC_BASE_URL is not set in the environment variables');
}

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

async function uploadAndConvertFile(file: File): Promise<{ base64Images: string[]; mimeType: string; publicUrl: string }> {
  console.log(`[File Processing] Processing file: ${file.name}, type: ${file.type}`);
  
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${BASE_URL}/api/upload-and-convert`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    console.error(`[File Processing] Failed with status ${response.status}`);
    throw new Error(`File processing failed with status ${response.status}`);
  }

  const data = await response.json();
  return {
    base64Images: Array.isArray(data.base64_images) ? data.base64_images : [data.base64_images],
    mimeType: data.mimeType,
    publicUrl: data.url
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

    const { base64Images, mimeType, publicUrl } = await uploadAndConvertFile(file);
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