// StreakTypes.ts

export type StreakTiming = 'morning' | 'afternoon' | 'evening' | 'night';

export enum StreakTimingStatus {
  NotTaken = 'NotTaken',
  Taken = 'Taken'
}

export type TimingValue = 'true' | 'false';

export interface StreakMedication {
  id: number;
  medicine: string;
  before_after_food: string;
  start_date: string;
  end_date: string;
  streak: Record<string, Partial<Record<StreakTiming, StreakTimingStatus>>>;
  timings: Partial<Record<StreakTiming, TimingValue>>;
}

export interface StreakPastMedication {
  id: number;
  medicine: string;
  start_date: string;
  end_date: string;
  timings: Partial<Record<StreakTiming, TimingValue>>;
}