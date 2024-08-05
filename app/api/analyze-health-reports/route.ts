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

interface TestComponent {
  component: string;
  value: number | string;
  unit: string;
  normal_range_min?: number;
  normal_range_max?: number;
  normal_range_text?: string;
}

interface AnalysisResult {
  date: string;
  components: TestComponent[];
  imaging_description?: string;
  descriptive_name?: string;
}

interface AnthropicResponseContent {
  type: string;
  id?: string;
  name?: string;
  input?: AnalysisResult;
}

interface AnthropicResponse {
  content: AnthropicResponseContent[];
}

interface RequestBody {
  images?: string[];
  texts?: string[];
  mimeType?: string;
  publicUrl: string;
}

async function analyzeMedicalReportBatch(images: string[] = [], texts: string[] = [], mimeType?: string): Promise<AnalysisResult[]> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-API-Key': ANTHROPIC_API_KEY as string,
    'anthropic-version': '2023-06-01'
  };

  const tools = [{
    name: "medical_report_analysis",
    description: "Analyze medical test report and extract key components.",
    input_schema: {
      type: "object",
      properties: {
        components: {
          type: "array",
          items: {
            type: "object",
            properties: {
              component: { type: "string", description: "Name of the test component. If it is part of the urine analysis preface the name of the component with 'Urine Test'" },
              value: { 
                oneOf: [
                  { type: "number" },
                  { type: "string" }
                ],
                description: "Measured value of the component" 
              },
              unit: { type: "string", description: "Unit of measurement" },
              normal_range_min: { type: "number", description: "Minimum of normal range" },
              normal_range_max: { type: "number", description: "Maximum of normal range" },
              normal_range_text: { type: "string", description: "Textual description of normal range" }
            },
            required: ["component"]
          },
          description: "List of test components and their details"
        },
        date: {
          type: "string",
          description: "Date of the test, in YYYY-MM-DD format"
        },
      },
      required: ["components", "date"]
    }
  }];

  const content = [
    ...images.map(base64Image => ({
      type: "image",
      source: {
        type: "base64",
        media_type: mimeType,
        data: base64Image
      }
    })),
    ...texts.map(text => ({
      type: "text",
      text: text
    })),
    {
      type: "text",
      text: `Analyze these ${images.length} medical test report images and ${texts.length} textual reports. Extract all test components with their names, measurements, units, and normal ranges. Also provide the test date for each report. If there are imaging results, include a description.`
    }
  ];

  const body = {
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 4000,
    tools: tools,
    tool_choice: { type: "tool", name: "medical_report_analysis" },
    messages: [
      {
        role: "user",
        content: content
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

  // Handle the case where a single result is returned
  if (!Array.isArray(toolUseContent.input)) {
    return [toolUseContent.input];
  }

  return toolUseContent.input;
}

async function storeResults(results: AnalysisResult[], publicUrl: string): Promise<void> {
  console.log(`[Result Storage] Storing results for URL: ${publicUrl}`);
  const endpoint = '/api/store/test-results';

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

    if ((!requestBody.images || requestBody.images.length === 0) && (!requestBody.texts || requestBody.texts.length === 0)) {
      console.error('Invalid input: both images and texts are missing or empty');
      return NextResponse.json({ error: 'At least one image or text input is required' }, { status: 400 });
    }

    if (requestBody.images && requestBody.images.length > 0 && !requestBody.mimeType) {
      console.error('Invalid input: mimeType is missing for image input');
      return NextResponse.json({ error: 'mimeType is required when providing images' }, { status: 400 });
    }

    if (!requestBody.publicUrl) {
      console.error('Invalid input: publicUrl is missing');
      return NextResponse.json({ error: 'publicUrl is required' }, { status: 400 });
    }

    const totalInputs = (requestBody.images?.length || 0) + (requestBody.texts?.length || 0);
    console.log(`Processing ${totalInputs} inputs in batches of up to ${MAX_BATCH_SIZE}...`);

    const analysisResults: AnalysisResult[] = [];
    for (let i = 0; i < totalInputs; i += MAX_BATCH_SIZE) {
      const imageBatch = requestBody.images?.slice(i, i + MAX_BATCH_SIZE) || [];
      const textBatch = requestBody.texts?.slice(i, i + MAX_BATCH_SIZE) || [];
      const batchResults = await analyzeMedicalReportBatch(imageBatch, textBatch, requestBody.mimeType);
      analysisResults.push(...batchResults);
    }

    console.log('Analysis Results:', JSON.stringify(analysisResults, null, 2));

    // Store the results
    await storeResults(analysisResults, requestBody.publicUrl);

    return NextResponse.json({ message: 'Medical reports analyzed and stored successfully', results: analysisResults });
  } catch (error) {
    console.error('Error processing medical reports:', error);
    return NextResponse.json({ 
      error: 'Error processing medical reports', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}