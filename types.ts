
export interface FlagRecord {
  date: string;
  studentName: string;
  yearGroup: string;
  teacher: string;
  reason: string; // This will map to Reward Description
  category: string; // This will map to the Category column
  house: string;
  form: string;
  subject: string;
  points: number;
  timestamp?: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
}

export interface StudentHotspot {
  name: string;
  count: number;
  mainReason: string;
  summary: string;
}

export interface YearGroupAnalysis {
  year: string;
  insight: string;
  priority: string;
  interventions: string[];
  alerts: string[];
}

export interface AnalysisSummary {
  totalFlags: number;
  topTeacher: string;
  topYearGroup: string;
  mostCommonReason: string;
  busiestDay: string;
  aiInsights: string;
  interventions: string[];
  yearInsights: YearGroupAnalysis[];
  temporalSpikes: string[]; // Specific weeks/periods identified as spikes
  trends: {
    byTeacher: ChartDataPoint[];
    byYearGroup: ChartDataPoint[];
    byReason: ChartDataPoint[];
    byDay: ChartDataPoint[];
    overTime: ChartDataPoint[];
    bySubject: ChartDataPoint[];
    byHouse: ChartDataPoint[];
    byCategory: ChartDataPoint[];
  };
  hotspots: {
    students: StudentHotspot[];
  };
}

export interface AppState {
  isAnalyzing: boolean;
  error: string | null;
  data: FlagRecord[] | null;
  analysis: AnalysisSummary | null;
}
