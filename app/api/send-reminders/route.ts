import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const TIMEZONE_OFFSET = 5.5; // GMT+5:30

interface Patient {
  patient_number: string;
}

interface Medication {
  medicine: string;
  prescription_id: number;
}

interface TwoButtonMessage {
  bodyText: string;
  button1: {
    id: string;
    title: string;
  };
  button2: {
    id: string;
    title: string;
  };
}

// Utility functions
async function fetchWithTimeout(resource: string, options: RequestInit & { timeout?: number } = {}) {
  const { timeout = 8000 } = options;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  const response = await fetch(resource, {
    ...options,
    signal: controller.signal  
  });
  clearTimeout(id);
  
  return response;
}

async function handleFetchErrors(response: Response) {
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}

function getCurrentTimeOfDay(): string | null {
  const now = new Date();
  const hours = now.getUTCHours() + TIMEZONE_OFFSET;
  
  if (hours >= 5 && hours < 11) return 'morning';
  if (hours >= 11 && hours < 16) return 'afternoon';
  if (hours >= 16 && hours < 21) return 'evening';
  if (hours >= 21 || hours < 5) return 'night';
  
  return null;
}

function getCurrentDate() {
  return new Date().toISOString().split('T')[0]; // Returns date in YYYY-MM-DD format
}

async function fetchUniquePatients(timeOfDay: string): Promise<Patient[]> {
  console.log(`Fetching unique patients for ${timeOfDay}`);
  const currentDate = getCurrentDate();
  console.log(`Current date for prescription check: ${currentDate}`);
  
  const { data, error } = await supabase
    .from('prescriptions')
    .select('patient_number')
    .eq(timeOfDay, true)
    .lte('start_date', currentDate)
    .gte('end_date', currentDate);

  if (error) {
    console.error('Error fetching patients:', error);
    throw error;
  }

  console.log(`Raw patient data fetched: ${JSON.stringify(data)}`);

  const uniquePatients: {[key: string]: boolean} = {};
  data?.forEach(row => {
    uniquePatients[row.patient_number] = true;
  });

  const patients = Object.keys(uniquePatients).map(number => ({ patient_number: number }));
  console.log(`Unique patients found: ${patients.length}`);
  console.log(`Patient numbers: ${patients.map(p => p.patient_number).join(', ')}`);
  
  return patients;
}

async function fetchPatientMedications(patientNumber: string, timeOfDay: string): Promise<Medication[]> {
  console.log(`Fetching medications for patient ${patientNumber} for ${timeOfDay}`);
  const currentDate = getCurrentDate();
  
  const { data, error } = await supabase
    .from('prescriptions')
    .select('id, medicine')
    .eq('patient_number', patientNumber)
    .eq(timeOfDay, true)
    .lte('start_date', currentDate)
    .gte('end_date', currentDate);

  if (error) {
    console.error(`Error fetching medications for patient ${patientNumber}:`, error);
    throw error;
  }
  
  console.log(`Medications found for patient ${patientNumber}: ${JSON.stringify(data)}`);
  return data?.map(item => ({ medicine: item.medicine, prescription_id: item.id })) || [];
}

async function sendTwoButtonMessage(
  to: string,
  message: TwoButtonMessage
) {
  const url = `https://graph.facebook.com/v20.0/${process.env.PHONE_NUMBER_ID}/messages`;
  const headers = {
    'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json',
  };

  const data = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: message.bodyText
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: message.button1.id,
              title: message.button1.title
            }
          },
          {
            type: 'reply',
            reply: {
              id: message.button2.id,
              title: message.button2.title
            }
          }
        ]
      }
    }
  };

  try {
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data),
    });

    await handleFetchErrors(response);

    const responseData = await response.json();
    console.log('Two-button message sent successfully:', responseData);
    return responseData;
  } catch (error) {
    console.error('Error sending two-button message:', error);
    throw error;
  }
}

async function sendReminderMessage(patientNumber: string, medicine: string, timing: string, prescriptionId: number) {
  const currentDate = getCurrentDate();
  console.log(`Preparing reminder message for patient ${patientNumber}, medicine: ${medicine}, timing: ${timing}, date: ${currentDate}, prescriptionId: ${prescriptionId}`);
  
  const message: TwoButtonMessage = {
    bodyText: `Have you taken your ${timing} dose of ${medicine}?`,
    button1: {
      id: `yes_taken_${patientNumber}_${medicine.replace(/\s+/g, '_')}_${timing}_${currentDate}_${prescriptionId}`,
      title: "Yes"
    },
    button2: {
      id: `no_not_taken_${patientNumber}_${medicine.replace(/\s+/g, '_')}_${timing}_${currentDate}_${prescriptionId}`,
      title: "No"
    }
  };

  try {
    console.log(`Sending WhatsApp message to ${patientNumber}`);
    await sendTwoButtonMessage(patientNumber, message);
    console.log(`Reminder successfully sent to ${patientNumber} for ${medicine} (${timing})`);
  } catch (error) {
    console.error(`Error sending reminder to ${patientNumber} for ${medicine} (${timing}):`, error);
    throw error;
  }
}

async function sendReminders() {
  console.log('Starting sendReminders function');
  const timeOfDay = getCurrentTimeOfDay();
  if (!timeOfDay) {
    console.log('Not a medication reminder time. Skipping.');
    return 0;
  }

  console.log(`Current time of day: ${timeOfDay}`);
  const patients = await fetchUniquePatients(timeOfDay);
  console.log(`Sending reminders for ${timeOfDay}. Total patients: ${patients.length}`);
  
  let totalReminders = 0;
  for (const patient of patients) {
    console.log(`Processing patient: ${patient.patient_number}`);
    const medications = await fetchPatientMedications(patient.patient_number, timeOfDay);
    console.log(`Medications for patient ${patient.patient_number}: ${medications.length}`);
    for (const medication of medications) {
      await sendReminderMessage(patient.patient_number, medication.medicine, timeOfDay, medication.prescription_id);
      totalReminders++;
    }
  }
  
  console.log(`Total reminders sent: ${totalReminders}`);
  return totalReminders;
}

export async function GET() {
  console.log('Received GET request to send reminders');
  try {
    const reminderCount = await sendReminders();
    console.log(`Successfully sent ${reminderCount} reminders`);
    return NextResponse.json({ message: `Sent ${reminderCount} reminders` });
  } catch (error) {
    console.error('Error sending reminders:', error);
    return NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 });
  }
}