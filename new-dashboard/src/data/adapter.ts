import { respiratoryData as rawRespiratoryData, seasonLabels as rawSeasonLabels } from "@legacy-data";
import {
  DashboardSnapshot,
  HistoricalComparisonPoint,
  HistoricalComparisonSnapshot,
  HistoricalMetricComparison,
  WeeklyIliPoint,
  WeeklySariPoint,
} from "../domain/model";
import { RespiratoryDataSchema, SeasonLabelsSchema } from "./contracts";

const DEFAULT_DATASET = "NNGYK";
const DEFAULT_ILI_VIRUS = "ILI (flu-like illness)";
export const ILI_THRESHOLD = 28900;

const respiratoryData = RespiratoryDataSchema.parse(rawRespiratoryData);
const seasonLabels = SeasonLabelsSchema.parse(rawSeasonLabels);

function seasonWeekIndex(week: number): number {
  return week >= 40 ? week : week + 53;
}

function seasonWeekCompare(a: number, b: number): number {
  return seasonWeekIndex(a) - seasonWeekIndex(b);
}

function weekLabel(week: number): string {
  return `W${String(week).padStart(2, "0")}`;
}

function normalizeSeasonLabel(year: number): string {
  const fromSource = seasonLabels[String(year)];
  if (fromSource) return fromSource;
  return `${year}-${year + 1}`;
}

function aggregateIliSeries(year: number): WeeklyIliPoint[] {
  const buckets = new Map<number, number>();

  for (const row of respiratoryData.weekly) {
    if ((row.dataset ?? DEFAULT_DATASET) !== DEFAULT_DATASET) continue;
    if (row.year !== year) continue;
    if (row.virus !== DEFAULT_ILI_VIRUS) continue;

    const week = Number(row.week);
    if (!Number.isFinite(week)) continue;
    const cases = Number(row.cases ?? 0);
    buckets.set(week, (buckets.get(week) ?? 0) + (Number.isFinite(cases) ? cases : 0));
  }

  return Array.from(buckets.entries())
    .sort((a, b) => seasonWeekCompare(a[0], b[0]))
    .map(([week, cases]) => ({ week, label: weekLabel(week), cases }));
}

function aggregateSariSeries(year: number): WeeklySariPoint[] {
  const buckets = new Map<number, { admissions: number; icu: number }>();

  for (const row of respiratoryData.sariWeekly) {
    if (row.year !== year) continue;

    const week = Number(row.week);
    if (!Number.isFinite(week)) continue;

    const admissions = Number(row.admissions ?? 0);
    const icu = Number(row.icu ?? 0);

    const current = buckets.get(week) ?? { admissions: 0, icu: 0 };
    current.admissions += Number.isFinite(admissions) ? admissions : 0;
    current.icu += Number.isFinite(icu) ? icu : 0;
    buckets.set(week, current);
  }

  return Array.from(buckets.entries())
    .sort((a, b) => seasonWeekCompare(a[0], b[0]))
    .map(([week, values]) => ({
      week,
      label: weekLabel(week),
      admissions: values.admissions,
      icu: values.icu,
    }));
}

function pickAvailableYears(): number[] {
  const sourceYears = new Set<number>(respiratoryData.years);
  for (const row of respiratoryData.weekly) sourceYears.add(Number(row.year));
  for (const row of respiratoryData.sariWeekly) sourceYears.add(Number(row.year));

  return Array.from(sourceYears)
    .filter((year) => Number.isFinite(year))
    .sort((a, b) => a - b);
}

function buildWeekMap<T extends { week: number }>(rows: T[], valueGetter: (row: T) => number): Map<number, number> {
  const map = new Map<number, number>();
  for (const row of rows) {
    const week = Number(row.week);
    if (!Number.isFinite(week)) continue;
    const value = Number(valueGetter(row));
    if (!Number.isFinite(value)) continue;
    map.set(week, (map.get(week) ?? 0) + value);
  }
  return map;
}

function unionWeeks(maps: Map<number, number>[]): number[] {
  const weeks = new Set<number>();
  for (const map of maps) {
    for (const week of map.keys()) {
      if (Number.isFinite(week)) weeks.add(week);
    }
  }
  return Array.from(weeks).sort((a, b) => seasonWeekCompare(a, b));
}

function latestPercentChange(previous: Map<number, number>, current: Map<number, number>, weeks: number[]): number | null {
  for (let idx = weeks.length - 1; idx >= 0; idx -= 1) {
    const week = weeks[idx];
    const prev = previous.get(week);
    const curr = current.get(week);
    if (typeof prev !== "number" || typeof curr !== "number") continue;
    if (!Number.isFinite(prev) || !Number.isFinite(curr) || prev === 0) continue;
    return ((curr - prev) / prev) * 100;
  }
  return null;
}

function emptyHistoricalMetric(): HistoricalMetricComparison {
  return { points: [], latestDeltaPercent: null };
}

function buildHistoricalMetric(previous: Map<number, number>, current: Map<number, number>, weeks: number[]): HistoricalMetricComparison {
  const points: HistoricalComparisonPoint[] = weeks.map((week) => {
    const previousValue = previous.has(week) ? previous.get(week) ?? null : null;
    const currentValue = current.has(week) ? current.get(week) ?? null : null;
    const previousNumber = typeof previousValue === "number" ? previousValue : null;
    const currentNumber = typeof currentValue === "number" ? currentValue : null;
    const deltaPercent =
      previousNumber != null && currentNumber != null && Number.isFinite(previousNumber) && Number.isFinite(currentNumber) && previousNumber !== 0
        ? ((currentNumber - previousNumber) / previousNumber) * 100
        : null;
    return {
      week,
      label: weekLabel(week),
      previous: previousValue,
      current: currentValue,
      deltaPercent,
    };
  });

  return {
    points,
    latestDeltaPercent: latestPercentChange(previous, current, weeks),
  };
}

function buildHistoricalComparisonSnapshot(selectedYear: number, availableYears: number[]): HistoricalComparisonSnapshot {
  const compareYear = availableYears.includes(selectedYear - 1) ? selectedYear - 1 : null;
  const currentSeasonLabel = normalizeSeasonLabel(selectedYear);
  const compareSeasonLabel = compareYear == null ? null : normalizeSeasonLabel(compareYear);

  if (compareYear == null) {
    return {
      available: false,
      compareYear: null,
      compareSeasonLabel: null,
      currentSeasonLabel,
      ili: emptyHistoricalMetric(),
      sariAdmissions: emptyHistoricalMetric(),
      sariIcu: emptyHistoricalMetric(),
    };
  }

  const iliPrevious = aggregateIliSeries(compareYear);
  const iliCurrent = aggregateIliSeries(selectedYear);
  const sariPrevious = aggregateSariSeries(compareYear);
  const sariCurrent = aggregateSariSeries(selectedYear);

  const iliPreviousMap = buildWeekMap(iliPrevious, (row) => row.cases);
  const iliCurrentMap = buildWeekMap(iliCurrent, (row) => row.cases);
  const sariAdmissionsPreviousMap = buildWeekMap(sariPrevious, (row) => row.admissions);
  const sariAdmissionsCurrentMap = buildWeekMap(sariCurrent, (row) => row.admissions);
  const sariIcuPreviousMap = buildWeekMap(sariPrevious, (row) => row.icu);
  const sariIcuCurrentMap = buildWeekMap(sariCurrent, (row) => row.icu);

  const weeks = unionWeeks([
    iliPreviousMap,
    iliCurrentMap,
    sariAdmissionsPreviousMap,
    sariAdmissionsCurrentMap,
    sariIcuPreviousMap,
    sariIcuCurrentMap,
  ]);

  if (!weeks.length) {
    return {
      available: false,
      compareYear,
      compareSeasonLabel,
      currentSeasonLabel,
      ili: emptyHistoricalMetric(),
      sariAdmissions: emptyHistoricalMetric(),
      sariIcu: emptyHistoricalMetric(),
    };
  }

  return {
    available: true,
    compareYear,
    compareSeasonLabel,
    currentSeasonLabel,
    ili: buildHistoricalMetric(iliPreviousMap, iliCurrentMap, weeks),
    sariAdmissions: buildHistoricalMetric(sariAdmissionsPreviousMap, sariAdmissionsCurrentMap, weeks),
    sariIcu: buildHistoricalMetric(sariIcuPreviousMap, sariIcuCurrentMap, weeks),
  };
}

export function buildDashboardSnapshot(selectedYear?: number): DashboardSnapshot {
  const availableYears = pickAvailableYears();
  const fallbackYear = availableYears.length ? availableYears[availableYears.length - 1] : new Date().getFullYear();
  const year =
    typeof selectedYear === "number" && Number.isFinite(selectedYear) && availableYears.includes(selectedYear)
      ? selectedYear
      : fallbackYear;

  const iliSeries = aggregateIliSeries(year);
  const sariSeries = aggregateSariSeries(year);
  const historical = buildHistoricalComparisonSnapshot(year, availableYears);

  const totalIliCases = iliSeries.reduce((sum, point) => sum + point.cases, 0);
  const peak = iliSeries.reduce<WeeklyIliPoint | null>((max, point) => (!max || point.cases > max.cases ? point : max), null);
  const latestIliPoint = iliSeries.length ? iliSeries[iliSeries.length - 1] : null;
  const latestSariPoint = sariSeries.length ? sariSeries[sariSeries.length - 1] : null;
  const firstIliThresholdCrossingWeek = (() => {
    if (iliSeries.length < 2) return null;
    for (let idx = 1; idx < iliSeries.length; idx += 1) {
      if (iliSeries[idx].cases >= ILI_THRESHOLD && iliSeries[idx - 1].cases < ILI_THRESHOLD) {
        return iliSeries[idx].week;
      }
    }
    return null;
  })();

  const warnings: string[] = [];
  if (!iliSeries.length) warnings.push("No ILI rows for this season in legacy source.");
  if (!sariSeries.length) warnings.push("No SARI rows for this season in legacy source.");

  return {
    selectedYear: year,
    seasonLabel: normalizeSeasonLabel(year),
    availableYears,
    iliThreshold: ILI_THRESHOLD,
    iliSeries,
    sariSeries,
    historical,
    stats: {
      totalIliCases,
      peakIliWeek: peak?.week ?? null,
      peakIliCases: peak?.cases ?? null,
      latestWeek: latestIliPoint?.week ?? latestSariPoint?.week ?? null,
      latestIliCases: latestIliPoint?.cases ?? 0,
      latestSariAdmissions: latestSariPoint?.admissions ?? null,
      latestSariIcu: latestSariPoint?.icu ?? null,
      weeksAboveIliThreshold: iliSeries.filter((point) => point.cases >= ILI_THRESHOLD).length,
      firstIliThresholdCrossingWeek,
    },
    warnings,
  };
}
