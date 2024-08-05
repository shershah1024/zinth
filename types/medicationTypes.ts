// types/medicationTypes.ts

// Timing and Value Types
export type PrescriptionStreakTiming = 'Morning' | 'Afternoon' | 'Evening' | 'Night';
export type LowercasePrescriptionStreakTiming = Lowercase<PrescriptionStreakTiming>;
export type PrescriptionTimingValue = 'true' | 'false';
export type PrescriptionStreakValue = 'TRUE' | 'FALSE' | null;
export type StreakValue = 'TRUE' | 'FALSE' | null;

// Timings Object Type
export type PrescriptionTimings = {
  [key in PrescriptionStreakTiming]: PrescriptionTimingValue;
};

// Streak Record Types
export type PrescriptionStreakRecord = Record<string, Record<LowercasePrescriptionStreakTiming, PrescriptionStreakValue>>;
export type StreakRecord = Record<string, { 
  morning: StreakValue; 
  afternoon: StreakValue; 
  evening: StreakValue; 
  night: StreakValue; 
}>;

// Base Medication Interface
interface BaseMedication {
  id: number;
  medicine: string;
  start_date: string;
  end_date: string;
  timings: PrescriptionTimings;
}

// Prescription Streak Medication
export interface PrescriptionStreakMedication extends BaseMedication {
  before_after_food: string;
  streak: PrescriptionStreakRecord;
  public_url?: string;
}

// Streak Medication (for use in dashboard)
export interface StreakMedication extends BaseMedication {
  before_after_food: string;
  streak: StreakRecord;
  public_url?: string;
}

// Past Medications
export interface PrescriptionStreakPastMedication extends BaseMedication {}

// Raw Medication Data (from API)
export interface PrescriptionRawMedication {
  id: number;
  medicine: string;
  before_after_food: string;
  start_date: string;
  end_date: string;
  streak: PrescriptionStreakRecord;
  morning: PrescriptionTimingValue;
  afternoon: PrescriptionTimingValue;
  evening: PrescriptionTimingValue;
  night: PrescriptionTimingValue;
  public_url?: string;
}

export interface PrescriptionRawPastMedication {
  id: number;
  medicine: string;
  start_date: string;
  end_date: string;
  morning: PrescriptionTimingValue;
  afternoon: PrescriptionTimingValue;
  evening: PrescriptionTimingValue;
  night: PrescriptionTimingValue;
}

// Type Aliases for Current and Past Medications
export type CurrentMedication = StreakMedication;
export type PastMedication = PrescriptionStreakPastMedication;

// Dashboard Props Types
export interface MedicationDashboardProps {
  currentMedications: StreakMedication[] | null;
  pastMedications: PastMedication[] | null;
  onUpdateAdherence: (medicationId: number, date: string, timing: PrescriptionStreakTiming, taken: boolean) => Promise<void>;
}

export interface MedicationDashboardWrapperProps {
  initialCurrentMedications: PrescriptionStreakMedication[];
  initialPastMedications: PrescriptionStreakPastMedication[];
}

// Helper function types
export type ConvertTimingToBoolean = (value: PrescriptionTimingValue | undefined) => boolean;
export type BooleanToStreakValue = (value: boolean) => PrescriptionStreakValue;