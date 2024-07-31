// /types/StreakTypes.ts

export type StreakTiming = 'Morning' | 'Afternoon' | 'Evening' | 'Night';
export type TimingValue = 'true' | 'false';

export enum StreakTimingStatus {
  Taken = 'Taken',
  NotTaken = 'NotTaken'
}

export interface StreakMedication {
  id: number;
  medicine: string;
  before_after_food: string;
  start_date: string;
  end_date: string;
  timings: Record<StreakTiming, TimingValue>;
  streak: Record<string, Partial<Record<StreakTiming, StreakTimingStatus>>>;
}

export interface StreakPastMedication {
  id: number;
  medicine: string;
  start_date: string;
  end_date: string;
  timings: Record<StreakTiming, TimingValue>;
}