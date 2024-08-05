import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const PATIENT_NUMBER = '919885842349';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

if (!ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set in the environment variables');
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
  components: TestComponent[];
  date: string;
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
  text: string;
}

function getTodayDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

const todayDate = getTodayDate();

async function analyzeMedicalReport(text: string): Promise<AnalysisResult> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-API-Key': ANTHROPIC_API_KEY as string,
    'anthropic-version': '2023-06-01'
  };

  const tools = [{
    name: "medical_report_analysis",
    description: "Analyze medical test message and extract key components.",
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
          description: `Date of the test, in YYYY-MM-DD format. If it is not given, use today's date (${getTodayDate()}).`
        },
      },
      required: ["components", "date"]
    }
  }];

  const content = [
    { type: "text", text: text },
    { type: "text", text: "Analyze this medical test report text. Extract all test components with their names, measurements, units, and normal ranges. Also provide the test date for the report." }
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

  return toolUseContent.input;
}

async function storeResults(results: AnalysisResult, publicUrl: string): Promise<void> {
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

    if (!requestBody.text || requestBody.text.trim().length === 0) {
      console.error('Invalid input: text is missing or empty');
      return NextResponse.json({ error: 'Text input is required' }, { status: 400 });
    }

    console.log(`Processing medical report text...`);

    const analysisResult = await analyzeMedicalReport(requestBody.text);

    console.log('Analysis Result:', JSON.stringify(analysisResult, null, 2));

    // Store the results
    const public_url="None"
    await storeResults(analysisResult, public_url);

    return NextResponse.json({ 
      message: 'Medical report analyzed and stored successfully', 
      result: analysisResult 
    });
  } catch (error) {
    console.error('Error processing medical report:', error);
    return NextResponse.json({ 
      error: 'Error processing medical report', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}