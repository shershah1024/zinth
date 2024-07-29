// types/medicalTests.ts

export interface MedicalTest {
    id: number;
    created_at: string;
    patient_number: string;
    test_id: string;
    component: string;
    unit: string;
    number_value: number | null;
    text_value: string | null;
    normal_range_min: number | null;
    normal_range_max: number | null;
    date: string;
    public_url: string | null;
    normal_range_text: string | null;
  }
  
  export interface ProcessedTest {
    id: number;
    name: string;
    latestValue: number | string;
    unit: string;
    latestDate: string;
    normalRange: string;
    history: { date: string; value: number | string }[];
  }