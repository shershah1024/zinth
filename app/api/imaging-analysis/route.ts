import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

if (!ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set in the environment variables');
}

interface ImagingResult {
  test_title: string;
  test_date: string;
  observations: string;
  doctor_name?: string;
}

interface AnthropicResponseContent {
  type: string;
  id?: string;
  name?: string;
  input?: ImagingResult;
}

interface AnthropicResponse {
  content: AnthropicResponseContent[];
}

interface RequestBody {
  images: string[];
  mimeType: string;
  doctorName: string;
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
      name: "imaging_analysis",
      description: "Analyze imaging test results and extract key components.",
      input_schema: {
        type: "object",
        properties: {
          test_title: { type: "string", description: "A short title for the imaging test" },
          test_date: { type: "string", description: "Date of the imaging test, in YYYY-MM-DD format. If not visible, use 'NOT_VISIBLE'." },
          observations: { type: "string", description: "Any notes/observations that the doctor has added. If none, you can add it as no observations" },
          doctor_name: { type: "string", description: "Name of the doctor" }
        },
        required: ["test_title", "test_date", "observations", "doctor_name"]
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
      temperature: 0.1,
      tool_choice: { type: "tool", name: "imaging_analysis" },
      messages: [
        {
          role: "user",
          content: [
            ...imageContent,
            {
              type: "text",
              text: "Analyze this imaging test result and extract the following information: a short title for the test, the date of the test, and key observations or findings. If the date is not visible in the image, use 'NOT_VISIBLE' for the test_date field. Provide separate analysis for each image if multiple images are present. Use the doctor name provided in the request."
            }
          ]
        }
      ]
    };

    console.log('Sending request to Anthropic API...');
    const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
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

    const analysisResults: ImagingResult[] = toolUseContents.map((content: AnthropicResponseContent) => {
      const result = content.input as ImagingResult;
      if (result.test_date === 'NOT_VISIBLE') {
        result.test_date = new Date().toISOString().split('T')[0]; // Use today's date in YYYY-MM-DD format
      }
      result.doctor_name = requestBody.doctorName; // Use the doctor name from the request
      return result;
    });

    return NextResponse.json(analysisResults);
  } catch (error) {
    console.error('Error analyzing imaging test results:', error);
    return NextResponse.json({ 
      error: 'Error analyzing imaging test results', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}