//app/api/find-document-type/route.ts


import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

if (!ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set in the environment variables');
}

type DocumentType = 'imaging_result' | 'health_record' | 'prescription';

interface AnthropicResponseContent {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content: AnthropicResponseContent[];
}

interface RequestBody {
  image: string;
  mimeType: string;
}

interface ClassificationResult extends RequestBody {
  type: DocumentType;
}

export async function POST(request: NextRequest) {
  try {
    const requestBody: RequestBody = await request.json();
    console.log('Received request body keys:', Object.keys(requestBody));

    if (!requestBody.image || typeof requestBody.image !== 'string' || requestBody.image.length === 0) {
      console.error('Invalid input: image is missing or empty');
      return NextResponse.json({ error: 'An image is required' }, { status: 400 });
    }

    if (!requestBody.mimeType) {
      console.error('Invalid input: mimeType is missing');
      return NextResponse.json({ error: 'mimeType is required' }, { status: 400 });
    }

    console.log('Received request with an image');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-API-Key': ANTHROPIC_API_KEY as string,
      'anthropic-version': '2023-06-01'
    };

    const body = {
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1000,
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: requestBody.mimeType,
                data: requestBody.image
              }
            },
            {
              type: "text",
              text: "Analyze this medical document and classify it as one of the following: 1. Imaging result, 2. Health record, 3. Prescription. Provide only the classification, nothing else."
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

    const responseData: AnthropicResponse = await anthropicResponse.json();

    const classificationText = responseData.content[0]?.text?.trim().toLowerCase();
    if (!classificationText) {
      console.error('No classification found in the response');
      return NextResponse.json({ 
        error: 'No classification found in the API response',
        details: 'The API response did not contain any classification'
      }, { status: 500 });
    }

    let type: DocumentType;
    if (classificationText.includes('imaging result')) {
      type = 'imaging_result';
    } else if (classificationText.includes('health record')) {
      type = 'health_record';
    } else if (classificationText.includes('prescription')) {
      type = 'prescription';
    } else {
      console.error('Unexpected classification:', classificationText);
      return NextResponse.json({ 
        error: 'Unexpected classification from API response',
        details: classificationText
      }, { status: 500 });
    }

    const result: ClassificationResult = {
      type,
      image: requestBody.image,
      mimeType: requestBody.mimeType
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