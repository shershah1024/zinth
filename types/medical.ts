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