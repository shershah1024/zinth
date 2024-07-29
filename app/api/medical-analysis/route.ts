import { NextRequest, NextResponse } from 'next/server';
import { AnalysisResult, TestComponent } from '@/types/medical';

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

async function processFile(file: File): Promise<{ base64Images: string[]; mimeType: string; }> {
  console.log(`[File Processing] Processing file: ${file.name}, type: ${file.type}`);
  
  if (file.type === 'application/pdf') {
    const images = await convertPdfToImages(file);
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

async function analyzeImages(images: string[], mimeType: string): Promise<AnalysisResult[]> {
  console.log(`[Image Analysis] Analyzing ${images.length} images`);
  const analyzeResponse = await fetch(`${BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images, mimeType })
  });
  
  if (!analyzeResponse.ok) {
    console.error(`[Image Analysis] Failed with status ${analyzeResponse.status}`);
    throw new Error(`Analysis failed with status ${analyzeResponse.status}`);
  }
  
  const analysisResults: AnalysisResult[] = await analyzeResponse.json();
  console.log("[Image Analysis] Analysis results:", JSON.stringify(analysisResults, null, 2));
  return analysisResults;
}

async function storeResult(result: AnalysisResult, publicUrl: string, pageNumber: number): Promise<void> {
  console.log(`[Result Storage] Storing result for page ${pageNumber}`);
  const endpoint = result.imaging_description ? '/api/store/imaging-result' : '/api/store/test-result';

  const formattedResult: AnalysisResult = {
    date: result.date || new Date().toISOString().split('T')[0],
    components: result.components.map((component: TestComponent) => ({
      component: component.component,
      value: component.value,
      unit: component.unit,
      normal_range_min: component.normal_range_min,
      normal_range_max: component.normal_range_max,
      normal_range_text: component.normal_range_text
    })),
    imaging_description: result.imaging_description,
    descriptive_name: result.descriptive_name
  };

  const storeResponse = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ result: formattedResult, publicUrl })
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

    const { base64Images, mimeType } = await processFile(file);
    console.log(`[POST] File processed into ${base64Images.length} images`);

    const analysisResults = await analyzeImages(base64Images, mimeType);

    // Store results
    await Promise.all(analysisResults.map((result, index) => 
      storeResult(result, publicUrl, index + 1)
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