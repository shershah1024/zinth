// app/api/send-reminders/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendMessage } from '@/utils/whatsappUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface Patient {
  patient_number: string;
}

interface Medication {
  medicine: string;
}

const TIMEZONE_OFFSET = 5.5; // GMT+5:30

function getCurrentTimeOfDay(): string | null {
  const now = new Date();
  const patientHour = (now.getUTCHours() + TIMEZONE_OFFSET) % 24;
  
  console.log(`Current UTC time: ${now.toISOString()}, Patient time (GMT+5:30): ${patientHour}:${now.getUTCMinutes()}`);
  
  if (patientHour === 7) return 'morning';
  if (patientHour === 13) return 'afternoon';
  if (patientHour === 16.25) return 'evening';
  if (patientHour === 19) return 'night';
  
  console.log(`Not a medication reminder time. Current hour: ${patientHour}`);
  return null;
}

async function fetchUniquePatients(timeOfDay: string): Promise<Patient[]> {
  console.log(`Fetching unique patients for ${timeOfDay}`);
  const currentDate = new Date().toISOString().split('T')[0];
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

  // Use an object to track unique patient numbers
  const uniquePatients: {[key: string]: boolean} = {};
  data?.forEach(row => {
    uniquePatients[row.patient_number] = true;
  });

  // Convert the object keys back to an array of Patient objects
  const patients = Object.keys(uniquePatients).map(number => ({ patient_number: number }));
  console.log(`Unique patients found: ${patients.length}`);
  console.log(`Patient numbers: ${patients.map(p => p.patient_number).join(', ')}`);
  
  return patients;
}

async function fetchPatientMedications(patientNumber: string, timeOfDay: string): Promise<Medication[]> {
  console.log(`Fetching medications for patient ${patientNumber} for ${timeOfDay}`);
  const currentDate = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('prescriptions')
    .select('medicine')
    .eq('patient_number', patientNumber)
    .eq(timeOfDay, true)
    .lte('start_date', currentDate)
    .gte('end_date', currentDate);

  if (error) {
    console.error(`Error fetching medications for patient ${patientNumber}:`, error);
    throw error;
  }
  
  console.log(`Medications found for patient ${patientNumber}: ${JSON.stringify(data)}`);
  return data || [];
}

async function sendReminderMessage(patientNumber: string, medicine: string) {
  console.log(`Preparing reminder message for patient ${patientNumber}, medicine: ${medicine}`);
  const reminderId = `${patientNumber}_${medicine.replace(/\s+/g, '_')}`;
  console.log(`Generated reminder ID: ${reminderId}`);
  
  const message = {
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: `Have you taken your medication: ${medicine}?`
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: `yes_taken_${reminderId}`,
              title: "Yes"
            }
          },
          {
            type: "reply",
            reply: {
              id: `no_not_taken_${reminderId}`,
              title: "No"
            }
          }
        ]
      }
    }
  };

  try {
    console.log(`Sending WhatsApp message to ${patientNumber}`);
    await sendMessage(patientNumber, JSON.stringify(message));
    console.log(`Reminder successfully sent to ${patientNumber} for ${medicine}`);
  } catch (error) {
    console.error(`Error sending reminder to ${patientNumber} for ${medicine}:`, error);
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
      await sendReminderMessage(patient.patient_number, medication.medicine);
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