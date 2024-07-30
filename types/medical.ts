export interface TestComponent {
    component: string;
    unit: string;
    value: number | string;
    normal_range_min?: number;
    normal_range_max?: number;
    normal_range_text?: string;
  }
  
  export interface AnalysisResult {
    components: TestComponent[];
    imaging_description?: string;
    date?: string;
    descriptive_name?: string;
  }

  export interface PrescriptionAnalysisResult {
    prescription_date: string;
    doctor_name?: string;
    medicines: {
      medicine: string;
      daily_frequency: string;
      before_after_food: string;
      start_date?: string;
      end_date?: string;
      notes?: string;
    }[];
  }

  export interface Medicine {
    medicine: string;
    daily_frequency: string;
    before_after_food: string;
    start_date?: string;
    end_date?: string;
    notes?: string;
  }
  
  