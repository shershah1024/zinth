// types.ts

export interface TestHistoryPoint {
    date: string;
    value: number;
  }
  
  export interface TestElement {
    id: number;
    name: string;
    latestValue: number;
    unit: string;
    latestDate: string;
    normalRange: string;
    history: TestHistoryPoint[];
  }
  
  export interface MedicalTestsDashboardProps {
    initialTestElements?: TestElement[];
  }
  
  export interface MedicalTestsDashboardState {
    testElements: TestElement[];
    selectedElement: TestElement | null;
  }