export interface WeeklyIliPoint {
  week: number;
  label: string;
  cases: number;
}

export interface WeeklySariPoint {
  week: number;
  label: string;
  admissions: number;
  icu: number;
}

export interface VirologyDetectionRow {
  week: number;
  label: string;
  virus: string;
  detections: number;
}

export interface VirologyPositivityRow {
  week: number;
  label: string;
  virus: string;
  positivity: number;
}

export interface VirologySnapshot {
  available: boolean;
  latestWeek: number | null;
  availableDetectionViruses: string[];
  detectionRows: VirologyDetectionRow[];
  positivityRows: VirologyPositivityRow[];
}

export interface EuVirologySnapshot {
  available: boolean;
  availableYears: number[];
  targetYear: number | null;
  latestWeek: number | null;
  detectionRows: VirologyDetectionRow[];
  positivityRows: VirologyPositivityRow[];
}

export interface WastewaterPoint {
  year: number;
  week: number;
  label: string;
  virus: string;
  concentration: number;
  unit: "GC/L";
}

export interface WastewaterSourceData {
  available: boolean;
  sourceUrl: string | null;
  sourceUpdatedAt: string | null;
  provisional: boolean;
  points: WastewaterPoint[];
}

export interface WastewaterSnapshot extends WastewaterSourceData {
  latestYear: number | null;
  latestWeek: number | null;
}

export interface HistoricalComparisonPoint {
  week: number;
  label: string;
  previous: number | null;
  current: number | null;
  deltaPercent: number | null;
}

export interface HistoricalMetricComparison {
  points: HistoricalComparisonPoint[];
  latestDeltaPercent: number | null;
}

export interface HistoricalComparisonSnapshot {
  available: boolean;
  compareYear: number | null;
  compareSeasonLabel: string | null;
  currentSeasonLabel: string;
  ili: HistoricalMetricComparison;
  sariAdmissions: HistoricalMetricComparison;
  sariIcu: HistoricalMetricComparison;
}

export interface DashboardStats {
  totalIliCases: number;
  peakIliWeek: number | null;
  peakIliCases: number | null;
  latestWeek: number | null;
  latestIliCases: number;
  latestSariAdmissions: number | null;
  latestSariIcu: number | null;
  weeksAboveIliThreshold: number;
  firstIliThresholdCrossingWeek: number | null;
}

export interface DashboardSnapshot {
  selectedYear: number;
  seasonLabel: string;
  availableYears: number[];
  iliThreshold: number;
  iliSeries: WeeklyIliPoint[];
  sariSeries: WeeklySariPoint[];
  virology: VirologySnapshot;
  euVirology: EuVirologySnapshot;
  wastewater: WastewaterSnapshot;
  historical: HistoricalComparisonSnapshot;
  stats: DashboardStats;
  warnings: string[];
}
