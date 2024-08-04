import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

if (!ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set in the environment variables');
}

if (!BASE_URL) {
  throw new Error('NEXT_PUBLIC_BASE_URL is not set in the environment variables');
}

interface MedicineTimes {
  morning: string;
  afternoon: string;
  evening: string;
  night: string;
}

interface Medicine {
  medicine: string;
  before_after_food: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  medicine_times: MedicineTimes;
}

interface PrescriptionAnalysisResult {
  prescription_date: string;
  doctor: string;
  medicines: Medicine[];
}

interface AnthropicResponseContent {
  type: string;
  id?: string;
  name?: string;
  input?: PrescriptionAnalysisResult;
}

interface AnthropicResponse {
  content: AnthropicResponseContent[];
}

interface RequestBody {
  images: string[];
  mimeType: string;
  publicUrl?: string;
}

async function storePrescription(results: PrescriptionAnalysisResult[], publicUrl: string): Promise<void> {
  console.log(`[Prescription Storage] Starting storage process`);
  console.log(`[Prescription Storage] Public URL: ${publicUrl}`);
  console.log(`[Prescription Storage] Input results:`, JSON.stringify(results, null, 2));
  
  const endpoint = '/api/store-prescription';

  // Assuming we're only dealing with one prescription at a time
  const result = results[0];

  const prescriptionData = {
    prescription: {
      prescription_date: result.prescription_date,
      doctor: result.doctor,
      medicines: result.medicines.map(medicine => ({
        medicine: medicine.medicine,
        before_after_food: medicine.before_after_food,
        start_date: medicine.start_date,
        end_date: medicine.end_date,
        notes: medicine.notes,
        medicine_times: medicine.medicine_times
      })),
      public_url: publicUrl
    }
  };

  console.log('[Prescription Storage] Data to be sent:', JSON.stringify(prescriptionData, null, 2));

  const storeResponse = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prescriptionData)
  });
  
  if (!storeResponse.ok) {
    const errorText = await storeResponse.text();
    console.error(`[Prescription Storage] Failed with status ${storeResponse.status}. Error: ${errorText}`);
    throw new Error(`Storage failed with status ${storeResponse.status}. Error: ${errorText}`);
  }

  console.log(`[Prescription Storage] Successfully stored prescription`);
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

    console.log(`Received request with ${requestBody.images.length} images`);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-API-Key': ANTHROPIC_API_KEY as string,
      'anthropic-version': '2023-06-01'
    };

    const tools = [{
      name: "prescription_analysis",
      description: "Analyze prescription image and extract key components.",
      input_schema: {
        type: "object",
        properties: {
          prescription_date: { type: "string", description: "Date of the prescription, in YYYY-MM-DD format" },
          doctor: { type: "string", description: "Name of the prescribing doctor" },
          medicines: {
            type: "array",
            items: {
              type: "object",
              properties: {
                medicine: { type: "string", description: "Name of the medicine" },
                before_after_food: { type: "string", description: "Whether to take before or after food. The default is after food" },
                start_date: { type: "string", description: "Start date for the medicine, in YYYY-MM-DD format" },
                end_date: { type: "string", description: "End date for the medicine, in YYYY-MM-DD format" },
                notes: { type: "string", description: "Any additional notes or instructions for this medicine" },
                medicine_times: { 
                  type: "object",
                  properties: {
                    morning: { type: "string", description: "Whether to take the medicine in the morning." },
                    afternoon: { type: "string", description: "Whether to take the medicine in the afternoon" },
                    evening: { type: "string", description: "Whether to take the medicine in the evening" },
                    night: { type: "string", description: "Whether to take the medicine at night" }
                  },
                  description: "Times to take the medicine. Look at the 1-0-0-1 style marking on the prescription. Set true for each time the medicine should be taken."
                }
              },
              required: ["medicine", "before_after_food", "medicine_times"]
            },
            description: "List of prescribed medicines and their details"
          }
        },
        required: ["prescription_date", "doctor", "medicines"]
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
      tool_choice: { type: "tool", name: "prescription_analysis" },
      messages: [
        {
          role: "user",
          content: [
            ...imageContent,
            {
              type: "text",
              text: "Analyze this prescription image and extract the following information: prescription date, doctor's name, public URL of the image, and for each medicine: name, whether to take before or after food, start date, end date, any additional notes, and the times to take the medicine (morning, afternoon, evening, night) based on the 1-0-0-1 style marking. Set each time (morning, afternoon, evening, night) to true or false based on whether the medicine should be taken at that time. Provide separate analysis for each image if multiple images are present."
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

    const analysisResults: PrescriptionAnalysisResult[] = toolUseContents.map((content: AnthropicResponseContent) => content.input as PrescriptionAnalysisResult);
    
    // Store the prescription
    await storePrescription(analysisResults, requestBody.publicUrl);

    return NextResponse.json(analysisResults);
  } catch (error) {
    console.error('Error analyzing prescription:', error);
    return NextResponse.json({ 
      error: 'Error analyzing prescription', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}