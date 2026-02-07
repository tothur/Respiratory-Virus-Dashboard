import { useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import { buildDashboardSnapshot, createBundledDataSource, INFLUENZA_ALL_KEY, VIRO_ALL_KEY } from "../data/adapter";
import type { DashboardDataSource } from "../data/adapter";
import { loadRuntimeDataSource } from "../data/runtime-source";
import { buildIliTrendOption } from "../charts/iliTrend";
import { buildHistoricalTrendOption, formatSignedPercent } from "../charts/historicalTrend";
import { buildVirologyDetectionsOption, buildVirologyPositivityOption, displayVirusLabel } from "../charts/virologyTrend";
import { EChartsPanel } from "../components/EChartsPanel";

const DEFAULT_DATASET = "NNGYK";
const DEFAULT_ILI_VIRUS = "ILI (flu-like illness)";
const STORAGE_LANG_KEY = "rvd-lang";
const STORAGE_THEME_KEY = "rvd-theme";

type SortColumn = "week" | "cases";
type SortDirection = "asc" | "desc";
type TrendDirection = "surging" | "declining" | "flat";
type Language = "en" | "hu";
type ThemeMode = "system" | "dark" | "light";
type ResolvedTheme = "dark" | "light";

interface MetricPoint {
  week: number;
  value: number;
}

interface GlanceSummary {
  peak: MetricPoint;
  latest: MetricPoint;
  pctOfPeak: number | null;
  slope: number | null;
}

interface SeasonToDateSummary {
  currentTotal: number | null;
  baselineCount: number;
  median: number | null;
  lastSeason: number | null;
  percentile: number | null;
}

interface SeverityRatios {
  week: number;
  sariPercent: number;
  icuShare: number | null;
}

interface SurgeSignal {
  virus: string;
  label: string;
  change: number;
  week: number | null;
  direction: TrendDirection;
}

interface TableRow {
  week: number;
  virus: string;
  region: string;
  cases: number | null;
  sariAdmissions: number | null;
  sariIcu: number | null;
  topPositivityVirus: string | null;
  topPositivity: number | null;
}

const STRINGS = {
  en: {
    appTitle: "Seasonal Respiratory Pathogen Dashboard",
    appSubtitle: "Hungarian and European situation overview based on NNGYK and ECDC data",
    season: "Season",
    language: "Language",
    theme: "Theme",
    themeSystem: "System",
    themeDark: "Dark",
    themeLight: "Light",
    sourceTitle: "Data source",
    sourceLive: "Live source: nngyk_all.json",
    sourceFallback: "Fallback source: bundled sample",
    sourceLoading: "loading",
    sectionKicker: "Section",
    sectionHuTitle: "Hungarian situation",
    sectionHuNote: "NNGYK and sentinel indicators for the selected season.",
    sectionEuTitle: "European (EU/EEA) context",
    sectionEuNote: "ECDC ERVISS sentinel virology context.",
    alertsAria: "Key alerts",
    signalTitle: "Seasonal influenza threshold",
    signalAbove: "Above threshold",
    signalBelow: "Below threshold",
    fluTextAbove: "Week {week}: ILI activity ({cases} cases) is above the alert threshold ({threshold}).",
    fluTextBelow: "Week {week}: ILI activity ({cases} cases) remains below the alert threshold ({threshold}).",
    fluChipAbove: "Epidemic signal",
    fluChipBelow: "Below threshold",
    alertThreshold: "Alert threshold",
    crossingLabel: "Threshold crossing",
    alertsLoading: "Awaiting data",
    alertsLoadingPos: "Awaiting positivity data",
    alertsLoadingEuPos: "Awaiting EU/EEA positivity data",
    coverageNngyk: "Coverage · NNGYK",
    coverageNngykNote: "Latest ILI week in selected season",
    coverageSari: "Coverage · SARI",
    coverageSariNote: "Latest SARI week in selected season",
    coverageErviss: "Coverage · ERVISS",
    coverageErvissNote: "Latest EU/EEA reporting week",
    coverageMissing: "Missing weeks (ILI/SARI)",
    coverageMissingNote: "Gaps within each season timeline",
    coverageAria: "Data coverage indicators",
    trendTitle: "Weekly trend signals",
    trendNote: "Fast view of which pathogens are currently surging or easing.",
    trendAria: "Weekly trend signals",
    trendNoRecentChange: "No recent change",
    trendSurging: "Surging",
    trendDeclining: "Declining",
    trendFlat: "Flat",
    trendEmpty: "No weekly trend data yet.",
    glanceTitle: "Season at a glance",
    glanceNote: "Growth and burden signals alongside peak and recent trend.",
    glanceAria: "Season at a glance",
    glanceIli: "Flu-like illness",
    glanceSari: "SARI hospitalizations",
    glanceIcu: "SARI ICU",
    glancePeak: "Peak",
    glanceLatest: "Latest",
    glanceSlope: "3-week slope",
    glanceWow: "WoW change",
    glanceWeeksAbove: "Weeks above threshold",
    glanceStdTitle: "Season-to-date burden",
    glanceStdIli: "ILI cumulative",
    glanceStdSari: "SARI cumulative",
    glanceSeverityTitle: "Severity ratios",
    glanceSeveritySari: "SARI as % of ILI",
    glanceSeverityIcu: "ICU as % of SARI",
    stdNoBaseline: "No baseline",
    stdMedian: "Median",
    stdLastSeason: "Last season",
    statsTotalIli: "Total ILI cases",
    statsPeakIli: "Peak ILI week / cases",
    statsFirstCrossing: "First threshold crossing",
    statsWeeksAbove: "Weeks above threshold",
    statsLatestSari: "Latest SARI admissions / ICU",
    chartIli: "Flu-like illness",
    chartIliSubtitle: "Season {season} (threshold {threshold})",
    chartSari: "SARI hospital admissions",
    chartSariSubtitle: "Season {season}",
    leaderHuTitle: "Leading virus by positivity in Hungary",
    leaderEuTitle: "Leading virus by positivity in the EU/EEA",
    leaderHuText: "Week {week}: {virus} shows the highest sentinel test positivity ({pos}%).",
    leaderEuText: "Week {week} ({year}): {virus} leads EU/EEA sentinel positivity ({pos}%).",
    leadersAria: "Latest virology leaders",
    virologyTitle: "Sentinel virology",
    virologyWeek: "Latest week: {week}",
    virologyFilter: "Detections filter",
    virologyAllViruses: "All viruses",
    virologyTopDetections: "Top detections",
    virologyTopPositivity: "Top positivity",
    virologyNoDetections: "No detections available.",
    virologyNoPositivity: "No positivity data available.",
    virologyDetectionsTrend: "Sentinel detections trend",
    virologyDetectionsSubtitle: "Week {week} focus",
    virologyPositivityTrend: "Sentinel positivity trend",
    euVirologyTitle: "EU/EEA ERVISS virology",
    euTopDetections: "Top EU detections",
    euTopPositivity: "Top EU positivity",
    euNoDetections: "No EU detections available.",
    euNoPositivity: "No EU positivity data available.",
    euDetectionsTrend: "EU detections trend",
    euPositivityTrend: "EU positivity trend",
    euTrendSubtitle: "Target season year {year}",
    tableTitle: "Respiratory viruses week-by-week in Hungary",
    tableNote: "Click Week or Cases to sort; shows matching SARI and positivity context.",
    tableBadge: "Accessible table view",
    tableAria: "Weekly table",
    tableScrollAria: "Scrollable table",
    tableWeek: "Week",
    tableVirus: "Virus",
    tableRegion: "Region",
    tableCases: "Cases",
    tableSariAdmissions: "SARI admissions",
    tableSariIcu: "SARI ICU",
    tableTopPositivity: "Top positivity",
    tableNoData: "No data available.",
    historicalTitle: "Historical season comparison",
    historicalEmptyHeader: "Select a season that has a prior year available to render comparison trends.",
    historicalIli: "ILI comparison",
    historicalSari: "SARI admissions comparison",
    historicalIcu: "SARI ICU comparison",
    historicalDelta: "Latest delta: {value}",
    historicalUnavailable: "Historical comparison is unavailable because the previous season is missing from the loaded data source.",
    warningsTitle: "Data warnings",
    noDataShort: "No data",
    regionNational: "National",
  },
  hu: {
    appTitle: "Szezonális Légúti Kórokozó Dashboard",
    appSubtitle: "A magyarországi és európai helyzetkép az NNGYK és ECDC adatai alapján",
    season: "Szezon",
    language: "Nyelv",
    theme: "Téma",
    themeSystem: "Rendszer",
    themeDark: "Sötét",
    themeLight: "Világos",
    sourceTitle: "Adatforrás",
    sourceLive: "Élő forrás: nngyk_all.json",
    sourceFallback: "Tartalék forrás: beépített minta",
    sourceLoading: "betöltés",
    sectionKicker: "Szekció",
    sectionHuTitle: "Magyarországi helyzet",
    sectionHuNote: "NNGYK és sentinel mutatók a kiválasztott szezonra.",
    sectionEuTitle: "Európai (EU/EGT) kitekintés",
    sectionEuNote: "ECDC ERVISS sentinel virológiai kontextus.",
    alertsAria: "Fő riasztások",
    signalTitle: "Szezonális influenzaküszöb",
    signalAbove: "Küszöb felett",
    signalBelow: "Küszöb alatt",
    fluTextAbove: "{week}. hét: az ILI aktivitás ({cases} eset) meghaladja a riasztási küszöböt ({threshold}).",
    fluTextBelow: "{week}. hét: az ILI aktivitás ({cases} eset) a riasztási küszöb ({threshold}) alatt marad.",
    fluChipAbove: "Járványjelzés",
    fluChipBelow: "Küszöb alatt",
    alertThreshold: "Riasztási küszöb",
    crossingLabel: "Küszöbátlépés",
    alertsLoading: "Adatok betöltése",
    alertsLoadingPos: "Pozitivitási adatok betöltése",
    alertsLoadingEuPos: "EU/EGT pozitivitási adatok betöltése",
    coverageNngyk: "Lefedettség · NNGYK",
    coverageNngykNote: "A kiválasztott szezon legfrissebb ILI hete",
    coverageSari: "Lefedettség · SARI",
    coverageSariNote: "A kiválasztott szezon legfrissebb SARI hete",
    coverageErviss: "Lefedettség · ERVISS",
    coverageErvissNote: "Legfrissebb EU/EGT jelentési hét",
    coverageMissing: "Hiányzó hetek (ILI/SARI)",
    coverageMissingNote: "Rések az egyes szezonidősorokban",
    coverageAria: "Adatlefedettségi jelzők",
    trendTitle: "Heti trendszignálok",
    trendNote: "Gyors áttekintés arról, mely kórokozók erősödnek vagy enyhülnek.",
    trendAria: "Heti trendszignálok",
    trendNoRecentChange: "Nincs friss változás",
    trendSurging: "Erősödik",
    trendDeclining: "Enyhül",
    trendFlat: "Változatlan",
    trendEmpty: "Még nincs heti trendadat.",
    glanceTitle: "Szezon pillanatkép",
    glanceNote: "Növekedési és terhelési jelzések a csúcs és a friss trend mellett.",
    glanceAria: "Szezon pillanatkép",
    glanceIli: "Influenzaszerű megbetegedés (ILI)",
    glanceSari: "SARI felvételek",
    glanceIcu: "SARI intenzív",
    glancePeak: "Csúcs",
    glanceLatest: "Legfrissebb",
    glanceSlope: "3 hetes trend",
    glanceWow: "Heti változás",
    glanceWeeksAbove: "Küszöb feletti hetek",
    glanceStdTitle: "Szezon eddig",
    glanceStdIli: "ILI kumulatív",
    glanceStdSari: "SARI kumulatív",
    glanceSeverityTitle: "Súlyossági arányok",
    glanceSeveritySari: "SARI az ILI %-ában",
    glanceSeverityIcu: "ICU a SARI %-ában",
    stdNoBaseline: "Nincs összehasonlítás",
    stdMedian: "Medián",
    stdLastSeason: "Előző szezon",
    statsTotalIli: "Összes ILI eset",
    statsPeakIli: "ILI csúcs hét / eset",
    statsFirstCrossing: "Első küszöbátlépés",
    statsWeeksAbove: "Küszöb feletti hetek",
    statsLatestSari: "Legfrissebb SARI felvétel / ICU",
    chartIli: "Influenzaszerű megbetegedések",
    chartIliSubtitle: "Szezon: {season} (küszöb {threshold})",
    chartSari: "SARI kórházi felvételek",
    chartSariSubtitle: "Szezon: {season}",
    leaderHuTitle: "Vezető kórokozó pozitivitás szerint (Magyarország)",
    leaderEuTitle: "Vezető kórokozó pozitivitás szerint (EU/EGT)",
    leaderHuText: "{week}. hét: {virus} a legmagasabb sentinel tesztpozitivitású ({pos}%).",
    leaderEuText: "{week}. hét ({year}): {virus} vezeti az EU/EGT sentinel pozitivitást ({pos}%).",
    leadersAria: "Legfrissebb virológiai vezetők",
    virologyTitle: "Sentinel virológia",
    virologyWeek: "Legfrissebb hét: {week}",
    virologyFilter: "Detekció szűrő",
    virologyAllViruses: "Összes vírus",
    virologyTopDetections: "Legmagasabb detekciók",
    virologyTopPositivity: "Legmagasabb pozitivitás",
    virologyNoDetections: "Nincs detekciós adat.",
    virologyNoPositivity: "Nincs pozitivitási adat.",
    virologyDetectionsTrend: "Sentinel detekciós trend",
    virologyDetectionsSubtitle: "{week}. hét fókusz",
    virologyPositivityTrend: "Sentinel pozitivitási trend",
    euVirologyTitle: "EU/EGT ERVISS virológia",
    euTopDetections: "Legmagasabb EU detekciók",
    euTopPositivity: "Legmagasabb EU pozitivitás",
    euNoDetections: "Nincs EU detekciós adat.",
    euNoPositivity: "Nincs EU pozitivitási adat.",
    euDetectionsTrend: "EU detekciós trend",
    euPositivityTrend: "EU pozitivitási trend",
    euTrendSubtitle: "Cél szezonév: {year}",
    tableTitle: "Légúti vírusok heti bontásban (Magyarország)",
    tableNote: "Kattints a Hét vagy Esetszám oszlopra a rendezéshez; SARI és pozitivitási kontextussal.",
    tableBadge: "Akadálymentes táblázat",
    tableAria: "Heti táblázat",
    tableScrollAria: "Görgethető táblázat",
    tableWeek: "Hét",
    tableVirus: "Vírus",
    tableRegion: "Régió",
    tableCases: "Esetszám",
    tableSariAdmissions: "SARI felvételek",
    tableSariIcu: "SARI intenzív",
    tableTopPositivity: "Legmagasabb pozitivitás",
    tableNoData: "Nincs elérhető adat.",
    historicalTitle: "Történeti szezon összevetés",
    historicalEmptyHeader: "Válassz olyan szezont, amelyhez elérhető előző év.",
    historicalIli: "ILI összevetés",
    historicalSari: "SARI felvétel összevetés",
    historicalIcu: "SARI ICU összevetés",
    historicalDelta: "Legfrissebb eltérés: {value}",
    historicalUnavailable: "A történeti összevetés nem érhető el, mert hiányzik az előző szezon a betöltött adatforrásból.",
    warningsTitle: "Adat figyelmeztetések",
    noDataShort: "Nincs adat",
    regionNational: "Országos",
  },
} as const;

function normalizeLanguage(value: unknown): Language {
  const lower = String(value ?? "").toLowerCase();
  return lower.startsWith("hu") ? "hu" : "en";
}

function normalizeThemeMode(value: unknown): ThemeMode {
  const lower = String(value ?? "").toLowerCase();
  if (lower === "dark") return "dark";
  if (lower === "light") return "light";
  return "system";
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === "dark" || mode === "light") return mode;
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function formatText(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}

function formatWeek(week: number | null): string {
  if (typeof week !== "number" || !Number.isFinite(week)) return "-";
  return `W${String(week).padStart(2, "0")}`;
}

function seasonWeekIndex(week: number): number {
  return week >= 40 ? week : week + 53;
}

function seasonWeekCompare(a: number, b: number): number {
  return seasonWeekIndex(a) - seasonWeekIndex(b);
}

function seasonIndexToWeek(index: number): number {
  if (index <= 53) return index;
  return index - 53;
}

function missingWeekList(weeks: number[]): number[] {
  const unique = Array.from(new Set(weeks.map((week) => Number(week)).filter((week) => Number.isFinite(week))));
  if (unique.length < 2) return [];
  const sorted = unique.slice().sort(seasonWeekCompare);
  const minIndex = seasonWeekIndex(sorted[0]);
  const maxIndex = seasonWeekIndex(sorted[sorted.length - 1]);
  const present = new Set(unique);
  const missing: number[] = [];
  for (let idx = minIndex; idx <= maxIndex; idx += 1) {
    const week = seasonIndexToWeek(idx);
    if (!present.has(week)) missing.push(week);
  }
  return missing;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  return sorted[mid];
}

function sumThroughWeek(values: MetricPoint[], targetWeek: number): number | null {
  if (!Number.isFinite(targetWeek)) return null;
  return values
    .filter((row) => Number.isFinite(row.week) && Number.isFinite(row.value))
    .filter((row) => seasonWeekCompare(row.week, targetWeek) <= 0)
    .reduce((sum, row) => sum + row.value, 0);
}

function computeGlance(values: MetricPoint[]): GlanceSummary | null {
  const rows = values
    .filter((row) => Number.isFinite(row.week) && Number.isFinite(row.value))
    .slice()
    .sort((a, b) => seasonWeekCompare(a.week, b.week));
  if (!rows.length) return null;

  const peak = rows.reduce((best, row) => (row.value > best.value ? row : best), rows[0]);
  const latest = rows[rows.length - 1];
  const recent = rows.slice(Math.max(0, rows.length - 3));
  const slope =
    recent.length >= 2 ? (recent[recent.length - 1].value - recent[0].value) / (recent.length - 1) : null;
  const pctOfPeak = peak.value > 0 ? (latest.value / peak.value) * 100 : null;

  return { peak, latest, pctOfPeak, slope };
}

function computeWeekOverWeekChange(values: MetricPoint[]): number | null {
  const rows = values
    .filter((row) => Number.isFinite(row.week) && Number.isFinite(row.value))
    .slice()
    .sort((a, b) => seasonWeekCompare(a.week, b.week));
  if (rows.length < 2) return null;
  const latest = rows[rows.length - 1].value;
  const previous = rows[rows.length - 2].value;
  if (!Number.isFinite(latest) || !Number.isFinite(previous) || previous <= 0) return null;
  return ((latest - previous) / previous) * 100;
}

function computeSeasonToDateComparison(
  seriesForYear: (year: number) => MetricPoint[],
  currentYear: number,
  targetWeek: number | null,
  availableYears: number[]
): SeasonToDateSummary {
  if (!Number.isFinite(targetWeek)) {
    return { currentTotal: null, baselineCount: 0, median: null, lastSeason: null, percentile: null };
  }

  const currentSeries = seriesForYear(currentYear);
  const currentTotal = sumThroughWeek(currentSeries, Number(targetWeek));
  if (typeof currentTotal !== "number" || !Number.isFinite(currentTotal)) {
    return { currentTotal: null, baselineCount: 0, median: null, lastSeason: null, percentile: null };
  }

  const baselineYears = availableYears.filter((year) => year < currentYear).sort((a, b) => a - b);
  const baselineTotals = baselineYears
    .map((year) => sumThroughWeek(seriesForYear(year), Number(targetWeek)))
    .filter((total): total is number => typeof total === "number" && Number.isFinite(total) && total > 0);
  const lastSeasonYear = baselineYears.length ? baselineYears[baselineYears.length - 1] : null;
  const lastSeason =
    lastSeasonYear == null
      ? null
      : (() => {
          const value = sumThroughWeek(seriesForYear(lastSeasonYear), Number(targetWeek));
          return Number.isFinite(value) ? value : null;
        })();
  const medianValue = baselineTotals.length >= 2 ? median(baselineTotals) : null;
  const percentile =
    baselineTotals.length >= 2
      ? Math.round((baselineTotals.filter((value) => value <= currentTotal).length / baselineTotals.length) * 100)
      : null;

  return {
    currentTotal,
    baselineCount: baselineTotals.length,
    median: medianValue,
    lastSeason,
    percentile,
  };
}

function formatSeasonToDateValue(
  summary: SeasonToDateSummary,
  labels: { noBaseline: string; median: string; lastSeason: string }
): string {
  if (!Number.isFinite(summary.currentTotal)) return "–";
  const currentLabel = Number(summary.currentTotal).toLocaleString();
  if (!summary.baselineCount) return `${currentLabel} (${labels.noBaseline})`;
  const extras: string[] = [];
  if (summary.baselineCount >= 2 && Number.isFinite(summary.median)) {
    extras.push(`${labels.median} ${Number(summary.median).toLocaleString()}`);
  } else if (Number.isFinite(summary.lastSeason)) {
    extras.push(`${labels.lastSeason} ${Number(summary.lastSeason).toLocaleString()}`);
  }
  if (summary.percentile != null) extras.push(`P${summary.percentile}`);
  return extras.length ? `${currentLabel} (${extras.join(", ")})` : currentLabel;
}

function computeSeverityRatios(iliSeries: MetricPoint[], sariSeries: { week: number; admissions: number; icu: number }[]): SeverityRatios | null {
  if (!iliSeries.length || !sariSeries.length) return null;

  const iliByWeek = new Map(iliSeries.map((row) => [row.week, row.value]));
  const sharedWeeks = sariSeries
    .map((row) => row.week)
    .filter((week) => Number.isFinite(week) && iliByWeek.has(week))
    .sort((a, b) => seasonWeekCompare(a, b));
  if (!sharedWeeks.length) return null;

  const week = sharedWeeks[sharedWeeks.length - 1];
  const iliValue = Number(iliByWeek.get(week) ?? 0);
  const sariRow = sariSeries.find((row) => row.week === week);
  const admissions = Number(sariRow?.admissions ?? 0);
  const icu = Number(sariRow?.icu ?? 0);
  if (!Number.isFinite(iliValue) || iliValue <= 0 || !Number.isFinite(admissions) || admissions <= 0) return null;

  return {
    week,
    sariPercent: (admissions / iliValue) * 100,
    icuShare: Number.isFinite(icu) && admissions > 0 ? (icu / admissions) * 100 : null,
  };
}

function formatGlanceLine(point: MetricPoint | null): string {
  if (!point) return "–";
  return `${formatWeek(point.week)}: ${Number(point.value).toLocaleString()}`;
}

function formatGlanceLatest(glance: GlanceSummary | null): string {
  if (!glance) return "–";
  const latest = `${formatWeek(glance.latest.week)}: ${Number(glance.latest.value).toLocaleString()}`;
  if (!Number.isFinite(glance.pctOfPeak)) return latest;
  return `${latest} (${Math.round(Number(glance.pctOfPeak))}%)`;
}

function formatSlopePerWeek(slope: number | null): string {
  if (!Number.isFinite(slope)) return "–";
  const rounded = Math.round(Number(slope));
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString()}/week`;
}

function surgeDirectionLabel(
  direction: TrendDirection,
  labels: { surging: string; declining: string; flat: string }
): string {
  if (direction === "surging") return labels.surging;
  if (direction === "declining") return labels.declining;
  return labels.flat;
}

function formatSurgeLabel(
  direction: TrendDirection,
  pct: number,
  previousWeek: number,
  labels: { surging: string; declining: string; flat: string; compare: string }
): string {
  const sign = pct >= 0 ? "+" : "";
  return `${surgeDirectionLabel(direction, labels)} (${sign}${pct}% ${formatText(labels.compare, {
    week: formatWeek(previousWeek),
  })})`;
}

function useCompactViewport(maxWidth = 820): boolean {
  const query = `(max-width: ${maxWidth}px)`;
  const [compact, setCompact] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setCompact(event.matches);
    setCompact(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return compact;
}

export function App() {
  const compact = useCompactViewport();
  const [dataSource, setDataSource] = useState<DashboardDataSource>(() => createBundledDataSource());
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") return "en";
    const queryLang = new URL(window.location.href).searchParams.get("lang");
    if (queryLang) return normalizeLanguage(queryLang);
    const stored = window.localStorage.getItem(STORAGE_LANG_KEY);
    if (stored) return normalizeLanguage(stored);
    return normalizeLanguage(window.navigator.language);
  });
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    return normalizeThemeMode(window.localStorage.getItem(STORAGE_THEME_KEY));
  });
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme("system"));
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [selectedVirologyVirus, setSelectedVirologyVirus] = useState<string>(VIRO_ALL_KEY);
  const [tableSortColumn, setTableSortColumn] = useState<SortColumn>("week");
  const [tableSortDirection, setTableSortDirection] = useState<SortDirection>("asc");
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);

  const text = STRINGS[language];
  const t = text;
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.lang = language;
    window.localStorage.setItem(STORAGE_LANG_KEY, language);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", language);
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_THEME_KEY, themeMode);

    const applyTheme = () => {
      const next = resolveTheme(themeMode);
      setResolvedTheme(next);
      document.documentElement.setAttribute("data-theme", next);
    };
    applyTheme();

    if (themeMode !== "system" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [themeMode]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const loaded = await loadRuntimeDataSource();
        if (!active) return;
        setDataSource(loaded);
      } catch {
        if (!active) return;
        setDataSource(createBundledDataSource("Runtime loading failed; using bundled sample."));
      } finally {
        if (active) setIsDataLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const snapshot = useMemo(() => buildDashboardSnapshot(dataSource, selectedYear), [dataSource, selectedYear]);

  useEffect(() => {
    if (selectedYear == null || !snapshot.availableYears.includes(selectedYear)) {
      setSelectedYear(snapshot.selectedYear);
    }
  }, [selectedYear, snapshot.availableYears, snapshot.selectedYear]);

  useEffect(() => {
    if (
      selectedVirologyVirus !== VIRO_ALL_KEY &&
      !snapshot.virology.availableDetectionViruses.includes(selectedVirologyVirus)
    ) {
      setSelectedVirologyVirus(VIRO_ALL_KEY);
    }
  }, [selectedVirologyVirus, snapshot.virology.availableDetectionViruses]);

  const iliOption = useMemo<EChartsOption>(
    () =>
      buildIliTrendOption({
        points: snapshot.iliSeries,
        threshold: snapshot.iliThreshold,
        compact,
        dark: isDark,
        labels: {
          iliCases: t.glanceIli,
          alertThreshold: t.alertThreshold,
          crossing: t.crossingLabel,
          noData: t.noDataShort,
          seasonStart: language === "hu" ? "Szezonkezdet" : "Season start",
          holidays: language === "hu" ? "Ünnepi időszak" : "Holiday period",
        },
      }),
    [compact, isDark, language, snapshot.iliSeries, snapshot.iliThreshold, t.alertThreshold, t.crossingLabel, t.glanceIli, t.noDataShort]
  );

  const sariOption = useMemo<EChartsOption>(() => {
    const palette = isDark
      ? {
          axisLabel: "#cbd5e1",
          axisLine: "rgba(148, 163, 184, 0.45)",
          grid: "rgba(148, 163, 184, 0.22)",
          legend: "#e2e8f0",
        }
      : {
          axisLabel: "#334155",
          axisLine: "rgba(15, 23, 42, 0.20)",
          grid: "rgba(15, 23, 42, 0.15)",
          legend: "#0f172a",
        };
    return {
      animation: false,
      grid: { top: 40, right: 18, bottom: 34, left: 42 },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: {
        bottom: 0,
        textStyle: { color: palette.legend, fontWeight: 600 },
      },
      xAxis: {
        type: "category",
        data: snapshot.sariSeries.map((point) => point.label),
        axisLine: { lineStyle: { color: palette.axisLine } },
        axisLabel: { color: palette.axisLabel },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: palette.axisLabel },
        splitLine: { lineStyle: { color: palette.grid } },
      },
      series: [
        {
          name: t.tableSariAdmissions,
          type: "bar",
          data: snapshot.sariSeries.map((point) => point.admissions),
          itemStyle: { color: "rgba(37, 99, 235, 0.45)", borderColor: "#2563eb", borderWidth: 1.2 },
          barMaxWidth: 24,
        },
        {
          name: t.tableSariIcu,
          type: "bar",
          data: snapshot.sariSeries.map((point) => point.icu),
          itemStyle: { color: "rgba(220, 38, 38, 0.35)", borderColor: "#dc2626", borderWidth: 1.2 },
          barMaxWidth: 24,
        },
      ],
    };
  }, [isDark, snapshot.sariSeries, t.tableSariAdmissions, t.tableSariIcu]);

  const virologyDetectionsOption = useMemo<EChartsOption>(
    () =>
      buildVirologyDetectionsOption({
        rows: snapshot.virology.detectionRows,
        selectedVirus: selectedVirologyVirus,
        compact,
        language,
        dark: isDark,
      }),
    [compact, isDark, language, selectedVirologyVirus, snapshot.virology.detectionRows]
  );

  const virologyPositivityOption = useMemo<EChartsOption>(
    () =>
      buildVirologyPositivityOption({
        rows: snapshot.virology.positivityRows,
        compact,
        language,
        dark: isDark,
      }),
    [compact, isDark, language, snapshot.virology.positivityRows]
  );

  const euDetectionsOption = useMemo<EChartsOption>(
    () =>
      buildVirologyDetectionsOption({
        rows: snapshot.euVirology.detectionRows,
        selectedVirus: VIRO_ALL_KEY,
        compact,
        weekOrder: "numeric",
        language,
        dark: isDark,
      }),
    [compact, isDark, language, snapshot.euVirology.detectionRows]
  );

  const euPositivityOption = useMemo<EChartsOption>(
    () =>
      buildVirologyPositivityOption({
        rows: snapshot.euVirology.positivityRows,
        compact,
        weekOrder: "numeric",
        language,
        dark: isDark,
      }),
    [compact, isDark, language, snapshot.euVirology.positivityRows]
  );

  const virologyDetectionList = useMemo(() => {
    if (snapshot.virology.latestWeek == null) return [];
    const rowsForWeek = snapshot.virology.detectionRows
      .filter((row) => row.week === snapshot.virology.latestWeek)
      .filter((row) => selectedVirologyVirus === VIRO_ALL_KEY || row.virus === selectedVirologyVirus)
      .slice()
      .sort((a, b) => b.detections - a.detections);
    const influenzaAllRow = rowsForWeek.find((row) => row.virus === INFLUENZA_ALL_KEY);
    const ordered = [
      ...(influenzaAllRow ? [influenzaAllRow] : []),
      ...rowsForWeek.filter((row) => row.virus !== INFLUENZA_ALL_KEY),
    ];
    return ordered.slice(0, 6);
  }, [selectedVirologyVirus, snapshot.virology.detectionRows, snapshot.virology.latestWeek]);

  const virologyPositivityList = useMemo(() => {
    if (snapshot.virology.latestWeek == null) return [];
    return snapshot.virology.positivityRows
      .filter((row) => row.week === snapshot.virology.latestWeek)
      .slice()
      .sort((a, b) => b.positivity - a.positivity)
      .slice(0, 6);
  }, [snapshot.virology.latestWeek, snapshot.virology.positivityRows]);

  const euDetectionsList = useMemo(() => {
    if (snapshot.euVirology.latestWeek == null) return [];
    return snapshot.euVirology.detectionRows
      .filter((row) => row.week === snapshot.euVirology.latestWeek)
      .slice()
      .sort((a, b) => b.detections - a.detections)
      .slice(0, 6);
  }, [snapshot.euVirology.detectionRows, snapshot.euVirology.latestWeek]);

  const euPositivityList = useMemo(() => {
    if (snapshot.euVirology.latestWeek == null) return [];
    return snapshot.euVirology.positivityRows
      .filter((row) => row.week === snapshot.euVirology.latestWeek)
      .slice()
      .sort((a, b) => b.positivity - a.positivity)
      .slice(0, 6);
  }, [snapshot.euVirology.latestWeek, snapshot.euVirology.positivityRows]);

  const historicalIliOption = useMemo<EChartsOption | null>(() => {
    if (!snapshot.historical.available || !snapshot.historical.compareSeasonLabel) return null;
    return buildHistoricalTrendOption({
      metric: snapshot.historical.ili,
      compareSeasonLabel: snapshot.historical.compareSeasonLabel,
      currentSeasonLabel: snapshot.historical.currentSeasonLabel,
      compact,
      dark: isDark,
      labels: {
        delta: language === "hu" ? "Eltérés %" : "Delta %",
        noData: t.noDataShort,
      },
    });
  }, [compact, isDark, language, snapshot.historical, t.noDataShort]);

  const historicalSariOption = useMemo<EChartsOption | null>(() => {
    if (!snapshot.historical.available || !snapshot.historical.compareSeasonLabel) return null;
    return buildHistoricalTrendOption({
      metric: snapshot.historical.sariAdmissions,
      compareSeasonLabel: snapshot.historical.compareSeasonLabel,
      currentSeasonLabel: snapshot.historical.currentSeasonLabel,
      compact,
      dark: isDark,
      labels: {
        delta: language === "hu" ? "Eltérés %" : "Delta %",
        noData: t.noDataShort,
      },
    });
  }, [compact, isDark, language, snapshot.historical, t.noDataShort]);

  const historicalIcuOption = useMemo<EChartsOption | null>(() => {
    if (!snapshot.historical.available || !snapshot.historical.compareSeasonLabel) return null;
    return buildHistoricalTrendOption({
      metric: snapshot.historical.sariIcu,
      compareSeasonLabel: snapshot.historical.compareSeasonLabel,
      currentSeasonLabel: snapshot.historical.currentSeasonLabel,
      compact,
      dark: isDark,
      labels: {
        delta: language === "hu" ? "Eltérés %" : "Delta %",
        noData: t.noDataShort,
      },
    });
  }, [compact, isDark, language, snapshot.historical, t.noDataShort]);

  const huLeader = useMemo(() => {
    if (!snapshot.virology.positivityRows.length) return null;
    const latestWeek = snapshot.virology.positivityRows.reduce(
      (best, row) => (seasonWeekCompare(row.week, best) > 0 ? row.week : best),
      snapshot.virology.positivityRows[0].week
    );
    const latestRows = snapshot.virology.positivityRows.filter((row) => row.week === latestWeek);
    if (!latestRows.length) return null;
    const leader = latestRows.reduce((best, row) => (row.positivity > best.positivity ? row : best), latestRows[0]);
    return {
      week: latestWeek,
      virus: leader.virus,
      positivity: leader.positivity,
    };
  }, [snapshot.virology.positivityRows]);

  const euLeader = useMemo(() => {
    if (snapshot.euVirology.targetYear == null || !snapshot.euVirology.positivityRows.length) return null;
    const latestWeek = Math.max(...snapshot.euVirology.positivityRows.map((row) => row.week));
    const latestRows = snapshot.euVirology.positivityRows.filter((row) => row.week === latestWeek);
    if (!latestRows.length) return null;
    const leader = latestRows.reduce((best, row) => (row.positivity > best.positivity ? row : best), latestRows[0]);
    return {
      year: snapshot.euVirology.targetYear,
      week: latestWeek,
      virus: leader.virus,
      positivity: leader.positivity,
    };
  }, [snapshot.euVirology.positivityRows, snapshot.euVirology.targetYear]);

  const iliLatestWeekLabel = snapshot.iliSeries.length ? formatWeek(snapshot.iliSeries[snapshot.iliSeries.length - 1].week) : "–";
  const sariLatestWeekLabel = snapshot.sariSeries.length ? formatWeek(snapshot.sariSeries[snapshot.sariSeries.length - 1].week) : "–";
  const iliMissingWeeks = useMemo(() => missingWeekList(snapshot.iliSeries.map((row) => row.week)), [snapshot.iliSeries]);
  const sariMissingWeeks = useMemo(() => missingWeekList(snapshot.sariSeries.map((row) => row.week)), [snapshot.sariSeries]);

  const seasonAtGlance = useMemo(() => {
    const iliSeries: MetricPoint[] = snapshot.iliSeries.map((row) => ({ week: row.week, value: row.cases }));
    const sariAdmissionsSeries: MetricPoint[] = snapshot.sariSeries.map((row) => ({ week: row.week, value: row.admissions }));
    const sariIcuSeries: MetricPoint[] = snapshot.sariSeries.map((row) => ({ week: row.week, value: row.icu }));

    const iliGlance = computeGlance(iliSeries);
    const sariGlance = computeGlance(sariAdmissionsSeries);
    const icuGlance = computeGlance(sariIcuSeries);

    const buildIliSeriesForYear = (year: number): MetricPoint[] => {
      const buckets = new Map<number, number>();
      for (const row of dataSource.respiratoryData.weekly) {
        const rowYear = Number(row.year);
        if (!Number.isFinite(rowYear) || rowYear !== year) continue;
        const dataset = row.dataset ?? DEFAULT_DATASET;
        if (dataset !== DEFAULT_DATASET) continue;
        const virus = row.virus ?? DEFAULT_ILI_VIRUS;
        if (virus !== DEFAULT_ILI_VIRUS) continue;
        const week = Number(row.week);
        if (!Number.isFinite(week)) continue;
        const cases = Number(row.cases ?? 0);
        if (!Number.isFinite(cases)) continue;
        buckets.set(week, (buckets.get(week) ?? 0) + cases);
      }
      return Array.from(buckets.entries())
        .sort((a, b) => seasonWeekCompare(a[0], b[0]))
        .map(([week, value]) => ({ week, value }));
    };

    const buildSariAdmissionsSeriesForYear = (year: number): MetricPoint[] => {
      const buckets = new Map<number, number>();
      for (const row of dataSource.respiratoryData.sariWeekly) {
        const rowYear = Number(row.year);
        if (!Number.isFinite(rowYear) || rowYear !== year) continue;
        const week = Number(row.week);
        if (!Number.isFinite(week)) continue;
        const admissions = Number(row.admissions ?? 0);
        if (!Number.isFinite(admissions)) continue;
        buckets.set(week, (buckets.get(week) ?? 0) + admissions);
      }
      return Array.from(buckets.entries())
        .sort((a, b) => seasonWeekCompare(a[0], b[0]))
        .map(([week, value]) => ({ week, value }));
    };

    const severity = computeSeverityRatios(
      iliSeries,
      snapshot.sariSeries.map((row) => ({ week: row.week, admissions: row.admissions, icu: row.icu }))
    );

    return {
      iliGlance,
      sariGlance,
      icuGlance,
      iliWow: computeWeekOverWeekChange(iliSeries),
      sariWow: computeWeekOverWeekChange(sariAdmissionsSeries),
      icuWow: computeWeekOverWeekChange(sariIcuSeries),
      weeksAboveThreshold: iliSeries.filter((row) => row.value >= snapshot.iliThreshold).length,
      iliSeasonToDate: computeSeasonToDateComparison(
        buildIliSeriesForYear,
        snapshot.selectedYear,
        iliGlance?.latest.week ?? null,
        snapshot.availableYears
      ),
      sariSeasonToDate: computeSeasonToDateComparison(
        buildSariAdmissionsSeriesForYear,
        snapshot.selectedYear,
        sariGlance?.latest.week ?? null,
        snapshot.availableYears
      ),
      severity,
    };
  }, [
    dataSource.respiratoryData.sariWeekly,
    dataSource.respiratoryData.weekly,
    snapshot.availableYears,
    snapshot.iliSeries,
    snapshot.iliThreshold,
    snapshot.sariSeries,
    snapshot.selectedYear,
  ]);

  const surgeSignals = useMemo<SurgeSignal[]>(() => {
    const weeklyRows = dataSource.respiratoryData.weekly.filter((row) => {
      const rowYear = Number(row.year);
      if (!Number.isFinite(rowYear) || rowYear !== snapshot.selectedYear) return false;
      return (row.dataset ?? DEFAULT_DATASET) === DEFAULT_DATASET;
    });
    if (!weeklyRows.length) return [];

    const byVirus = new Map<string, Map<number, number>>();
    for (const row of weeklyRows) {
      const virus = row.virus ?? DEFAULT_ILI_VIRUS;
      const week = Number(row.week);
      if (!Number.isFinite(week)) continue;
      const cases = Number(row.cases ?? 0);
      if (!Number.isFinite(cases)) continue;
      const weekMap = byVirus.get(virus) ?? new Map<number, number>();
      weekMap.set(week, (weekMap.get(week) ?? 0) + cases);
      byVirus.set(virus, weekMap);
    }

    return Array.from(byVirus.entries())
      .map(([virus, values]) => {
        const ordered = Array.from(values.entries())
          .map(([week, value]) => ({ week, value }))
          .sort((a, b) => seasonWeekCompare(a.week, b.week));
        const latest = ordered[ordered.length - 1];
        const previous = ordered[ordered.length - 2];
        if (!latest || !previous) {
          return {
            virus,
            label: t.trendNoRecentChange,
            change: 0,
            week: latest?.week ?? null,
            direction: "flat" as TrendDirection,
          };
        }
        const change = latest.value - previous.value;
        const pct = previous.value ? Math.round((change / previous.value) * 100) : 0;
        const direction: TrendDirection = change > 0 ? "surging" : change < 0 ? "declining" : "flat";
        return {
          virus,
          label: formatSurgeLabel(direction, pct, previous.week, {
            surging: t.trendSurging,
            declining: t.trendDeclining,
            flat: t.trendFlat,
            compare: language === "hu" ? "{week} héthez képest" : "vs {week}",
          }),
          change,
          week: latest.week,
          direction,
        };
      })
      .sort((a, b) => b.change - a.change)
      .slice(0, 4);
  }, [dataSource.respiratoryData.weekly, language, snapshot.selectedYear, t.trendDeclining, t.trendFlat, t.trendNoRecentChange, t.trendSurging]);

  const topPositivityByWeek = useMemo(() => {
    const byWeek = new Map<number, { virus: string; positivity: number }>();
    for (const row of snapshot.virology.positivityRows) {
      const current = byWeek.get(row.week);
      if (!current || row.positivity > current.positivity) {
        byWeek.set(row.week, { virus: row.virus, positivity: row.positivity });
      }
    }
    return byWeek;
  }, [snapshot.virology.positivityRows]);

  const tableRows = useMemo<TableRow[]>(() => {
    const iliByWeek = new Map(snapshot.iliSeries.map((row) => [row.week, row.cases]));
    const sariByWeek = new Map(snapshot.sariSeries.map((row) => [row.week, { admissions: row.admissions, icu: row.icu }]));
    const allWeeks = new Set<number>();
    for (const week of iliByWeek.keys()) allWeeks.add(week);
    for (const week of sariByWeek.keys()) allWeeks.add(week);
    for (const week of topPositivityByWeek.keys()) allWeeks.add(week);
    for (const row of snapshot.virology.detectionRows) allWeeks.add(row.week);

    const merged = Array.from(allWeeks).map((week) => {
      const sari = sariByWeek.get(week);
      const topPositivity = topPositivityByWeek.get(week);
      return {
        week,
        virus: DEFAULT_ILI_VIRUS,
        region: "National",
        cases: iliByWeek.get(week) ?? null,
        sariAdmissions: sari?.admissions ?? null,
        sariIcu: sari?.icu ?? null,
        topPositivityVirus: topPositivity?.virus ?? null,
        topPositivity: topPositivity?.positivity ?? null,
      };
    });

    const direction = tableSortDirection === "asc" ? 1 : -1;
    return merged.sort((a, b) => {
      if (tableSortColumn === "week") {
        const diff = seasonWeekCompare(a.week, b.week);
        if (diff !== 0) return diff * direction;
      } else {
        const diff = Number(a.cases ?? 0) - Number(b.cases ?? 0);
        if (diff !== 0) return diff * direction;
      }
      const weekDiff = seasonWeekCompare(a.week, b.week);
      if (weekDiff !== 0) return weekDiff;
      return a.virus.localeCompare(b.virus);
    });
  }, [
    snapshot.iliSeries,
    snapshot.sariSeries,
    snapshot.virology.detectionRows,
    tableSortColumn,
    tableSortDirection,
    topPositivityByWeek,
  ]);

  const weekSortAria: "none" | "ascending" | "descending" =
    tableSortColumn === "week" ? (tableSortDirection === "asc" ? "ascending" : "descending") : "none";
  const casesSortAria: "none" | "ascending" | "descending" =
    tableSortColumn === "cases" ? (tableSortDirection === "asc" ? "ascending" : "descending") : "none";
  const weekSortIndicator = tableSortColumn === "week" ? (tableSortDirection === "asc" ? "▲" : "▼") : "";
  const casesSortIndicator = tableSortColumn === "cases" ? (tableSortDirection === "asc" ? "▲" : "▼") : "";

  const toggleTableSort = (column: SortColumn) => {
    if (tableSortColumn === column) {
      setTableSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setTableSortColumn(column);
    setTableSortDirection("asc");
  };

  const isAboveThreshold = snapshot.stats.latestIliCases >= snapshot.iliThreshold;
  const signalClassName = isAboveThreshold ? "critical" : "ok";
  const fluAlertText = formatText(isAboveThreshold ? t.fluTextAbove : t.fluTextBelow, {
    week: formatWeek(snapshot.stats.latestWeek),
    cases: snapshot.stats.latestIliCases.toLocaleString(),
    threshold: snapshot.iliThreshold.toLocaleString(),
  });
  const fluAlertChip = isAboveThreshold ? t.fluChipAbove : t.fluChipBelow;
  const sourceChipClass = dataSource.source === "nngyk_all" ? "source-chip live" : "source-chip sample";
  const sourceLabel = dataSource.source === "nngyk_all" ? t.sourceLive : t.sourceFallback;
  const latestVirologyWeekLabel = snapshot.virology.latestWeek == null ? "–" : formatWeek(snapshot.virology.latestWeek);
  const latestEuWeekLabel =
    snapshot.euVirology.targetYear != null && snapshot.euVirology.latestWeek != null
      ? `${snapshot.euVirology.targetYear}-${formatWeek(snapshot.euVirology.latestWeek)}`
      : "–";
  const huLeaderText = huLeader
    ? formatText(t.leaderHuText, {
        week: formatWeek(huLeader.week),
        virus: displayVirusLabel(huLeader.virus, language),
        pos: huLeader.positivity.toFixed(1),
      })
    : t.alertsLoadingPos;
  const euLeaderText = euLeader
    ? formatText(t.leaderEuText, {
        week: formatWeek(euLeader.week),
        year: euLeader.year,
        virus: displayVirusLabel(euLeader.virus, language),
        pos: euLeader.positivity.toFixed(1),
      })
    : t.alertsLoadingEuPos;

  return (
    <div className={`app-shell theme-${resolvedTheme}`}>
      <header className="topbar">
        <div>
          <h1>{t.appTitle}</h1>
          <p className="subtitle">{t.appSubtitle}</p>
        </div>
        <div className="controls">
          <label htmlFor="year-select">{t.season}</label>
          <select
            id="year-select"
            value={snapshot.selectedYear}
            onChange={(event) => setSelectedYear(Number(event.target.value))}
          >
            {snapshot.availableYears.map((year) => (
              <option key={year} value={year}>
                {year}-{year + 1}
              </option>
            ))}
          </select>
          <label htmlFor="lang-select">{t.language}</label>
          <select id="lang-select" value={language} onChange={(event) => setLanguage(normalizeLanguage(event.target.value))}>
            <option value="en">English</option>
            <option value="hu">Magyar</option>
          </select>
          <label htmlFor="theme-select">{t.theme}</label>
          <select id="theme-select" value={themeMode} onChange={(event) => setThemeMode(normalizeThemeMode(event.target.value))}>
            <option value="system">{t.themeSystem}</option>
            <option value="dark">{t.themeDark}</option>
            <option value="light">{t.themeLight}</option>
          </select>
        </div>
      </header>

      <section className="alerts-grid" aria-label={t.alertsAria}>
        <article className={`alert-card primary ${signalClassName}`} role="status" aria-live="polite">
          <div className="alert-card-header">
            <h2>{t.signalTitle}</h2>
            <span className="alert-chip">{fluAlertChip}</span>
          </div>
          <p>{fluAlertText}</p>
        </article>
        <article className="alert-card leader" role="status" aria-live="polite">
          <div className="alert-card-header">
            <h2>{t.leaderHuTitle}</h2>
            <span className="alert-chip">{huLeader ? displayVirusLabel(huLeader.virus, language) : t.noDataShort}</span>
          </div>
          <p>{huLeaderText}</p>
        </article>
        <article className="alert-card leader" role="status" aria-live="polite">
          <div className="alert-card-header">
            <h2>{t.leaderEuTitle}</h2>
            <span className="alert-chip">{euLeader ? displayVirusLabel(euLeader.virus, language) : t.noDataShort}</span>
          </div>
          <p>{euLeaderText}</p>
        </article>
      </section>

      <section className={sourceChipClass} role="status" aria-live="polite">
        <h2>{t.sourceTitle}</h2>
        <p>
          {sourceLabel}
          {isDataLoading ? ` (${t.sourceLoading})` : ""}
        </p>
      </section>

      <section className="region-divider hu" aria-label={t.sectionHuTitle}>
        <span className="region-divider-kicker">{t.sectionKicker}</span>
        <div>
          <h2>{t.sectionHuTitle}</h2>
          <p>{t.sectionHuNote}</p>
        </div>
      </section>

      <section className="quality-grid" aria-label={t.coverageAria}>
        <article className="quality-card">
          <h3>{t.coverageNngyk}</h3>
          <strong>{iliLatestWeekLabel}</strong>
          <p>{t.coverageNngykNote}</p>
        </article>
        <article className="quality-card">
          <h3>{t.coverageSari}</h3>
          <strong>{sariLatestWeekLabel}</strong>
          <p>{t.coverageSariNote}</p>
        </article>
        <article className="quality-card">
          <h3>{t.coverageErviss}</h3>
          <strong>{latestEuWeekLabel}</strong>
          <p>{t.coverageErvissNote}</p>
        </article>
        <article className={`quality-card ${iliMissingWeeks.length + sariMissingWeeks.length ? "warn" : "ok"}`}>
          <h3>{t.coverageMissing}</h3>
          <strong>
            {iliMissingWeeks.length}/{sariMissingWeeks.length}
          </strong>
          <p>{t.coverageMissingNote}</p>
        </article>
      </section>

      <section className="surge-section" aria-label={t.trendAria}>
        <header className="surge-header">
          <h2>{t.trendTitle}</h2>
          <p>{t.trendNote}</p>
        </header>
        <ul className="surge-list">
          {surgeSignals.length ? (
            surgeSignals.map((signal) => (
              <li key={signal.virus} className={`surge-item trend-${signal.direction}`}>
                <div>
                  <strong>{displayVirusLabel(signal.virus, language)}</strong>
                  <span>{signal.week != null ? formatWeek(signal.week) : "–"}</span>
                </div>
                <span className="pill">{signal.label}</span>
              </li>
            ))
          ) : (
            <li className="surge-empty">{t.trendEmpty}</li>
          )}
        </ul>
      </section>

      <section className="glance-section" aria-label={t.glanceAria}>
        <header className="glance-header">
          <h2>{t.glanceTitle}</h2>
          <p>{t.glanceNote}</p>
        </header>
        <div className="glance-grid">
          <article className="glance-card">
            <h3>{t.glanceIli}</h3>
            <div className="glance-row">
              <span className="glance-key">{t.glancePeak}</span>
              <span className="glance-value">{formatGlanceLine(seasonAtGlance.iliGlance?.peak ?? null)}</span>
            </div>
            <div className="glance-row">
              <span className="glance-key">{t.glanceLatest}</span>
              <span className="glance-value">{formatGlanceLatest(seasonAtGlance.iliGlance)}</span>
            </div>
            <div className="glance-row">
              <span className="glance-key">{t.glanceSlope}</span>
              <span className="glance-value">{formatSlopePerWeek(seasonAtGlance.iliGlance?.slope ?? null)}</span>
            </div>
            <div className="glance-row">
              <span className="glance-key">{t.glanceWow}</span>
              <span className="glance-value">{formatSignedPercent(seasonAtGlance.iliWow)}</span>
            </div>
            <div className="glance-row">
              <span className="glance-key">{t.glanceWeeksAbove}</span>
              <span className="glance-value">
                {snapshot.iliSeries.length ? seasonAtGlance.weeksAboveThreshold.toLocaleString() : "–"}
              </span>
            </div>
          </article>
          <article className="glance-card">
            <h3>{t.glanceSari}</h3>
            <div className="glance-row">
              <span className="glance-key">{t.glancePeak}</span>
              <span className="glance-value">{formatGlanceLine(seasonAtGlance.sariGlance?.peak ?? null)}</span>
            </div>
            <div className="glance-row">
              <span className="glance-key">{t.glanceLatest}</span>
              <span className="glance-value">{formatGlanceLatest(seasonAtGlance.sariGlance)}</span>
            </div>
            <div className="glance-row">
              <span className="glance-key">{t.glanceSlope}</span>
              <span className="glance-value">{formatSlopePerWeek(seasonAtGlance.sariGlance?.slope ?? null)}</span>
            </div>
            <div className="glance-row">
              <span className="glance-key">{t.glanceWow}</span>
              <span className="glance-value">{formatSignedPercent(seasonAtGlance.sariWow)}</span>
            </div>
          </article>
          <article className="glance-card">
            <h3>{t.glanceIcu}</h3>
            <div className="glance-row">
              <span className="glance-key">{t.glancePeak}</span>
              <span className="glance-value">{formatGlanceLine(seasonAtGlance.icuGlance?.peak ?? null)}</span>
            </div>
            <div className="glance-row">
              <span className="glance-key">{t.glanceLatest}</span>
              <span className="glance-value">{formatGlanceLatest(seasonAtGlance.icuGlance)}</span>
            </div>
            <div className="glance-row">
              <span className="glance-key">{t.glanceSlope}</span>
              <span className="glance-value">{formatSlopePerWeek(seasonAtGlance.icuGlance?.slope ?? null)}</span>
            </div>
            <div className="glance-row">
              <span className="glance-key">{t.glanceWow}</span>
              <span className="glance-value">{formatSignedPercent(seasonAtGlance.icuWow)}</span>
            </div>
          </article>
          <article className="glance-card">
            <h3>{t.glanceStdTitle}</h3>
            <div className="glance-row">
              <span className="glance-key">{t.glanceStdIli}</span>
              <span className="glance-value">
                {formatSeasonToDateValue(seasonAtGlance.iliSeasonToDate, {
                  noBaseline: t.stdNoBaseline,
                  median: t.stdMedian,
                  lastSeason: t.stdLastSeason,
                })}
              </span>
            </div>
            <div className="glance-row">
              <span className="glance-key">{t.glanceStdSari}</span>
              <span className="glance-value">
                {formatSeasonToDateValue(seasonAtGlance.sariSeasonToDate, {
                  noBaseline: t.stdNoBaseline,
                  median: t.stdMedian,
                  lastSeason: t.stdLastSeason,
                })}
              </span>
            </div>
          </article>
          <article className="glance-card">
            <h3>{t.glanceSeverityTitle}</h3>
            <div className="glance-row">
              <span className="glance-key">{t.glanceSeveritySari}</span>
              <span className="glance-value">
                {seasonAtGlance.severity
                  ? `${formatWeek(seasonAtGlance.severity.week)}: ${seasonAtGlance.severity.sariPercent.toFixed(1)}%`
                  : "–"}
              </span>
            </div>
            <div className="glance-row">
              <span className="glance-key">{t.glanceSeverityIcu}</span>
              <span className="glance-value">
                {seasonAtGlance.severity && Number.isFinite(seasonAtGlance.severity.icuShare)
                  ? `${formatWeek(seasonAtGlance.severity.week)}: ${Number(seasonAtGlance.severity.icuShare).toFixed(1)}%`
                  : "–"}
              </span>
            </div>
          </article>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <h3>{t.statsTotalIli}</h3>
          <strong>{snapshot.stats.totalIliCases.toLocaleString()}</strong>
        </article>
        <article className="stat-card">
          <h3>{t.statsPeakIli}</h3>
          <strong>
            {formatWeek(snapshot.stats.peakIliWeek)} / {snapshot.stats.peakIliCases?.toLocaleString() ?? "-"}
          </strong>
        </article>
        <article className="stat-card">
          <h3>{t.statsFirstCrossing}</h3>
          <strong>{formatWeek(snapshot.stats.firstIliThresholdCrossingWeek)}</strong>
        </article>
        <article className="stat-card">
          <h3>{t.statsWeeksAbove}</h3>
          <strong>{snapshot.stats.weeksAboveIliThreshold.toLocaleString()}</strong>
        </article>
        <article className="stat-card">
          <h3>{t.statsLatestSari}</h3>
          <strong>
            {snapshot.stats.latestSariAdmissions ?? "-"} / {snapshot.stats.latestSariIcu ?? "-"}
          </strong>
        </article>
      </section>

      <section className="charts-grid">
        <EChartsPanel
          title={t.chartIli}
          subtitle={formatText(t.chartIliSubtitle, {
            season: snapshot.seasonLabel,
            threshold: snapshot.iliThreshold.toLocaleString(),
          })}
          option={iliOption}
        />
        <EChartsPanel
          title={t.chartSari}
          subtitle={formatText(t.chartSariSubtitle, { season: snapshot.seasonLabel })}
          option={sariOption}
        />
      </section>

      <section className="virology-section">
        <header className="virology-header">
          <div>
            <h2>{t.virologyTitle}</h2>
            <p>{formatText(t.virologyWeek, { week: latestVirologyWeekLabel })}</p>
          </div>
          <div className="virology-controls">
            <label htmlFor="virology-virus-select">{t.virologyFilter}</label>
            <select
              id="virology-virus-select"
              value={selectedVirologyVirus}
              onChange={(event) => setSelectedVirologyVirus(event.target.value)}
            >
              <option value={VIRO_ALL_KEY}>{t.virologyAllViruses}</option>
              {snapshot.virology.availableDetectionViruses.map((virus) => (
                <option key={virus} value={virus}>
                  {displayVirusLabel(virus, language)}
                </option>
              ))}
            </select>
          </div>
        </header>

        <div className="virology-lists">
          <article className="virology-list-card">
            <h3>{t.virologyTopDetections}</h3>
            {virologyDetectionList.length ? (
              <ul>
                {virologyDetectionList.map((row) => (
                  <li key={`${row.virus}-${row.week}`}>
                    <span>{displayVirusLabel(row.virus, language)}</span>
                    <strong>{row.detections.toLocaleString()}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="virology-empty">{t.virologyNoDetections}</p>
            )}
          </article>
          <article className="virology-list-card">
            <h3>{t.virologyTopPositivity}</h3>
            {virologyPositivityList.length ? (
              <ul>
                {virologyPositivityList.map((row) => (
                  <li key={`${row.virus}-${row.week}`}>
                    <span>{displayVirusLabel(row.virus, language)}</span>
                    <strong>{row.positivity.toFixed(1)}%</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="virology-empty">{t.virologyNoPositivity}</p>
            )}
          </article>
        </div>

        <div className="virology-grid">
          <EChartsPanel
            title={t.virologyDetectionsTrend}
            subtitle={formatText(t.virologyDetectionsSubtitle, { week: latestVirologyWeekLabel })}
            option={virologyDetectionsOption}
          />
          <EChartsPanel
            title={t.virologyPositivityTrend}
            subtitle={formatText(t.virologyDetectionsSubtitle, { week: latestVirologyWeekLabel })}
            option={virologyPositivityOption}
          />
        </div>
      </section>

      <section className="table-section" aria-label={t.tableAria}>
        <header className="table-header">
          <div>
            <h2>{t.tableTitle}</h2>
            <p>{t.tableNote}</p>
          </div>
          <div className="table-badge">{t.tableBadge}</div>
        </header>
        <div className="table-scroll" role="region" aria-label={t.tableScrollAria}>
          <table className="data-table">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sortable"
                  tabIndex={0}
                  aria-sort={weekSortAria}
                  onClick={() => toggleTableSort("week")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleTableSort("week");
                    }
                  }}
                >
                  <span>{t.tableWeek}</span>
                  <span className="sort-indicator" aria-hidden="true">
                    {weekSortIndicator}
                  </span>
                </th>
                <th scope="col">{t.tableVirus}</th>
                <th scope="col">{t.tableRegion}</th>
                <th
                  scope="col"
                  className="sortable"
                  tabIndex={0}
                  aria-sort={casesSortAria}
                  onClick={() => toggleTableSort("cases")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleTableSort("cases");
                    }
                  }}
                >
                  <span>{t.tableCases}</span>
                  <span className="sort-indicator" aria-hidden="true">
                    {casesSortIndicator}
                  </span>
                </th>
                <th scope="col">{t.tableSariAdmissions}</th>
                <th scope="col">{t.tableSariIcu}</th>
                <th scope="col">{t.tableTopPositivity}</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.length ? (
                tableRows.map((row) => (
                  <tr key={row.week}>
                    <td>{formatWeek(row.week)}</td>
                    <td>{displayVirusLabel(row.virus, language)}</td>
                    <td>{row.region === "National" ? t.regionNational : row.region}</td>
                    <td>{Number.isFinite(row.cases) ? Number(row.cases).toLocaleString() : "–"}</td>
                    <td>{Number.isFinite(row.sariAdmissions) ? Number(row.sariAdmissions).toLocaleString() : "–"}</td>
                    <td>{Number.isFinite(row.sariIcu) ? Number(row.sariIcu).toLocaleString() : "–"}</td>
                    <td>
                      {row.topPositivityVirus && Number.isFinite(row.topPositivity)
                        ? `${displayVirusLabel(row.topPositivityVirus, language)} (${Number(row.topPositivity).toFixed(1)}%)`
                        : "–"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>{t.tableNoData}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="historical-section">
        <header className="historical-header">
          <h2>{t.historicalTitle}</h2>
          {snapshot.historical.available && snapshot.historical.compareSeasonLabel ? (
            <p>
              {snapshot.historical.currentSeasonLabel} vs {snapshot.historical.compareSeasonLabel}
            </p>
          ) : (
            <p>{t.historicalEmptyHeader}</p>
          )}
        </header>

        {snapshot.historical.available &&
        snapshot.historical.compareSeasonLabel &&
        historicalIliOption &&
        historicalSariOption &&
        historicalIcuOption ? (
          <div className="historical-grid">
            <EChartsPanel
              title={t.historicalIli}
              subtitle={formatText(t.historicalDelta, { value: formatSignedPercent(snapshot.historical.ili.latestDeltaPercent) })}
              option={historicalIliOption}
            />
            <EChartsPanel
              title={t.historicalSari}
              subtitle={formatText(t.historicalDelta, { value: formatSignedPercent(snapshot.historical.sariAdmissions.latestDeltaPercent) })}
              option={historicalSariOption}
            />
            <EChartsPanel
              title={t.historicalIcu}
              subtitle={formatText(t.historicalDelta, { value: formatSignedPercent(snapshot.historical.sariIcu.latestDeltaPercent) })}
              option={historicalIcuOption}
            />
          </div>
        ) : (
          <article className="historical-empty">
            {t.historicalUnavailable}
          </article>
        )}
      </section>

      <section className="region-divider eu" aria-label={t.sectionEuTitle}>
        <span className="region-divider-kicker">{t.sectionKicker}</span>
        <div>
          <h2>{t.sectionEuTitle}</h2>
          <p>{t.sectionEuNote}</p>
        </div>
      </section>

      <section className="virology-section eu-section">
        <header className="virology-header">
          <div>
            <h2>{t.euVirologyTitle}</h2>
            <p>{formatText(t.virologyWeek, { week: latestEuWeekLabel })}</p>
          </div>
        </header>

        <div className="virology-lists">
          <article className="virology-list-card">
            <h3>{t.euTopDetections}</h3>
            {euDetectionsList.length ? (
              <ul>
                {euDetectionsList.map((row) => (
                  <li key={`${row.virus}-${row.week}`}>
                    <span>{displayVirusLabel(row.virus, language)}</span>
                    <strong>{row.detections.toLocaleString()}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="virology-empty">{t.euNoDetections}</p>
            )}
          </article>
          <article className="virology-list-card">
            <h3>{t.euTopPositivity}</h3>
            {euPositivityList.length ? (
              <ul>
                {euPositivityList.map((row) => (
                  <li key={`${row.virus}-${row.week}`}>
                    <span>{displayVirusLabel(row.virus, language)}</span>
                    <strong>{row.positivity.toFixed(1)}%</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="virology-empty">{t.euNoPositivity}</p>
            )}
          </article>
        </div>

        <div className="virology-grid">
          <EChartsPanel
            title={t.euDetectionsTrend}
            subtitle={formatText(t.euTrendSubtitle, { year: snapshot.euVirology.targetYear ?? "–" })}
            option={euDetectionsOption}
          />
          <EChartsPanel
            title={t.euPositivityTrend}
            subtitle={formatText(t.euTrendSubtitle, { year: snapshot.euVirology.targetYear ?? "–" })}
            option={euPositivityOption}
          />
        </div>
      </section>

      {snapshot.warnings.length ? (
        <section className="warning-panel" role="status" aria-live="polite">
          <h3>{t.warningsTitle}</h3>
          <ul>
            {snapshot.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
