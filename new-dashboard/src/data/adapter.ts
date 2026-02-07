import { respiratoryData as rawRespiratoryData, seasonLabels as rawSeasonLabels } from "@legacy-data";
import {
  DashboardSnapshot,
  EuVirologySnapshot,
  HistoricalComparisonPoint,
  HistoricalComparisonSnapshot,
  HistoricalMetricComparison,
  VirologyDetectionRow,
  VirologyPositivityRow,
  VirologySnapshot,
  WeeklyIliPoint,
  WeeklySariPoint,
} from "../domain/model";
import { RespiratoryData, RespiratoryDataSchema, SeasonLabelsSchema } from "./contracts";

const DEFAULT_DATASET = "NNGYK";
const DEFAULT_ILI_VIRUS = "ILI (flu-like illness)";
export const VIRO_ALL_KEY = "__all_viruses__";
export const INFLUENZA_ALL_KEY = "__influenza_all__";
export const ILI_THRESHOLD = 28900;
const NH_RESP_SEASON_START_WEEK = 40;
const NH_RESP_SEASON_END_WEEK = 20;

const bundledRespiratoryData = RespiratoryDataSchema.parse(rawRespiratoryData);
const bundledSeasonLabels = SeasonLabelsSchema.parse(rawSeasonLabels);

export interface IliAgeSplitPoint {
  year: number;
  week: number;
  age0to14: number;
  age15to34: number;
  age35to59: number;
  age60plus: number;
}

export interface DashboardDataSource {
  source: "bundled" | "nngyk_all";
  respiratoryData: RespiratoryData;
  seasonLabels: Record<string, string>;
  iliAgeSplits: IliAgeSplitPoint[];
  note?: string;
}

export function createBundledDataSource(note?: string): DashboardDataSource {
  return {
    source: "bundled",
    respiratoryData: bundledRespiratoryData,
    seasonLabels: bundledSeasonLabels,
    iliAgeSplits: [],
    note,
  };
}

function seasonWeekIndex(week: number): number {
  return week >= NH_RESP_SEASON_START_WEEK ? week : week + 53;
}

function seasonWeekCompare(a: number, b: number): number {
  return seasonWeekIndex(a) - seasonWeekIndex(b);
}

function isNhRespSeasonWeek(week: number): boolean {
  return week >= NH_RESP_SEASON_START_WEEK || week <= NH_RESP_SEASON_END_WEEK;
}

function isWeekInNhRespSeason(year: number, week: number, seasonStartYear: number): boolean {
  if (!isNhRespSeasonWeek(week)) return false;
  if (year === seasonStartYear && week >= NH_RESP_SEASON_START_WEEK) return true;
  if (year === seasonStartYear + 1 && week <= NH_RESP_SEASON_END_WEEK) return true;
  return false;
}

function seasonStartYearFromYearWeek(year: number, week: number): number | null {
  if (!Number.isFinite(year) || !Number.isFinite(week) || !isNhRespSeasonWeek(week)) return null;
  return week >= NH_RESP_SEASON_START_WEEK ? year : year - 1;
}

function getIsoWeekYear(date: Date): { year: number; week: number } {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
  const isoYear = utcDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: isoYear, week };
}

function currentNhRespSeasonStartYear(today = new Date()): number {
  const { year, week } = getIsoWeekYear(today);
  return week >= NH_RESP_SEASON_START_WEEK ? year : year - 1;
}

function weekLabel(week: number): string {
  return `W${String(week).padStart(2, "0")}`;
}

function normalizeSeasonLabel(seasonLabels: Record<string, string>, year: number): string {
  const fromSource = seasonLabels[String(year)];
  if (fromSource) return fromSource;
  return `${year}-${year + 1}`;
}

function normalizeVirusName(name: string | null | undefined): string {
  if (!name) return "";
  const normalized = String(name)
    .normalize("NFKC")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "";

  if (/^ili\s*\(\s*flu[-\s]*like illness\s*\)$/i.test(normalized)) return DEFAULT_ILI_VIRUS;
  if (/^influenza$/i.test(normalized)) return "Influenza";
  if (/^influenza\s+a$/i.test(normalized)) return "Influenza A";
  if (/^influenza\s+b$/i.test(normalized)) return "Influenza B";
  if (/^influenza\s+untyped$/i.test(normalized)) return "Influenza (untyped)";
  if (/^influenza\s+a\s*\(\s*h1n1pdm09\s*\)$/i.test(normalized) || /^influenza\s+a\s*\(\s*h1pdm09\s*\)$/i.test(normalized)) {
    return "Influenza A(H1N1pdm09)";
  }
  if (/^influenza\s+a\s+h1n1pdm09$/i.test(normalized) || /^influenza\s+a\s+h1pdm09$/i.test(normalized)) {
    return "Influenza A(H1N1pdm09)";
  }
  if (/^influenza\s+a\s*\(\s*h3\s*\)$/i.test(normalized) || /^influenza\s+a\s+h3$/i.test(normalized)) {
    return "Influenza A(H3)";
  }
  if (/^influenza\s+a\s*\(\s*nt\s*\)$/i.test(normalized) || /^influenza\s+a\s+nt$/i.test(normalized)) {
    return "Influenza A(NT)";
  }
  if (/^a\s*\(\s*h1\s*\)\s*pdm09$/i.test(normalized)) return "Influenza A(H1N1pdm09)";
  if (/^a\s*\(\s*h3\s*\)$/i.test(normalized)) return "Influenza A(H3)";
  if (/^a\s*\(\s*unknown\s*\)$/i.test(normalized)) return "Influenza A(NT)";
  if (/^sars[-\s]*cov[-\s]*2$/i.test(normalized)) return "SARS-CoV-2";
  if (/^rs[-\s]*v(i[íi]rus)?$/i.test(normalized)) return "RSV";

  return normalized;
}

function isInfluenzaVirus(name: string): boolean {
  if (name === INFLUENZA_ALL_KEY) return false;
  return normalizeVirusName(name).startsWith("Influenza");
}

function aggregateVirologyDetections(respiratoryData: RespiratoryData, year: number): VirologyDetectionRow[] {
  const buckets = new Map<string, VirologyDetectionRow>();
  for (const row of respiratoryData.virologyDetections) {
    const rowYear = Number(row.year);
    if (Number.isFinite(rowYear) && rowYear !== year) continue;

    const week = Number(row.week);
    if (!Number.isFinite(week)) continue;

    const detections = Number(row.detections ?? 0);
    if (!Number.isFinite(detections)) continue;

    const virus = normalizeVirusName(row.virus);
    if (!virus) continue;

    const key = `${week}::${virus}`;
    const current = buckets.get(key);
    if (current) {
      current.detections += detections;
      continue;
    }
    buckets.set(key, {
      week,
      label: weekLabel(week),
      virus,
      detections,
    });
  }

  const influenzaTotals = new Map<number, number>();
  for (const row of buckets.values()) {
    if (!isInfluenzaVirus(row.virus)) continue;
    influenzaTotals.set(row.week, (influenzaTotals.get(row.week) ?? 0) + row.detections);
  }
  for (const [week, detections] of influenzaTotals.entries()) {
    if (!Number.isFinite(detections) || detections <= 0) continue;
    buckets.set(`${week}::${INFLUENZA_ALL_KEY}`, {
      week,
      label: weekLabel(week),
      virus: INFLUENZA_ALL_KEY,
      detections,
    });
  }

  return Array.from(buckets.values()).sort(
    (a, b) => seasonWeekCompare(a.week, b.week) || a.virus.localeCompare(b.virus)
  );
}

function aggregateVirologyPositivity(respiratoryData: RespiratoryData, year: number): VirologyPositivityRow[] {
  const buckets = new Map<string, VirologyPositivityRow>();
  for (const row of respiratoryData.virologyPositivity) {
    const rowYear = Number(row.year);
    if (Number.isFinite(rowYear) && rowYear !== year) continue;

    const week = Number(row.week);
    if (!Number.isFinite(week)) continue;

    const positivity = Number(row.positivity ?? 0);
    if (!Number.isFinite(positivity)) continue;

    const virus = normalizeVirusName(row.virus);
    if (!virus) continue;

    const key = `${week}::${virus}`;
    const current = buckets.get(key);
    if (!current || positivity > current.positivity) {
      buckets.set(key, {
        week,
        label: weekLabel(week),
        virus,
        positivity,
      });
    }
  }

  return Array.from(buckets.values()).sort(
    (a, b) => seasonWeekCompare(a.week, b.week) || a.virus.localeCompare(b.virus)
  );
}

function buildVirologySnapshot(respiratoryData: RespiratoryData, year: number): VirologySnapshot {
  const detectionRows = aggregateVirologyDetections(respiratoryData, year);
  const positivityRows = aggregateVirologyPositivity(respiratoryData, year);

  const availableDetectionViruses = Array.from(new Set(detectionRows.map((row) => row.virus))).sort((a, b) => {
    if (a === INFLUENZA_ALL_KEY) return -1;
    if (b === INFLUENZA_ALL_KEY) return 1;
    return a.localeCompare(b);
  });

  const weekCandidates = Array.from(
    new Set(
      detectionRows
        .map((row) => row.week)
        .concat(positivityRows.map((row) => row.week))
        .filter((week) => Number.isFinite(week))
    )
  );

  const latestWeek = weekCandidates.length
    ? weekCandidates.reduce((best, week) => (seasonWeekCompare(week, best) > 0 ? week : best), weekCandidates[0])
    : null;

  return {
    available: detectionRows.length > 0 || positivityRows.length > 0,
    latestWeek,
    availableDetectionViruses,
    detectionRows,
    positivityRows,
  };
}

function aggregateEuVirologyDetections(respiratoryData: RespiratoryData, seasonStartYear: number): VirologyDetectionRow[] {
  const buckets = new Map<string, VirologyDetectionRow>();
  for (const row of respiratoryData.ervissDetections) {
    const rowYear = Number(row.year);
    if (!Number.isFinite(rowYear)) continue;

    const week = Number(row.week);
    if (!Number.isFinite(week)) continue;
    if (!isWeekInNhRespSeason(rowYear, week, seasonStartYear)) continue;

    const detections = Number(row.detections ?? 0);
    if (!Number.isFinite(detections)) continue;

    const virus = normalizeVirusName(row.virus);
    if (!virus) continue;

    const key = `${week}::${virus}`;
    const current = buckets.get(key);
    if (current) {
      current.detections += detections;
      continue;
    }
    buckets.set(key, {
      week,
      label: weekLabel(week),
      virus,
      detections,
    });
  }

  return Array.from(buckets.values()).sort((a, b) => seasonWeekCompare(a.week, b.week) || a.virus.localeCompare(b.virus));
}

function aggregateEuVirologyPositivity(respiratoryData: RespiratoryData, seasonStartYear: number): VirologyPositivityRow[] {
  const buckets = new Map<string, VirologyPositivityRow>();
  for (const row of respiratoryData.ervissPositivity) {
    const rowYear = Number(row.year);
    if (!Number.isFinite(rowYear)) continue;

    const week = Number(row.week);
    if (!Number.isFinite(week)) continue;
    if (!isWeekInNhRespSeason(rowYear, week, seasonStartYear)) continue;

    const positivity = Number(row.positivity ?? 0);
    if (!Number.isFinite(positivity)) continue;

    const virus = normalizeVirusName(row.virus);
    if (!virus) continue;

    const key = `${week}::${virus}`;
    const current = buckets.get(key);
    if (!current || positivity > current.positivity) {
      buckets.set(key, {
        week,
        label: weekLabel(week),
        virus,
        positivity,
      });
    }
  }

  return Array.from(buckets.values()).sort((a, b) => seasonWeekCompare(a.week, b.week) || a.virus.localeCompare(b.virus));
}

function buildEuVirologySnapshot(respiratoryData: RespiratoryData): EuVirologySnapshot {
  const seasonCandidates = Array.from(
    new Set(
      respiratoryData.ervissDetections
        .map((row) => seasonStartYearFromYearWeek(Number(row.year), Number(row.week)))
        .concat(respiratoryData.ervissPositivity.map((row) => seasonStartYearFromYearWeek(Number(row.year), Number(row.week))))
        .filter((year): year is number => typeof year === "number" && Number.isFinite(year))
    )
  ).sort((a, b) => a - b);

  if (!seasonCandidates.length) {
    return {
      available: false,
      availableYears: [],
      targetYear: null,
      latestWeek: null,
      detectionRows: [],
      positivityRows: [],
    };
  }

  const activeSeasonStart = currentNhRespSeasonStartYear();
  const targetYear = seasonCandidates.includes(activeSeasonStart)
    ? activeSeasonStart
    : seasonCandidates[seasonCandidates.length - 1];
  const detectionRows = aggregateEuVirologyDetections(respiratoryData, targetYear);
  const positivityRows = aggregateEuVirologyPositivity(respiratoryData, targetYear);

  const latestWeek = (() => {
    const candidates = detectionRows.map((row) => row.week).concat(positivityRows.map((row) => row.week));
    if (!candidates.length) return null;
    return candidates.reduce((best, week) => (seasonWeekCompare(week, best) > 0 ? week : best), candidates[0]);
  })();

  return {
    available: detectionRows.length > 0 || positivityRows.length > 0,
    availableYears: seasonCandidates,
    targetYear,
    latestWeek,
    detectionRows,
    positivityRows,
  };
}

function aggregateIliSeries(respiratoryData: RespiratoryData, year: number): WeeklyIliPoint[] {
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

function aggregateSariSeries(respiratoryData: RespiratoryData, year: number): WeeklySariPoint[] {
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

function pickAvailableYears(respiratoryData: RespiratoryData): number[] {
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

function buildHistoricalComparisonSnapshot(
  respiratoryData: RespiratoryData,
  seasonLabels: Record<string, string>,
  selectedYear: number,
  availableYears: number[]
): HistoricalComparisonSnapshot {
  const compareYear = availableYears.includes(selectedYear - 1) ? selectedYear - 1 : null;
  const currentSeasonLabel = normalizeSeasonLabel(seasonLabels, selectedYear);
  const compareSeasonLabel = compareYear == null ? null : normalizeSeasonLabel(seasonLabels, compareYear);

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

  const iliPrevious = aggregateIliSeries(respiratoryData, compareYear);
  const iliCurrent = aggregateIliSeries(respiratoryData, selectedYear);
  const sariPrevious = aggregateSariSeries(respiratoryData, compareYear);
  const sariCurrent = aggregateSariSeries(respiratoryData, selectedYear);

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

export function buildDashboardSnapshot(dataSource: DashboardDataSource, selectedYear?: number): DashboardSnapshot {
  const { respiratoryData, seasonLabels } = dataSource;
  const availableYears = pickAvailableYears(respiratoryData);
  const fallbackYear = availableYears.length ? availableYears[availableYears.length - 1] : new Date().getFullYear();
  const year =
    typeof selectedYear === "number" && Number.isFinite(selectedYear) && availableYears.includes(selectedYear)
      ? selectedYear
      : fallbackYear;

  const iliSeries = aggregateIliSeries(respiratoryData, year);
  const sariSeries = aggregateSariSeries(respiratoryData, year);
  const virology = buildVirologySnapshot(respiratoryData, year);
  const euVirology = buildEuVirologySnapshot(respiratoryData);
  const historical = buildHistoricalComparisonSnapshot(respiratoryData, seasonLabels, year, availableYears);

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
  if (!iliSeries.length) warnings.push("No ILI rows for this season in loaded source.");
  if (!sariSeries.length) warnings.push("No SARI rows for this season in loaded source.");
  if (!virology.available) warnings.push("No virology rows for this season in loaded source.");
  if (!euVirology.available) warnings.push("No EU/EEA ERVISS rows available.");
  if (dataSource.note) warnings.push(dataSource.note);

  return {
    selectedYear: year,
    seasonLabel: normalizeSeasonLabel(seasonLabels, year),
    availableYears,
    iliThreshold: ILI_THRESHOLD,
    iliSeries,
    sariSeries,
    virology,
    euVirology,
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
