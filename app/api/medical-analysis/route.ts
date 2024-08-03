import { NextRequest, NextResponse } from 'next/server';
import { AnalysisResult } from '@/types/medical';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const UPLOAD_AND_CONVERT_ENDPOINT = `${BASE_URL}/api/upload-and-convert`;
const ANALYZE_HEALTH_REPORTS_ENDPOINT = `${BASE_URL}/api/analyze-health-reports`;
const MAX_BATCH_SIZE = 3;

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

if (!BASE_URL) {
  throw new Error('NEXT_PUBLIC_BASE_URL is not set in the environment variables');
}

async function uploadAndConvertFile(file: File): Promise<{ url: string; base64_images: string[]; mimeType: string }> {
  console.log(`[File Upload and Conversion] Starting for file: ${file.name}`);
  
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(UPLOAD_AND_CONVERT_ENDPOINT, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[File Upload and Conversion] Failed with status ${response.status}. Error: ${errorText}`);
    throw new Error(`File upload and conversion failed with status ${response.status}. Error: ${errorText}`);
  }

  const result = await response.json();
  console.log(`[File Upload and Conversion] Completed successfully. URL: ${result.url}, MIME type: ${result.mimeType}`);
  
  // Ensure base64_images is always an array
  const base64Images = Array.isArray(result.base64_images) ? result.base64_images : [result.base64_images];
  
  return {
    url: result.url,
    base64_images: base64Images,
    mimeType: result.mimeType
  };
}

async function analyzeImages(images: string[], mimeType: string, publicUrl: string): Promise<AnalysisResult[]> {
  console.log(`[Image Analysis] Analyzing ${images.length} images`);
  const allResults: AnalysisResult[] = [];

  for (let i = 0; i < images.length; i += MAX_BATCH_SIZE) {
    const batch = images.slice(i, i + MAX_BATCH_SIZE);
    console.log(`[Image Analysis] Processing batch ${i / MAX_BATCH_SIZE + 1} with ${batch.length} images`);

    const analyzeResponse = await fetch(ANALYZE_HEALTH_REPORTS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: batch, mimeType, publicUrl })
    });
    
    if (!analyzeResponse.ok) {
      console.error(`[Image Analysis] Batch analysis failed with status ${analyzeResponse.status}`);
      throw new Error(`Analysis failed with status ${analyzeResponse.status}`);
    }
    
    const batchData = await analyzeResponse.json();
    if (!batchData.results || !Array.isArray(batchData.results)) {
      console.error("[Image Analysis] Unexpected analysis results structure");
      throw new Error("Analysis results do not contain an array of results as expected");
    }
    
    allResults.push(...batchData.results);
  }
  
  console.log(`[Image Analysis] Completed. Total results: ${allResults.length}`);
  return allResults;
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
    const { url, base64_images, mimeType } = await uploadAndConvertFile(file);
    console.log(`[POST] File processed into ${base64_images.length} images`);

    // Analyze images
    const analysisResults = await analyzeImages(base64_images, mimeType, url);

    console.log('[POST] All processing completed successfully');
    return NextResponse.json({ results: analysisResults, publicUrl: url });
  } catch (error) {
    console.error('Error processing medical report:', error);
    return NextResponse.json({ 
      error: 'Error processing medical report', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}