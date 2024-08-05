// app/api/handle-interactive-message/route.ts

import { NextResponse } from 'next/server';
import { sendMessage } from '@/utils/whatsappUtils';

const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || '';

export async function POST(req: Request) {
  try {
    const message = await req.json();
    console.log('Received interactive message:', JSON.stringify(message));

    if (message.interactive?.type === 'button_reply' && message.interactive.button_reply) {
      console.log('Processing button reply:', message.interactive.button_reply);
      
      const { id, title } = message.interactive.button_reply;
      
      // Parse the button ID to extract information
      const [action, taken, patientNumber, medicationName, timing, reminderDate, prescriptionId] = id.split('||');
      
      if (action === 'yes' && taken === 'taken') {
        try {
          // Call the update-adherence route
          const adherenceResponse = await fetch(`${NEXT_PUBLIC_BASE_URL}/api/update-adherence`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              patientNumber,
              medicationName: medicationName.replace(/_/g, ' '),
              date: reminderDate,
              timing,
              taken: true
            }),
          });

          if (!adherenceResponse.ok) {
            const errorData = await adherenceResponse.json();
            throw new Error(errorData.error || 'Failed to update adherence');
          }

          const adherenceResult = await adherenceResponse.json();
          console.log('Adherence update result:', adherenceResult);

          // Send confirmation message
          const confirmationMessage = `Great job taking your ${medicationName.replace(/_/g, ' ')} ${timing} dose! 🎉 Your commitment to your health is awesome.`;
          await sendMessage(message.from, confirmationMessage);

          return NextResponse.json({ success: true, message: 'Adherence recorded and confirmation sent' });
        } catch (error) {
          console.error('Error updating adherence:', error);
          let errorMessage = "Oops! We couldn't record your medication right now. Don't worry, please try again later or contact support if this persists.";
          
          if (error instanceof Error && error.message === 'Prescription not found or not current') {
            errorMessage = `It seems like ${medicationName.replace(/_/g, ' ')} is not in your current prescription. Please check with your healthcare provider.`;
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