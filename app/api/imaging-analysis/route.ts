import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const MAX_BATCH_SIZE = 3;

if (!ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set in the environment variables');
}

if (!BASE_URL) {
  console.warn('BASE_URL is not set in the environment variables. Using default: http://localhost:3000');
}

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

interface ImagingResult {
  date: string;
  test_title: string;
  observations: string;
  doctor_name: string;
}

interface AnthropicResponseContent {
  type: string;
  id?: string;
  name?: string;
  input?: ImagingResult | ImagingResult[];
}

interface AnthropicResponse {
  content: AnthropicResponseContent[];
}

interface RequestBody {
  images: string[];
  mimeType: string;
  publicUrl: string;
}

function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

async function analyzeImagingBatch(images: string[], mimeType: string, doctorName: string): Promise<ImagingResult[]> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-API-Key': ANTHROPIC_API_KEY as string,
    'anthropic-version': '2023-06-01'
  };

  const tools = [{
    name: "imaging_analysis",
    description: "Analyze medical imaging results and extract key components.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date of the imaging test, in YYYY-MM-DD format. If not visible, use 'NOT_VISIBLE'." },
        test_title: { type: "string", description: "A short title for the imaging test" },
        observations: { type: "string", description: "Doctor's notes on the imaging result. Output none if not available" },
        doctor_name: { type: "string", description: "Name of the doctor. Output Not available if there is no data for this" }
      },
      required: ["date", "test_title", "observations", "doctor_name"]
    }
  }];

  const imageContent = images.map(base64Image => ({
    type: "image",
    source: {
      type: "base64",
      media_type: mimeType,
      data: base64Image
    }
  }));

  const body = {
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 4000,
    tools: tools,
    tool_choice: { type: "tool", name: "imaging_analysis" },
    messages: [
      {
        role: "user",
        content: [
          ...imageContent,
          {
            type: "text",
            text: `Analyze these ${images.length} medical imaging results. For each image, extract the following information: the date of the test, a short title for the test, and key observations or findings. If the date is not visible in an image, use 'NOT_VISIBLE' for the date field. Provide separate analysis for each image. Use the doctor name provided: ${doctorName}.`
          }
        ]
      }
    ]
  };

  const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body)
  });

  if (!anthropicResponse.ok) {
    throw new Error(`Anthropic API error: ${anthropicResponse.status} ${anthropicResponse.statusText}`);
  }

  const responseData: AnthropicResponse = await anthropicResponse.json();
  const toolUseContent = responseData.content.find((item: AnthropicResponseContent) => item.type === 'tool_use');
  
  if (!toolUseContent || !toolUseContent.input) {
    throw new Error('No analysis results found in the API response');
  }

  console.log('API Response:', JSON.stringify(toolUseContent, null, 2));

  let results: ImagingResult[];

  // Handle the case where a single result is returned
  if (!Array.isArray(toolUseContent.input)) {
    results = [toolUseContent.input as ImagingResult];
  } else {
    results = toolUseContent.input as ImagingResult[];
  }

  // Replace 'NOT_VISIBLE' dates with the current date
  const currentDate = getCurrentDate();
  results = results.map(result => ({
    ...result,
    date: result.date === 'NOT_VISIBLE' ? currentDate : result.date
  }));

  return results;
}

async function storeResults(results: ImagingResult[], publicUrl: string): Promise<void> {
  console.log(`[Result Storage] Storing results for URL: ${publicUrl}`);
  const endpoint = '/api/store/imaging-results';

  const storeResponse = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ results, publicUrl })
  });
  
  if (!storeResponse.ok) {
    const errorText = await storeResponse.text();
    console.error(`[Result Storage] Failed with status ${storeResponse.status}. Error: ${errorText}`);
    throw new Error(`Storage failed with status ${storeResponse.status}. Error: ${errorText}`);
  }

  console.log(`[Result Storage] Successfully stored results`);
}

export async function POST(request: NextRequest) {
  try {
    const requestBody: RequestBody = await request.json();
    console.log('Received request body keys:', Object.keys(requestBody));

    if (!requestBody.images || !Array.isArray(requestBody.images) || requestBody.images.length === 0) {
      console.error('Invalid input: images are missing, not an array, or empty');
      return NextResponse.json({ error: 'At least one image is required' }, { status: 400 });
    }

    if (!requestBody.mimeType) {
      console.error('Invalid input: mimeType is missing');
      return NextResponse.json({ error: 'mimeType is required' }, { status: 400 });
    }

    if (!requestBody.publicUrl) {
      console.error('Invalid input: publicUrl is missing');
      return NextResponse.json({ error: 'publicUrl is required' }, { status: 400 });
    }

    console.log(`Processing ${requestBody.images.length} images in batches of up to ${MAX_BATCH_SIZE}...`);

    const analysisResults: ImagingResult[] = [];
    for (let i = 0; i < requestBody.images.length; i += MAX_BATCH_SIZE) {
      const batch = requestBody.images.slice(i, i + MAX_BATCH_SIZE);
      const batchResults = await analyzeImagingBatch(batch, requestBody.mimeType, requestBody.publicUrl);
      analysisResults.push(...batchResults);
    }

    console.log('Analysis Results:', JSON.stringify(analysisResults, null, 2));

    // Store the results
    await storeResults(analysisResults, requestBody.publicUrl);

    return NextResponse.json({ message: 'Medical imaging analyzed and stored successfully', results: analysisResults });
  } catch (error) {
    console.error('Error processing medical imaging:', error);
    return NextResponse.json({ 
      error: 'Error processing medical imaging', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}