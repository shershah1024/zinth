import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

if (!ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set in the environment variables');
}

type DocumentType = 'imaging_result' | 'health_record' | 'prescription';

interface RequestBody {
  image?: string;
  text?: string;
  mimeType?: string;
}

interface ClassificationResult extends RequestBody {
  type: DocumentType;
}

export async function POST(request: NextRequest) {
  try {
    const requestBody: RequestBody = await request.json();
    console.log('Received request body keys:', Object.keys(requestBody));

    if (!requestBody.image && !requestBody.text) {
      console.error('Invalid input: both image and text are missing');
      return NextResponse.json({ error: 'Either an image or text is required' }, { status: 400 });
    }

    if (requestBody.image && !requestBody.mimeType) {
      console.error('Invalid input: mimeType is missing for image input');
      return NextResponse.json({ error: 'mimeType is required when providing an image' }, { status: 400 });
    }

    console.log(`Received request with ${requestBody.image ? 'an image' : 'text'}`);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-API-Key': ANTHROPIC_API_KEY as string,
      'anthropic-version': '2023-06-01'
    };

    const tools = [{
      name: "classify_medical_document",
      description: "Classify a medical document as either an imaging result, health record (medical tests including blood and urine tests), or a prescription.",
      input_schema: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["imaging_result", "health_record", "prescription"],
            description: "The classification of the medical document"
          }
        },
        required: ["type"]
      }
    }];

    const content = [
      requestBody.image ? {
        type: "image",
        source: {
          type: "base64",
          media_type: requestBody.mimeType,
          data: requestBody.image
        }
      } : null,
      {
        type: "text",
        text: requestBody.text || "Analyze this medical document and classify it as one of the following: imaging result, health record, or prescription. Use the classify_medical_document tool to provide the classification."
      }
    ].filter(Boolean);

    const body = {
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1000,
      temperature: 0.1,
      tools: tools,
      tool_choice: { type: "tool", name: "classify_medical_document" },
      messages: [
        {
          role: "user",
          content: content
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

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error(`Anthropic API error: ${anthropicResponse.status} ${anthropicResponse.statusText}`);
      console.error('Response body:', errorText);
      return NextResponse.json({ 
        error: 'Error from Anthropic API', 
        status: anthropicResponse.status,
        details: errorText 
      }, { status: anthropicResponse.status });
    }

    const responseData = await anthropicResponse.json();
    const toolUseContent = responseData.content.find((item: any) => item.type === 'tool_use');

    if (!toolUseContent || !toolUseContent.input || !toolUseContent.input.type) {
      console.error('No classification found in the response');
      return NextResponse.json({ 
        error: 'No classification found in the API response',
        details: 'The API response did not contain any classification'
      }, { status: 500 });
    }

    const type = toolUseContent.input.type as DocumentType;

    const result: ClassificationResult = {
      type,
      ...(requestBody.image && { image: requestBody.image, mimeType: requestBody.mimeType }),
      ...(requestBody.text && { text: requestBody.text })
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error classifying medical document:', error);
    return NextResponse.json({ 
      error: 'Error classifying medical document', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}