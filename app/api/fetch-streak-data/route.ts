import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, 
);
export const revalidate = 60;


export async function GET() {
  try {
    const { data: streakData, error: streakError } = await supabase
      .from('medication_streak')
      .select('*')
      .order('date', { ascending: false });

    if (streakError) throw streakError;

    const formattedStreakData = streakData.reduce((acc: Record<number, Record<string, Record<string, boolean>>>, streak) => {
      if (!acc[streak.prescription_id]) {
        acc[streak.prescription_id] = {};
      }
      if (!acc[streak.prescription_id][streak.date]) {
        acc[streak.prescription_id][streak.date] = {};
      }
      
      // Only add timings that are true
      if (streak.morning) acc[streak.prescription_id][streak.date].morning = true;
      if (streak.afternoon) acc[streak.prescription_id][streak.date].afternoon = true;
      if (streak.evening) acc[streak.prescription_id][streak.date].evening = true;
      if (streak.night) acc[streak.prescription_id][streak.date].night = true;

      return acc;
    }, {});

    return NextResponse.json(formattedStreakData);
  } catch (error) {
    console.error('Error fetching medication streak data:', error);
    return NextResponse.json({ error: 'Error fetching medication streak data' }, { status: 500 });
  }
}