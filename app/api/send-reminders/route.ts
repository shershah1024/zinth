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
  
  if (patientHour === 7) return 'morning';
  if (patientHour === 13) return 'afternoon';
  if (patientHour === 17) return 'evening';
  if (patientHour === 19) return 'night';
  
  return null;
}

async function fetchUniquePatients(timeOfDay: string): Promise<Patient[]> {
  const currentDate = new Date().toISOString().split('T')[0];
  
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

  // Use an object to track unique patient numbers
  const uniquePatients: {[key: string]: boolean} = {};
  data?.forEach(row => {
    uniquePatients[row.patient_number] = true;
  });

  // Convert the object keys back to an array of Patient objects
  return Object.keys(uniquePatients).map(number => ({ patient_number: number }));
}

async function fetchPatientMedications(patientNumber: string, timeOfDay: string): Promise<Medication[]> {
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
  return data || [];
}

async function sendReminderMessage(patientNumber: string, medicine: string) {
    const reminderId = `${patientNumber}_${medicine.replace(/\s+/g, '_')}`;
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
    await sendMessage(patientNumber, JSON.stringify(message));
    console.log(`Reminder sent to ${patientNumber} for ${medicine}`);
  } catch (error) {
    console.error(`Error sending reminder to ${patientNumber} for ${medicine}:`, error);
  }
}

async function sendReminders() {
  const timeOfDay = getCurrentTimeOfDay();
  if (!timeOfDay) {
    console.log('Not a medication reminder time. Skipping.');
    return 0;
  }

  const patients = await fetchUniquePatients(timeOfDay);
  console.log(`Sending reminders for ${timeOfDay}. Total patients: ${patients.length}`);
  
  let totalReminders = 0;
  for (const patient of patients) {
    const medications = await fetchPatientMedications(patient.patient_number, timeOfDay);
    for (const medication of medications) {
      await sendReminderMessage(patient.patient_number, medication.medicine);
      totalReminders++;
    }
  }
  
  return totalReminders;
}

export async function GET() {
  try {
    const reminderCount = await sendReminders();
    return NextResponse.json({ message: `Sent ${reminderCount} reminders` });
  } catch (error) {
    console.error('Error sending reminders:', error);
    return NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 });
  }
}