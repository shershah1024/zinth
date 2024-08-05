import { NextResponse } from 'next/server';
import { sendMessage } from '@/utils/whatsappUtils';
import { createClient } from '@supabase/supabase-js';

const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || '';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  try {
    const message = await req.json();
    console.log('Received interactive message:', JSON.stringify(message));

    if (message.interactive?.type === 'button_reply' && message.interactive.button_reply) {
      console.log('Processing button reply:', message.interactive.button_reply);
      
      const { id, title } = message.interactive.button_reply;

      // Parse the button ID to extract information
      const parsedData = JSON.parse(id);

      let { action, taken, patientNumber, medicationName, timing, reminderDate, prescriptionId } = parsedData;

      // Replace underscores with spaces in medicationName
      medicationName = medicationName.replace(/_/g, ' ');

      console.log(`Parsed data: action=${action}, taken=${taken}, patientNumber=${patientNumber}, prescriptionId=${prescriptionId}, medicationName=${medicationName}, timing=${timing}, reminderDate=${reminderDate}`);

      // Verify that the prescription is current and matches the medication
      const { data: prescription, error: prescriptionError } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('id', prescriptionId)
        .single();

      if (prescriptionError || !prescription) {
        throw new Error('Prescription not found or no longer active');
      }

      if (prescription.medicine.toLowerCase() !== medicationName.toLowerCase()) {
        console.log(`Mismatch: prescription.medicine=${prescription.medicine}, medicationName=${medicationName}`);
        throw new Error('Medication name does not match the prescription');
      }

      const isTaken = action === 'true' && taken === 'taken';

      try {
        console.log('Sending update-adherence request with data:', {
          prescription_id: parseInt(prescriptionId, 10),
          date: reminderDate,
          timing,
          taken,
          medicine_name: medicationName
        });

        // Call the update-adherence route
        const adherenceResponse = await fetch(`${NEXT_PUBLIC_BASE_URL}/api/update-adherence`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prescription_id: parseInt(prescriptionId, 10),
            date: reminderDate,
            timing,
            taken,
            medicine_name: medicationName
          }),
        });

        if (!adherenceResponse.ok) {
          const errorData = await adherenceResponse.json();
          throw new Error(errorData.error || 'Failed to update adherence');
        }

        const adherenceData = await adherenceResponse.json();
        console.log('Adherence update result:', adherenceData);

        // Send confirmation message
        let confirmationMessage;
        if (isTaken) {
          confirmationMessage = `Great job taking your ${medicationName} ${timing} dose! 🎉 Your commitment to your health is awesome.`;
        } else {
          confirmationMessage = `I've recorded that you haven't taken your ${medicationName} ${timing} dose. Remember, it's important for your health. Is there anything preventing you from taking it?`;
        }
        await sendMessage(message.from, confirmationMessage);

        return NextResponse.json({ success: true, message: 'Adherence recorded and confirmation sent' });
      } catch (error) {
        console.error('Error updating adherence:', error);
        let errorMessage = "Oops! We couldn't record your medication right now. Don't worry, please try again later or contact support if this persists.";
        
        if (error instanceof Error) {
          if (error.message === 'Prescription not found or no longer active') {
            errorMessage = `It seems like ${medicationName} is not in your current prescription. Please check with your healthcare provider.`;
          } else if (error.message === 'Medication name does not match the prescription') {
            errorMessage = `There seems to be a mismatch with your medication information. Please contact support for assistance.`;
          } else {
            errorMessage = error.message;
          }
        }
        
        await sendMessage(message.from, errorMessage);
        return NextResponse.json({ error: 'Failed to update adherence' }, { status: 500 });
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
