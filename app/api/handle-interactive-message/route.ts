// app/api/handle-interactive-message/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface WhatsAppMessage {
  from: string;
  interactive?: {
    type: string;
    button_reply?: {
      id: string;
      title: string;
    };
  };
}

async function sendMessage(to: string, text: string) {
  const url = `https://graph.facebook.com/v20.0/${process.env.PHONE_NUMBER_ID}/messages`;
  const headers = {
    'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json',
  };

  const data = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: 'text',
    text: { body: text }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    console.log('Message sent successfully:', responseData);
    return responseData;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

async function updateAdherence(patientNumber: string, medicationName: string, date: string, timing: string, taken: boolean, prescriptionId: number) {
  console.log(`Updating adherence for patient ${patientNumber}, medication ${medicationName}, date ${date}, timing ${timing}, taken ${taken}, prescriptionId ${prescriptionId}`);

  try {
    // Check if an entry already exists
    const { data: existingEntry, error: selectError } = await supabase
      .from('medication_streak')
      .select('*')
      .eq('prescription_id', prescriptionId)
      .eq('date', date)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 means no rows returned, which is fine
      throw selectError;
    }

    let result;
    if (existingEntry) {
      // If entry exists, update it
      const { data, error: updateError } = await supabase
        .from('medication_streak')
        .update({ [timing]: taken })
        .eq('prescription_id', prescriptionId)
        .eq('date', date)
        .select();
      
      if (updateError) throw updateError;
      result = data;
    } else {
      // If entry doesn't exist, insert a new one
      const { data, error: insertError } = await supabase
        .from('medication_streak')
        .insert({
          prescription_id: prescriptionId,
          medicine_name: medicationName,
          date: date,
          [timing]: taken
        })
        .select();
      
      if (insertError) throw insertError;
      result = data;
    }

    console.log('Adherence update result:', result);
    return result;
  } catch (error) {
    console.error('Error updating adherence:', error);
    throw error;
  }
}

export async function POST(req: Request) {
    try {
      const message: WhatsAppMessage = await req.json();
      console.log('Received interactive message:', JSON.stringify(message));
  
      if (message.interactive?.type === 'button_reply' && message.interactive.button_reply) {
        console.log('Received button reply:', message.interactive.button_reply);
        
        const { id, title } = message.interactive.button_reply;
        
        // Parse the button ID to extract information
        const [action, taken, patientNumber, medicationName, timing, reminderDate, prescriptionId] = id.split('_');
        
        if (action === 'yes' && taken === 'taken') {
          try {
            // Update adherence record
            await updateAdherence(
              patientNumber,
              medicationName.replace(/_/g, ' '),
              reminderDate,
              timing,
              true,
              parseInt(prescriptionId, 10)
            );
  
            // Send confirmation message
            const confirmationMessage = `Great job taking your ${medicationName.replace(/_/g, ' ')} ${timing} dose! 🎉 Your commitment to your health is awesome.`;
            await sendMessage(message.from, confirmationMessage);
  
            return NextResponse.json({ success: true, message: 'Adherence recorded and confirmation sent' });
          } catch (error) {
            console.error('Error updating adherence:', error);
            let errorMessage = "Oops! We couldn't record your medication right now. Don't worry, please try again later or contact support if this persists.";
            
            if (error instanceof Error) {
              if (error.message === 'Prescription not found or not current') {
                errorMessage = `It seems like ${medicationName.replace(/_/g, ' ')} is not in your current prescription. Please check with your healthcare provider.`;
              }
            }
            
            await sendMessage(message.from, errorMessage);
            return NextResponse.json({ error: 'Failed to update adherence' }, { status: 500 });
          }
        } else if (action === 'no' && taken === 'not_taken') {
          // Handle the case when the user hasn't taken their medication
          const reminderMessage = `I understand you haven't taken your ${medicationName.replace(/_/g, ' ')} ${timing} dose yet. Remember, it's important for your health. Is there anything preventing you from taking it?`;
          await sendMessage(message.from, reminderMessage);
          return NextResponse.json({ success: true, message: 'Reminder sent for missed dose' });
        } else {
          // Handle unexpected button actions
          await sendMessage(message.from, "I'm not sure how to handle that response. Could you please clarify or try again?");
          return NextResponse.json({ error: 'Unexpected button action' }, { status: 400 });
        }
      } else {
        await sendMessage(message.from, "I didn't quite catch that. Could you please use the buttons to respond?");
        return NextResponse.json({ error: 'Invalid message type' }, { status: 400 });
      }
    } catch (error) {
      console.error('Error processing interactive message:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }