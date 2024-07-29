import { NextRequest, NextResponse } from 'next/server';
import { AnalysisResult } from '@/types/medical';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set in the environment variables');
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
  images: string[];
  mimeType: string;
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

    console.log(`Received request with ${requestBody.images.length} images`);

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
                component: { type: "string", description: "Name of the test component" },
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
          imaging_description: {
            type: "string",
            description: "Description of X-ray or other imaging report findings, if available"
          },
          date: {
            type: "string",
            description: "Date of the test or imaging, in YYYY-MM-DD format"
          },
        },
        required: ["components"]
      }
    }];

    const imageContent = requestBody.images.map((base64Image: string) => ({
      type: "image",
      source: {
        type: "base64",
        media_type: requestBody.mimeType,
        data: base64Image
      }
    }));

    const body = {
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 4000,
      tools: tools,
      tool_choice: { type: "tool", name: "medical_report_analysis" },
      messages: [
        {
          role: "user",
          content: [
            ...imageContent,
            {
              type: "text",
              text: "Analyze these medical reports and extract all test components with their names, measurements, units, and normal ranges. If there are any X-ray or imaging report findings, include a description of those as well. Also provide the test date and a descriptive name for each test or imaging. Provide separate analysis for each image."
            }
          ]
        }
      ]
    };

    console.log('Sending request to Anthropic API...');
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    console.log('Anthropic API Response Status:', anthropicResponse.status);
    console.log('Anthropic API Response Headers:', JSON.stringify(anthropicResponse.headers, null, 2));

    const responseText = await anthropicResponse.text();
    console.log('Anthropic API Response Body:', responseText);

    if (!anthropicResponse.ok) {
      console.error(`Anthropic API error: ${anthropicResponse.status} ${anthropicResponse.statusText}`);
      console.error('Response body:', responseText);
      return NextResponse.json({ 
        error: 'Error from Anthropic API', 
        status: anthropicResponse.status,
        details: responseText 
      }, { status: anthropicResponse.status });
    }

    let responseData: AnthropicResponse;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      return NextResponse.json({ 
        error: 'Invalid JSON response from Anthropic API',
        details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      }, { status: 500 });
    }

    const toolUseContents = responseData.content.filter((item: AnthropicResponseContent) => item.type === 'tool_use');
    if (toolUseContents.length === 0) {
      console.error('No tool use content found in the response');
      return NextResponse.json({ 
        error: 'No analysis results found in the API response',
        details: 'The API response did not contain any tool use content'
      }, { status: 500 });
    }

    const analysisResults: AnalysisResult[] = toolUseContents.map((content: AnthropicResponseContent) => content.input as AnalysisResult);
    return NextResponse.json(analysisResults);
  } catch (error) {
    console.error('Error analyzing medical reports:', error);
    return NextResponse.json({ 
      error: 'Error analyzing medical reports', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}