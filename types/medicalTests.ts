// /types/medicalTests.ts

export interface HistoryRecord {
  date: string;
  value: number | string;
}

export interface ProcessedTest {
  id: string;
  name: string;
  unit: string;
  normalRange: string;
  latestValue: number | string;
  latestDate: string;
  history: HistoryRecord[];
}

export interface MedicalTest {
  id: string;
  component: string;
  date: string;
  number_value: number | null;
  text_value: string | null;
  unit: string;
  normal_range_text: string | null;
  normal_range_min: number | null;
  normal_range_max: number | null;
  created_at: string;
}