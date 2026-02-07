import { useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import { graphic } from "echarts/core";
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
const HUNGARY_POPULATION_DENOMINATOR = 9_600_000;

type SortColumn = "week" | "cases";
type SortDirection = "asc" | "desc";
type TrendDirection = "surging" | "declining" | "flat";
type ConfidenceLevel = "high" | "medium" | "low";
type Language = "en" | "hu";
type ThemeMode = "system" | "dark" | "light";
type ResolvedTheme = "dark" | "light";
type PathogenFamily = "influenza" | "sarscov2" | "rsv" | "hmpv" | "other";

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

interface EpiBaselineStats {
  zScore: number | null;
  baselineCount: number;
  baselineMean: number | null;
}

interface EpiMetricSnapshot {
  latestWeek: number | null;
  latestValue: number | null;
  ratePer100k: number | null;
  weekOverWeekPercent: number | null;
  baseline: EpiBaselineStats;
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
    sectionCollapse: "Collapse",
    sectionExpand: "Expand",
    sourceTitle: "Data source",
    sourceLive: "Live source: nngyk_all.json",
    sourceFallback: "Fallback source: bundled sample",
    sourceLoading: "loading",
    sectionKicker: "Section",
    sectionHuTitle: "Hungarian situation",
    sectionHuNote: "NNGYK surveillance and sentinel indicators for the selected season.",
    sectionEuTitle: "European (EU/EEA) context",
    sectionEuNote: "ECDC ERVISS sentinel virology indicators.",
    alertsAria: "Key alerts",
    signalTitle: "Seasonal influenza threshold",
    signalEpidemicYes: "Influenza epidemic ongoing",
    signalEpidemicNo: "No influenza epidemic",
    signalAbove: "Above threshold",
    signalBelow: "Below threshold",
    fluTextAbove: "{week}: ILI activity ({cases} estimated cases) is above the alert threshold ({threshold}).",
    fluTextBelow: "{week}: ILI activity ({cases} estimated cases) remains below the alert threshold ({threshold}).",
    fluChipAbove: "Epidemic signal",
    fluChipBelow: "Below threshold",
    alertThreshold: "Alert threshold",
    crossingLabel: "Threshold crossing",
    alertsLoading: "Awaiting data",
    alertsLoadingPos: "Awaiting positivity data",
    alertsLoadingEuPos: "Awaiting EU/EEA positivity data",
    decisionTitle: "Weekly situation",
    decisionIncreasing: "Influenza activity is increasing (HU)",
    decisionEasing: "Influenza pressure is easing",
    decisionStableHigh: "Influenza pressure remains high",
    decisionRisingBelow: "Influenza activity is rising",
    decisionStableLow: "No influenza epidemic signal",
    decisionConfidence: "Confidence",
    decisionFreshness: "Updated",
    decisionEvidenceIli: "View ILI and SARI charts",
    decisionEvidenceHuPositivity: "View sentinel positivity",
    decisionEvidenceEuPositivity: "View EU positivity",
    decisionConfidenceHigh: "High",
    decisionConfidenceMedium: "Moderate",
    decisionConfidenceLow: "Limited",
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
    trendNote: "Weekly change in ILI cases and sentinel positivity.",
    trendAria: "Weekly trend signals",
    trendNoRecentChange: "No notable change",
    trendSurging: "Surging",
    trendDeclining: "Declining",
    trendFlat: "Flat",
    trendEmpty: "No recent ILI or positivity trend data.",
    rigorTitle: "Epidemiological rigor",
    rigorNote: "Comparable indicators using rates, baseline z-scores, age split and data-quality signals.",
    rigorAria: "Epidemiological rigor indicators",
    rigorIliRateCard: "ILI rate (per 100k)",
    rigorSariRateCard: "SARI admissions rate (per 100k)",
    rigorWoW: "WoW",
    rigorZScore: "Z-score vs baseline",
    rigorBaselineSample: "Baseline seasons",
    rigorBaselineMean: "Baseline mean",
    rigorAgeSplitTitle: "ILI age split (latest week)",
    rigorAgeMissing: "Age split is unavailable in the current data source.",
    rigorAge0to14: "Age 0-14",
    rigorAge15to34: "Age 15-34",
    rigorAge35to59: "Age 35-59",
    rigorAge60plus: "Age 60+",
    rigorQualityTitle: "Uncertainty and data quality",
    rigorQualityCoverage: "Coverage",
    rigorQualityBaseline: "Baseline robustness",
    rigorQualityAge: "Age split availability",
    rigorQualityGood: "Good",
    rigorQualityModerate: "Moderate",
    rigorQualityLimited: "Limited",
    rigorPer100kSuffix: "/100k",
    glanceTitle: "Season at a glance",
    glanceNote: "Growth and burden signals alongside peak and recent trend.",
    glanceAria: "Season at a glance",
    glanceIli: "Flu-like illness",
    glanceSari: "SARI hospitalizations",
    glanceIcu: "SARI ICU",
    glancePeak: "Peak",
    glanceLatest: "Latest",
    glanceSlope: "3-week trend",
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
    statsPeakIli: "ILI peak week / cases",
    statsIliVsPrev: "Latest ILI vs previous season",
    statsIliVsPrevBaseline: "{season}: {value}",
    statsIliVsPrevNoBaseline: "No previous-season value for this week.",
    statsFirstCrossing: "First threshold crossing",
    statsWeeksAbove: "Weeks above threshold",
    statsLatestSari: "Latest SARI admissions / ICU cases",
    chartIli: "Flu-like illness",
    chartIliSubtitle: "Season {season} (threshold {threshold})",
    chartSari: "SARI hospital admissions",
    chartSariSubtitle: "Season {season}",
    leaderHuTitle: "Leading virus by positivity in Hungary",
    leaderEuTitle: "Leading virus by positivity in the EU/EEA",
    leaderHuText: "{week}: {virus} shows the highest sentinel positivity ({pos}%).",
    leaderEuText: "{week} ({year}): {virus} shows the highest EU/EEA sentinel positivity ({pos}%).",
    leadersAria: "Latest virology leaders",
    virologyTitle: "Sentinel virology",
    virologyWeek: "Latest: {week}",
    virologyFilter: "Detections filter",
    virologyAllViruses: "All viruses",
    virologyTopDetections: "Top detections",
    virologyTopPositivity: "Top positivity",
    virologyNoDetections: "No detections available.",
    virologyNoPositivity: "No positivity data available.",
    virologyDetectionsTrend: "Sentinel detections trend",
    virologyDetectionsSubtitle: "{week} focus",
    virologyPositivityTrend: "Sentinel positivity trend",
    euVirologyTitle: "EU/EEA ERVISS virology",
    euTopDetections: "Top EU detections",
    euTopPositivity: "Top EU positivity",
    euNoDetections: "No EU detections available.",
    euNoPositivity: "No EU positivity data available.",
    euDetectionsTrend: "EU detections trend",
    euPositivityTrend: "EU positivity trend",
    euTrendSubtitle: "Target NH respiratory season: {season}",
    tableTitle: "Respiratory viruses week-by-week in Hungary",
    tableNote: "Click Week or Cases to sort; includes matching SARI and positivity context.",
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
    footerUpdatedShort: "Updated",
    footerWarningsShort: "Warn",
    footerLastUpdateLoading: "Loading data...",
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
    sectionCollapse: "Összecsuk",
    sectionExpand: "Kinyit",
    sourceTitle: "Adatforrás",
    sourceLive: "Élő forrás: nngyk_all.json",
    sourceFallback: "Tartalék forrás: beépített minta",
    sourceLoading: "betöltés",
    sectionKicker: "Szekció",
    sectionHuTitle: "Magyarországi helyzet",
    sectionHuNote: "NNGYK rutinfelügyeleti és sentinel mutatók a kiválasztott szezonban.",
    sectionEuTitle: "Európai (EU/EGT) kitekintés",
    sectionEuNote: "ECDC ERVISS sentinel virológiai mutatók.",
    alertsAria: "Fő riasztások",
    signalTitle: "Szezonális influenzaküszöb",
    signalEpidemicYes: "Influenza járvány van",
    signalEpidemicNo: "Nincs influenza járvány",
    signalAbove: "Küszöb felett",
    signalBelow: "Küszöb alatt",
    fluTextAbove: "{week}: az ILI-aktivitás ({cases} becsült eset) meghaladja a riasztási küszöböt ({threshold}).",
    fluTextBelow: "{week}: az ILI-aktivitás ({cases} becsült eset) a riasztási küszöb ({threshold}) alatt marad.",
    fluChipAbove: "Járványjelzés",
    fluChipBelow: "Küszöb alatt",
    alertThreshold: "Riasztási küszöb",
    crossingLabel: "Küszöbátlépés",
    alertsLoading: "Adatok betöltése",
    alertsLoadingPos: "Pozitivitási adatok betöltése",
    alertsLoadingEuPos: "EU/EGT pozitivitási adatok betöltése",
    decisionTitle: "Heti helyzetkép",
    decisionIncreasing: "Az influenzaaktivitás erősödik (HU)",
    decisionEasing: "Az influenzaaktivitás gyengül",
    decisionStableHigh: "Az influenzaaktivitás továbbra is magas",
    decisionRisingBelow: "Az influenzaaktivitás emelkedik",
    decisionStableLow: "Nincs influenza járványjelzés",
    decisionConfidence: "Megbízhatóság",
    decisionFreshness: "Frissítés",
    decisionEvidenceIli: "ILI és SARI grafikon",
    decisionEvidenceHuPositivity: "Sentinel pozitivitás",
    decisionEvidenceEuPositivity: "EU pozitivitás",
    decisionConfidenceHigh: "Magas",
    decisionConfidenceMedium: "Közepes",
    decisionConfidenceLow: "Korlátozott",
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
    trendNote: "Heti változás az ILI-esetszámban és a sentinel pozitivitásban.",
    trendAria: "Heti trendszignálok",
    trendNoRecentChange: "Nincs friss változás",
    trendSurging: "Erősödik",
    trendDeclining: "Gyengül",
    trendFlat: "Változatlan",
    trendEmpty: "Nincs friss ILI- vagy pozitivitási trendadat.",
    rigorTitle: "Epidemiológiai megalapozottság",
    rigorNote: "Összehasonlítható mutatók: 100 ezer főre vetített ráta, bázis z-score, korcsoporti megoszlás és adatminőségi jelzések.",
    rigorAria: "Epidemiológiai megalapozottsági mutatók",
    rigorIliRateCard: "ILI ráta (100 ezer főre)",
    rigorSariRateCard: "SARI felvételi ráta (100 ezer főre)",
    rigorWoW: "Heti változás",
    rigorZScore: "Z-score a bázishoz",
    rigorBaselineSample: "Bázis szezonok",
    rigorBaselineMean: "Bázis átlag",
    rigorAgeSplitTitle: "ILI korcsoporti megoszlás (legfrissebb hét)",
    rigorAgeMissing: "A korcsoporti megoszlás nem elérhető az aktuális adatforrásban.",
    rigorAge0to14: "0-14 év",
    rigorAge15to34: "15-34 év",
    rigorAge35to59: "35-59 év",
    rigorAge60plus: "60+ év",
    rigorQualityTitle: "Bizonytalanság és adatminőség",
    rigorQualityCoverage: "Lefedettség",
    rigorQualityBaseline: "Bázis megbízhatóság",
    rigorQualityAge: "Korcsoporti adat",
    rigorQualityGood: "Jó",
    rigorQualityModerate: "Közepes",
    rigorQualityLimited: "Korlátozott",
    rigorPer100kSuffix: "/100 ezer",
    glanceTitle: "Szezon pillanatkép",
    glanceNote: "Terhelési és növekedési jelzések a szezon alakulásáról.",
    glanceAria: "Szezon pillanatkép",
    glanceIli: "Influenzaszerű megbetegedés (ILI)",
    glanceSari: "SARI felvételek",
    glanceIcu: "SARI ICU",
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
    statsIliVsPrev: "Legfrissebb ILI vs előző szezon",
    statsIliVsPrevBaseline: "{season}: {value}",
    statsIliVsPrevNoBaseline: "Ehhez a héthez nincs előző szezonos érték.",
    statsFirstCrossing: "Első küszöbátlépés",
    statsWeeksAbove: "Küszöb feletti hetek",
    statsLatestSari: "Legfrissebb SARI felvételek / ICU",
    chartIli: "Influenzaszerű megbetegedés (ILI)",
    chartIliSubtitle: "Szezon: {season} (küszöb {threshold})",
    chartSari: "SARI kórházi felvételek",
    chartSariSubtitle: "Szezon: {season}",
    leaderHuTitle: "Legmagasabb sentinel pozitivitás (Magyarország)",
    leaderEuTitle: "Legmagasabb sentinel pozitivitás (EU/EGT)",
    leaderHuText: "{week}: {virus} mutatja a legmagasabb sentinel pozitivitást ({pos}%).",
    leaderEuText: "{week} ({year}): {virus} mutatja a legmagasabb EU/EGT sentinel pozitivitást ({pos}%).",
    leadersAria: "Legfrissebb virológiai vezetők",
    virologyTitle: "Sentinel virológia",
    virologyWeek: "Legfrissebb: {week}",
    virologyFilter: "Detekció szűrő",
    virologyAllViruses: "Összes vírus",
    virologyTopDetections: "Legmagasabb detekciók",
    virologyTopPositivity: "Legmagasabb pozitivitás",
    virologyNoDetections: "Nincs detekciós adat.",
    virologyNoPositivity: "Nincs pozitivitási adat.",
    virologyDetectionsTrend: "Sentinel detekciós trend",
    virologyDetectionsSubtitle: "{week} fókusz",
    virologyPositivityTrend: "Sentinel pozitivitási trend",
    euVirologyTitle: "EU/EGT ERVISS virológia",
    euTopDetections: "Legmagasabb EU detekciók",
    euTopPositivity: "Legmagasabb EU pozitivitás",
    euNoDetections: "Nincs EU detekciós adat.",
    euNoPositivity: "Nincs EU pozitivitási adat.",
    euDetectionsTrend: "EU detekciós trend",
    euPositivityTrend: "EU pozitivitási trend",
    euTrendSubtitle: "Cél NH légúti szezon: {season}",
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
    historicalSari: "SARI felvételek összevetése",
    historicalIcu: "SARI ICU összevetés",
    historicalDelta: "Legfrissebb eltérés: {value}",
    historicalUnavailable: "A történeti összevetés nem érhető el, mert hiányzik az előző szezon a betöltött adatforrásból.",
    warningsTitle: "Adat figyelmeztetések",
    footerUpdatedShort: "Frissítve",
    footerWarningsShort: "Figy.",
    footerLastUpdateLoading: "Adatok betöltése...",
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

function formatWeek(week: number | null, language: Language = "en"): string {
  if (typeof week !== "number" || !Number.isFinite(week)) return "-";
  const code = String(week).padStart(2, "0");
  return language === "hu" ? `Hét ${code}` : `W${code}`;
}

function formatWeekToken(label: string, language: Language): string {
  const match = /^W(\d{1,2})$/i.exec(String(label ?? "").trim());
  if (!match) return label;
  const code = String(Number(match[1])).padStart(2, "0");
  return language === "hu" ? `H${code}` : `W${code}`;
}

function formatDateTime(value: Date, language: Language): string {
  const locale = language === "hu" ? "hu-HU" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function resolvePathogenFamily(virus: string | null | undefined): PathogenFamily {
  const normalized = String(virus ?? "").trim().toLowerCase();
  if (!normalized) return "other";
  if (
    normalized === INFLUENZA_ALL_KEY.toLowerCase() ||
    normalized.includes("influenza") ||
    normalized.includes("flu-like") ||
    normalized.startsWith("ili")
  ) {
    return "influenza";
  }
  if (normalized.includes("sars") || normalized.includes("cov")) return "sarscov2";
  if (/\brsv\b/.test(normalized)) return "rsv";
  if (normalized.includes("hmpv") || normalized.includes("metapneumo")) return "hmpv";
  return "other";
}

function pathogenClassName(virus: string | null | undefined): `pathogen-${PathogenFamily}` {
  return `pathogen-${resolvePathogenFamily(virus)}`;
}

function formatNhSeasonLabel(seasonStartYear: number, language: Language): string {
  const nextYear = seasonStartYear + 1;
  return language === "hu" ? `${seasonStartYear}/${nextYear}` : `${seasonStartYear}/${nextYear}`;
}

function calendarYearFromNhSeasonWeek(seasonStartYear: number, week: number): number {
  return week >= 40 ? seasonStartYear : seasonStartYear + 1;
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

function formatGlanceLine(point: MetricPoint | null, language: Language): string {
  if (!point) return "–";
  return `${formatWeek(point.week, language)}: ${Number(point.value).toLocaleString()}`;
}

function formatGlanceLatest(glance: GlanceSummary | null, language: Language): string {
  if (!glance) return "–";
  const latest = `${formatWeek(glance.latest.week, language)}: ${Number(glance.latest.value).toLocaleString()}`;
  if (!Number.isFinite(glance.pctOfPeak)) return latest;
  return `${latest} (${Math.round(Number(glance.pctOfPeak))}%)`;
}

function formatSlopePerWeek(slope: number | null, language: Language): string {
  if (!Number.isFinite(slope)) return "–";
  const rounded = Math.round(Number(slope));
  const sign = rounded > 0 ? "+" : "";
  return language === "hu" ? `${sign}${rounded.toLocaleString()}/hét` : `${sign}${rounded.toLocaleString()}/week`;
}

function formatTrendBubble(changePercent: number): string {
  if (!Number.isFinite(changePercent)) return "0%";
  const rounded = Math.round(changePercent);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}

function ratePer100k(value: number | null, population = HUNGARY_POPULATION_DENOMINATOR): number | null {
  if (!Number.isFinite(value) || !Number.isFinite(population) || population <= 0) return null;
  return (Number(value) / population) * 100000;
}

function coverageRatioFromSeries(points: MetricPoint[]): number | null {
  if (!points.length) return null;
  const weeks = Array.from(new Set(points.map((point) => point.week))).sort((a, b) => seasonWeekCompare(a, b));
  if (!weeks.length) return null;
  const first = weeks[0];
  const last = weeks[weeks.length - 1];
  const span = seasonWeekCompare(last, first) + 1;
  if (!Number.isFinite(span) || span <= 0) return null;
  return Math.min(1, weeks.length / span);
}

function computeBaselineStatsForWeek(
  currentValue: number | null,
  week: number | null,
  currentYear: number,
  availableYears: number[],
  seriesForYear: (year: number) => MetricPoint[]
): EpiBaselineStats {
  if (!Number.isFinite(currentValue) || !Number.isFinite(week)) {
    return { zScore: null, baselineCount: 0, baselineMean: null };
  }

  const baselineValues = availableYears
    .filter((year) => year < currentYear)
    .map((year) => seriesForYear(year).find((point) => point.week === week)?.value ?? null)
    .filter((value): value is number => Number.isFinite(value));

  if (!baselineValues.length) {
    return { zScore: null, baselineCount: 0, baselineMean: null };
  }

  const baselineMean = baselineValues.reduce((sum, value) => sum + value, 0) / baselineValues.length;
  if (baselineValues.length < 2) {
    return { zScore: null, baselineCount: baselineValues.length, baselineMean };
  }

  const variance =
    baselineValues.reduce((sum, value) => sum + (value - baselineMean) * (value - baselineMean), 0) / baselineValues.length;
  const stdDev = Math.sqrt(variance);
  if (!Number.isFinite(stdDev) || stdDev === 0) {
    return {
      zScore: Math.abs(Number(currentValue) - baselineMean) < 1e-9 ? 0 : null,
      baselineCount: baselineValues.length,
      baselineMean,
    };
  }

  return {
    zScore: (Number(currentValue) - baselineMean) / stdDev,
    baselineCount: baselineValues.length,
    baselineMean,
  };
}

function buildEpiMetricSnapshot(
  series: MetricPoint[],
  currentYear: number,
  availableYears: number[],
  seriesForYear: (year: number) => MetricPoint[]
): EpiMetricSnapshot {
  const ordered = series
    .filter((point) => Number.isFinite(point.week) && Number.isFinite(point.value))
    .slice()
    .sort((a, b) => seasonWeekCompare(a.week, b.week));
  const latest = ordered.length ? ordered[ordered.length - 1] : null;
  const weekOverWeekPercent = computeWeekOverWeekChange(ordered);
  const baseline = computeBaselineStatsForWeek(latest?.value ?? null, latest?.week ?? null, currentYear, availableYears, seriesForYear);
  return {
    latestWeek: latest?.week ?? null,
    latestValue: latest?.value ?? null,
    ratePer100k: latest ? ratePer100k(latest.value) : null,
    weekOverWeekPercent,
    baseline,
  };
}

function formatRatePer100kLabel(value: number | null, suffix: string): string {
  if (!Number.isFinite(value)) return "–";
  return `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${suffix}`;
}

function formatZScore(value: number | null): string {
  if (!Number.isFinite(value)) return "–";
  const rounded = Math.round(Number(value) * 100) / 100;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(2)}`;
}

function confidenceLevelFromScore(score: number): ConfidenceLevel {
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function virusClassName(virus: string | null | undefined): `pathogen-${PathogenFamily}` {
  return pathogenClassName(virus);
}

function VirusIcon({ virus }: { virus: string | null | undefined }) {
  const pathogenClass = virusClassName(virus);
  return (
    <span className={`virus-icon ${pathogenClass}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <circle cx="12" cy="12" r="4.5" />
        <line x1="12" y1="2.5" x2="12" y2="5.8" />
        <line x1="12" y1="18.2" x2="12" y2="21.5" />
        <line x1="2.5" y1="12" x2="5.8" y2="12" />
        <line x1="18.2" y1="12" x2="21.5" y2="12" />
        <line x1="5.3" y1="5.3" x2="7.8" y2="7.8" />
        <line x1="16.2" y1="16.2" x2="18.7" y2="18.7" />
        <line x1="18.7" y1="5.3" x2="16.2" y2="7.8" />
        <line x1="7.8" y1="16.2" x2="5.3" y2="18.7" />
      </svg>
    </span>
  );
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
  const [dataLoadedAt, setDataLoadedAt] = useState<Date | null>(null);
  const [isSentinelVirologyOpen, setIsSentinelVirologyOpen] = useState<boolean>(true);
  const [isSeasonGlanceOpen, setIsSeasonGlanceOpen] = useState<boolean>(true);
  const [isWeeklyTableOpen, setIsWeeklyTableOpen] = useState<boolean>(true);
  const [isHungarySectionOpen, setIsHungarySectionOpen] = useState<boolean>(true);
  const [isEuSectionOpen, setIsEuSectionOpen] = useState<boolean>(true);

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
        if (active) {
          setIsDataLoading(false);
          setDataLoadedAt(new Date());
        }
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
          weekPrefix: language === "hu" ? "H" : "W",
        },
      }),
    [compact, isDark, language, snapshot.iliSeries, snapshot.iliThreshold, t.alertThreshold, t.crossingLabel, t.glanceIli, t.noDataShort]
  );

  const sariOption = useMemo<EChartsOption>(() => {
    const hasData = snapshot.sariSeries.length > 0;
    const currentWeekLabel = hasData ? snapshot.sariSeries[snapshot.sariSeries.length - 1].label : null;
    const admissionsValues = snapshot.sariSeries.map((point) => point.admissions);
    const icuValues = snapshot.sariSeries.map((point) => point.icu);
    const palette = isDark
      ? {
          axisLabel: "#cbd5e1",
          axisLine: "rgba(148, 163, 184, 0.45)",
          grid: "rgba(148, 163, 184, 0.16)",
          legend: "#e2e8f0",
          legendBg: "rgba(15, 23, 42, 0.82)",
          legendBorder: "rgba(148, 163, 184, 0.32)",
          currentWeekLine: "rgba(125, 211, 252, 0.55)",
          tooltipBg: "rgba(15, 23, 42, 0.96)",
          tooltipBorder: "rgba(148, 163, 184, 0.48)",
          tooltipText: "#e2e8f0",
        }
      : {
          axisLabel: "#334155",
          axisLine: "rgba(15, 23, 42, 0.20)",
          grid: "rgba(15, 23, 42, 0.1)",
          legend: "#0f172a",
          legendBg: "rgba(248, 250, 252, 0.92)",
          legendBorder: "rgba(148, 163, 184, 0.38)",
          currentWeekLine: "rgba(37, 99, 235, 0.45)",
          tooltipBg: "rgba(15, 23, 42, 0.94)",
          tooltipBorder: "rgba(30, 41, 59, 0.24)",
          tooltipText: "#f8fafc",
        };
    return {
      animation: false,
      grid: { top: compact ? 40 : 78, right: 18, bottom: 34, left: 54 },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "line",
          lineStyle: {
            color: palette.currentWeekLine,
            type: "dashed",
            width: 1.1,
          },
        },
        backgroundColor: palette.tooltipBg,
        borderColor: palette.tooltipBorder,
        borderWidth: 1,
        textStyle: { color: palette.tooltipText, fontWeight: 600 },
        extraCssText: "box-shadow: 0 14px 30px rgba(2, 6, 23, 0.28);",
        formatter: (params: unknown) => {
          const rows = Array.isArray(params) ? params : [];
          if (!rows.length) return "";
          const first = rows[0] as { axisValueLabel?: string };
          const header = formatWeekToken(first.axisValueLabel ?? "", language);
          const lines = rows
            .map((entry) => {
              const row = entry as { marker?: string; seriesName?: string; data?: number | null };
              const value = typeof row.data === "number" && Number.isFinite(row.data) ? row.data.toLocaleString() : "–";
              return `${row.marker ?? ""} ${row.seriesName ?? ""}: ${value}`;
            })
            .join("<br/>");
          return `${header}<br/>${lines}`;
        },
      },
      legend: {
        show: !compact,
        top: 2,
        left: 8,
        right: 8,
        itemWidth: 12,
        itemHeight: 8,
        itemGap: 12,
        padding: [6, 10],
        backgroundColor: palette.legendBg,
        borderColor: palette.legendBorder,
        borderWidth: 1,
        borderRadius: 10,
        textStyle: { color: palette.legend, fontWeight: 600, fontSize: 12, lineHeight: 16 },
        icon: "circle",
      },
      xAxis: {
        type: "category",
        data: snapshot.sariSeries.map((point) => point.label),
        boundaryGap: false,
        axisLine: { lineStyle: { color: palette.axisLine } },
        axisTick: { show: false },
        axisLabel: {
          color: palette.axisLabel,
          hideOverlap: true,
          formatter: (value: string) => formatWeekToken(String(value), language),
        },
      },
      yAxis: {
        type: "value",
        min: 0,
        axisLabel: {
          color: palette.axisLabel,
          formatter: (value: number) => value.toLocaleString(),
        },
        splitLine: { lineStyle: { color: palette.grid, type: [4, 5] } },
      },
      series: [
        {
          name: t.tableSariAdmissions,
          type: "line",
          data: hasData ? admissionsValues : [0],
          smooth: 0.22,
          showSymbol: false,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: {
            width: 2.8,
            color: isDark ? "#7dd3fc" : "#2563eb",
            cap: "round",
          },
          itemStyle: {
            color: isDark ? "#7dd3fc" : "#2563eb",
          },
          areaStyle: {
            color: new graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: isDark ? "rgba(125, 211, 252, 0.34)" : "rgba(59, 130, 246, 0.22)" },
              { offset: 1, color: isDark ? "rgba(56, 189, 248, 0.05)" : "rgba(147, 197, 253, 0.03)" },
            ]),
          },
          emphasis: {
            focus: "series",
            lineStyle: {
              width: 3.4,
            },
          },
          markLine: currentWeekLabel
            ? {
                symbol: ["none", "none"],
                silent: true,
                lineStyle: { color: palette.currentWeekLine, width: 1.3, type: "dashed" },
                label: { show: false },
                data: [{ xAxis: currentWeekLabel }],
              }
            : undefined,
          z: 4,
        },
        {
          name: t.tableSariIcu,
          type: "line",
          data: hasData ? icuValues : [0],
          smooth: 0.2,
          showSymbol: false,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: {
            width: 2.4,
            color: isDark ? "#fb923c" : "#dc2626",
            cap: "round",
          },
          itemStyle: {
            color: isDark ? "#fb923c" : "#dc2626",
          },
          areaStyle: {
            color: new graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: isDark ? "rgba(251, 146, 60, 0.24)" : "rgba(248, 113, 113, 0.18)" },
              { offset: 1, color: isDark ? "rgba(249, 115, 22, 0.04)" : "rgba(252, 165, 165, 0.03)" },
            ]),
          },
          emphasis: {
            focus: "series",
            lineStyle: {
              width: 3,
            },
          },
          z: 5,
        },
      ],
    };
  }, [compact, isDark, language, snapshot.sariSeries, t.tableSariAdmissions, t.tableSariIcu]);

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
        weekOrder: "season",
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
        weekOrder: "season",
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
      language,
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
      language,
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
      language,
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
    const latestWeek = snapshot.euVirology.positivityRows.reduce(
      (best, row) => (seasonWeekCompare(row.week, best) > 0 ? row.week : best),
      snapshot.euVirology.positivityRows[0].week
    );
    const latestRows = snapshot.euVirology.positivityRows.filter((row) => row.week === latestWeek);
    if (!latestRows.length) return null;
    const leader = latestRows.reduce((best, row) => (row.positivity > best.positivity ? row : best), latestRows[0]);
    return {
      year: calendarYearFromNhSeasonWeek(snapshot.euVirology.targetYear, latestWeek),
      week: latestWeek,
      virus: leader.virus,
      positivity: leader.positivity,
    };
  }, [snapshot.euVirology.positivityRows, snapshot.euVirology.targetYear]);

  const iliLatestWeekLabel = snapshot.iliSeries.length ? formatWeek(snapshot.iliSeries[snapshot.iliSeries.length - 1].week, language) : "–";
  const sariLatestWeekLabel = snapshot.sariSeries.length ? formatWeek(snapshot.sariSeries[snapshot.sariSeries.length - 1].week, language) : "–";
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

  const epidemiology = useMemo(() => {
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

    const currentIliSeries = buildIliSeriesForYear(snapshot.selectedYear);
    const currentSariSeries = buildSariAdmissionsSeriesForYear(snapshot.selectedYear);
    const iliMetric = buildEpiMetricSnapshot(
      currentIliSeries,
      snapshot.selectedYear,
      snapshot.availableYears,
      buildIliSeriesForYear
    );
    const sariMetric = buildEpiMetricSnapshot(
      currentSariSeries,
      snapshot.selectedYear,
      snapshot.availableYears,
      buildSariAdmissionsSeriesForYear
    );

    const ageSplitCandidates = dataSource.iliAgeSplits
      .filter((point) => point.year === snapshot.selectedYear)
      .slice()
      .sort((a, b) => seasonWeekCompare(a.week, b.week));
    const preferredAgeSplitWeek = iliMetric.latestWeek;
    const ageSplit =
      ageSplitCandidates.find((point) => point.week === preferredAgeSplitWeek) ??
      (ageSplitCandidates.length ? ageSplitCandidates[ageSplitCandidates.length - 1] : null);

    const iliCoverageRatio = coverageRatioFromSeries(currentIliSeries);
    const sariCoverageRatio = coverageRatioFromSeries(currentSariSeries);
    const combinedCoverageRatio =
      iliCoverageRatio != null && sariCoverageRatio != null
        ? (iliCoverageRatio + sariCoverageRatio) / 2
        : iliCoverageRatio ?? sariCoverageRatio;
    const baselineCount = Math.min(iliMetric.baseline.baselineCount, sariMetric.baseline.baselineCount);
    const ageSplitAvailable = ageSplit != null;

    const coverageLevel: "good" | "moderate" | "limited" =
      combinedCoverageRatio == null ? "limited" : combinedCoverageRatio >= 0.9 ? "good" : combinedCoverageRatio >= 0.75 ? "moderate" : "limited";
    const baselineLevel: "good" | "moderate" | "limited" =
      baselineCount >= 5 ? "good" : baselineCount >= 3 ? "moderate" : "limited";
    const ageLevel: "good" | "moderate" | "limited" = ageSplitAvailable ? "good" : "limited";

    return {
      iliMetric,
      sariMetric,
      ageSplit,
      quality: {
        coverageRatio: combinedCoverageRatio,
        baselineCount,
        ageSplitAvailable,
        coverageLevel,
        baselineLevel,
        ageLevel,
      },
    };
  }, [
    dataSource.iliAgeSplits,
    dataSource.respiratoryData.sariWeekly,
    dataSource.respiratoryData.weekly,
    snapshot.availableYears,
    snapshot.selectedYear,
  ]);

  const latestIliVsPreviousSeason = useMemo(() => {
    const latest = snapshot.iliSeries.length ? snapshot.iliSeries[snapshot.iliSeries.length - 1] : null;
    if (!latest) return null;

    const historicalPoint = snapshot.historical.ili.points.find((point) => point.week === latest.week) ?? null;
    const previousCases =
      historicalPoint && typeof historicalPoint.previous === "number" && Number.isFinite(historicalPoint.previous)
        ? historicalPoint.previous
        : null;
    const deltaPercent =
      previousCases != null && previousCases !== 0 ? ((latest.cases - previousCases) / previousCases) * 100 : null;
    const direction: TrendDirection =
      deltaPercent == null ? "flat" : deltaPercent > 0 ? "surging" : deltaPercent < 0 ? "declining" : "flat";

    return {
      week: latest.week,
      currentCases: latest.cases,
      previousCases,
      deltaPercent,
      direction,
    };
  }, [snapshot.historical.ili.points, snapshot.iliSeries]);

  const surgeSignals = useMemo<SurgeSignal[]>(() => {
    const signals: SurgeSignal[] = [];

    const iliOrdered = snapshot.iliSeries
      .map((row) => ({ week: row.week, value: row.cases }))
      .filter((row) => Number.isFinite(row.week) && Number.isFinite(row.value))
      .sort((a, b) => seasonWeekCompare(a.week, b.week));
    const iliLatest = iliOrdered[iliOrdered.length - 1];
    const iliPrevious = iliOrdered[iliOrdered.length - 2];
    if (iliLatest && iliPrevious) {
      const pctChange = iliPrevious.value > 0 ? ((iliLatest.value - iliPrevious.value) / iliPrevious.value) * 100 : 0;
      const direction: TrendDirection = pctChange > 0 ? "surging" : pctChange < 0 ? "declining" : "flat";
      signals.push({
        virus: DEFAULT_ILI_VIRUS,
        label: formatTrendBubble(pctChange),
        change: pctChange,
        week: iliLatest.week,
        direction,
      });
    }

    const positivityRows = snapshot.virology.positivityRows
      .filter((row) => row.virus !== INFLUENZA_ALL_KEY)
      .filter((row) => Number.isFinite(row.week) && Number.isFinite(row.positivity));
    if (!positivityRows.length) return signals;

    const latestPositivityWeek = positivityRows.reduce(
      (best, row) => (seasonWeekCompare(row.week, best) > 0 ? row.week : best),
      positivityRows[0].week
    );
    const latestWeekTopViruses = positivityRows
      .filter((row) => row.week === latestPositivityWeek)
      .slice()
      .sort((a, b) => b.positivity - a.positivity)
      .map((row) => row.virus);

    const historyByVirus = new Map<string, Array<{ week: number; positivity: number }>>();
    for (const row of positivityRows) {
      const list = historyByVirus.get(row.virus) ?? [];
      list.push({ week: row.week, positivity: row.positivity });
      historyByVirus.set(row.virus, list);
    }

    for (const virus of latestWeekTopViruses) {
      if (signals.length >= 4) break;
      const history = historyByVirus.get(virus);
      if (!history || history.length < 2) continue;
      const ordered = history.slice().sort((a, b) => seasonWeekCompare(a.week, b.week));
      const latest = ordered[ordered.length - 1];
      const previous = ordered[ordered.length - 2];
      if (!latest || !previous) continue;
      const pctChange = previous.positivity > 0 ? ((latest.positivity - previous.positivity) / previous.positivity) * 100 : 0;
      const direction: TrendDirection = pctChange > 0 ? "surging" : pctChange < 0 ? "declining" : "flat";
      signals.push({
        virus,
        label: formatTrendBubble(pctChange),
        change: pctChange,
        week: latest.week,
        direction,
      });
    }

    return signals.slice(0, 4);
  }, [snapshot.iliSeries, snapshot.virology.positivityRows]);

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
  const signalHeadline = isAboveThreshold ? t.signalEpidemicYes : t.signalEpidemicNo;
  const fluAlertText = formatText(isAboveThreshold ? t.fluTextAbove : t.fluTextBelow, {
    week: formatWeek(snapshot.stats.latestWeek, language),
    cases: snapshot.stats.latestIliCases.toLocaleString(),
    threshold: snapshot.iliThreshold.toLocaleString(),
  });
  const iliTrendSignal = surgeSignals.find((signal) => signal.virus === DEFAULT_ILI_VIRUS) ?? null;
  const weeklySituationHeadline = (() => {
    const delta = iliTrendSignal?.change;
    if (isAboveThreshold) {
      if (delta != null && delta >= 8) return t.decisionIncreasing;
      if (delta != null && delta <= -8) return t.decisionEasing;
      return t.decisionStableHigh;
    }
    if (delta != null && delta >= 12) return t.decisionRisingBelow;
    return t.decisionStableLow;
  })();

  const confidenceLabelFor = (level: ConfidenceLevel): string => {
    if (level === "high") return t.decisionConfidenceHigh;
    if (level === "medium") return t.decisionConfidenceMedium;
    return t.decisionConfidenceLow;
  };

  const confidenceFromInputs = ({
    hasData,
    missingWeeks,
    warningCount,
  }: {
    hasData: boolean;
    missingWeeks: number;
    warningCount: number;
  }): ConfidenceLevel => {
    let score = 100;
    if (isDataLoading) score -= 28;
    if (!hasData) score -= 30;
    score -= Math.min(26, missingWeeks * 6);
    score -= Math.min(24, warningCount * 8);
    return confidenceLevelFromScore(score);
  };

  const coreMissingWeeks = iliMissingWeeks.length + sariMissingWeeks.length;
  const epidemicConfidenceLevel = confidenceFromInputs({
    hasData: snapshot.iliSeries.length > 1,
    missingWeeks: coreMissingWeeks,
    warningCount: snapshot.warnings.length,
  });
  const huLeaderConfidenceLevel = confidenceFromInputs({
    hasData: huLeader != null && snapshot.virology.latestWeek != null,
    missingWeeks: Math.ceil(coreMissingWeeks / 2),
    warningCount: snapshot.warnings.length,
  });
  const euLeaderConfidenceLevel = confidenceFromInputs({
    hasData: euLeader != null && snapshot.euVirology.latestWeek != null,
    missingWeeks: 0,
    warningCount: snapshot.warnings.length,
  });
  const epidemicConfidenceLabel = confidenceLabelFor(epidemicConfidenceLevel);
  const huLeaderConfidenceLabel = confidenceLabelFor(huLeaderConfidenceLevel);
  const euLeaderConfidenceLabel = confidenceLabelFor(euLeaderConfidenceLevel);

  const queueEvidenceScroll = (targetId: string, attempt = 0) => {
    if (typeof window === "undefined") return;
    const node = document.getElementById(targetId);
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (attempt >= 10) return;
    window.setTimeout(() => queueEvidenceScroll(targetId, attempt + 1), 80);
  };

  const jumpToEvidence = (target: "hu-ili-sari-charts" | "hu-sentinel-positivity" | "eu-positivity-chart") => {
    if (target === "hu-ili-sari-charts") {
      setIsHungarySectionOpen(true);
      queueEvidenceScroll(target);
      return;
    }
    if (target === "hu-sentinel-positivity") {
      setIsHungarySectionOpen(true);
      setIsSentinelVirologyOpen(true);
      queueEvidenceScroll(target);
      return;
    }
    setIsEuSectionOpen(true);
    queueEvidenceScroll(target);
  };

  const sourceChipTone = dataSource.source === "nngyk_all" ? "live" : "sample";
  const sourceLabel = dataSource.source === "nngyk_all" ? t.sourceLive : t.sourceFallback;
  const latestVirologyWeekLabel = snapshot.virology.latestWeek == null ? "–" : formatWeek(snapshot.virology.latestWeek, language);
  const euSeasonLabel = snapshot.euVirology.targetYear == null ? "–" : formatNhSeasonLabel(snapshot.euVirology.targetYear, language);
  const latestEuWeekLabel =
    snapshot.euVirology.targetYear != null && snapshot.euVirology.latestWeek != null
      ? language === "hu"
        ? `${calendarYearFromNhSeasonWeek(snapshot.euVirology.targetYear, snapshot.euVirology.latestWeek)} · ${formatWeek(snapshot.euVirology.latestWeek, language)}`
        : `${calendarYearFromNhSeasonWeek(snapshot.euVirology.targetYear, snapshot.euVirology.latestWeek)}-${formatWeek(snapshot.euVirology.latestWeek, language)}`
      : "–";
  const huLeaderText = huLeader
    ? formatText(t.leaderHuText, {
        week: formatWeek(huLeader.week, language),
        virus: displayVirusLabel(huLeader.virus, language),
        pos: huLeader.positivity.toFixed(1),
      })
    : t.alertsLoadingPos;
  const huLeaderVirus = huLeader ? displayVirusLabel(huLeader.virus, language) : t.noDataShort;
  const huLeaderClass = virusClassName(huLeader?.virus);
  const euLeaderText = euLeader
    ? formatText(t.leaderEuText, {
        week: formatWeek(euLeader.week, language),
        year: euLeader.year,
        virus: displayVirusLabel(euLeader.virus, language),
        pos: euLeader.positivity.toFixed(1),
      })
    : t.alertsLoadingEuPos;
  const euLeaderVirus = euLeader ? displayVirusLabel(euLeader.virus, language) : t.noDataShort;
  const euLeaderClass = virusClassName(euLeader?.virus);
  const qualityLabelFor = (level: "good" | "moderate" | "limited"): string => {
    if (level === "good") return t.rigorQualityGood;
    if (level === "moderate") return t.rigorQualityModerate;
    return t.rigorQualityLimited;
  };
  const qualityCardClass = (level: "good" | "moderate" | "limited"): "ok" | "warn" => (level === "good" ? "ok" : "warn");
  const coveragePercentLabel =
    epidemiology.quality.coverageRatio == null
      ? "–"
      : `${Math.round(epidemiology.quality.coverageRatio * 100).toLocaleString()}%`;
  const baselineSampleLabel =
    epidemiology.iliMetric.baseline.baselineCount > 0 ? epidemiology.iliMetric.baseline.baselineCount.toLocaleString() : "–";
  const dataLastUpdateLabel = isDataLoading
    ? t.footerLastUpdateLoading
    : dataLoadedAt
      ? formatDateTime(dataLoadedAt, language)
      : t.noDataShort;
  const dataLastUpdatePill = `${t.footerUpdatedShort}: ${dataLastUpdateLabel}`;
  const warningsPill = `${t.footerWarningsShort}: ${snapshot.warnings.length.toLocaleString()}`;
  const warningsTitle = snapshot.warnings.length ? `${t.warningsTitle}: ${snapshot.warnings.join(" · ")}` : undefined;

  return (
    <div className={`app-shell theme-${resolvedTheme}`}>
      <header className="topbar">
        <div>
          <h1>{t.appTitle}</h1>
          <p className="subtitle">{t.appSubtitle}</p>
        </div>
        <div className="controls">
          <div className="control-group">
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
          </div>
          <div className="control-group">
            <label htmlFor="lang-select">{t.language}</label>
            <select id="lang-select" value={language} onChange={(event) => setLanguage(normalizeLanguage(event.target.value))}>
              <option value="en">English</option>
              <option value="hu">Magyar</option>
            </select>
          </div>
          <div className="control-group">
            <label htmlFor="theme-select">{t.theme}</label>
            <select id="theme-select" value={themeMode} onChange={(event) => setThemeMode(normalizeThemeMode(event.target.value))}>
              <option value="system">{t.themeSystem}</option>
              <option value="dark">{t.themeDark}</option>
              <option value="light">{t.themeLight}</option>
            </select>
          </div>
        </div>
      </header>

      <section className="alerts-grid" aria-label={t.alertsAria}>
        <article className={`alert-card primary epidemic ${signalClassName}`} role="status" aria-live="polite">
          <span className="alert-kicker">{t.decisionTitle}</span>
          <h2>
            {isAboveThreshold ? (
              <span className="alert-status-icon" aria-hidden="true">
                !
              </span>
            ) : null}
            <span>{weeklySituationHeadline}</span>
          </h2>
          <p className="alert-standfirst">{signalHeadline}</p>
          <p>{fluAlertText}</p>
          <div className="alert-meta">
            <span className={`alert-meta-chip confidence-${epidemicConfidenceLevel}`}>
              {t.decisionConfidence}: {epidemicConfidenceLabel}
            </span>
            <span className="alert-meta-chip">
              {t.decisionFreshness}: {formatWeek(snapshot.stats.latestWeek, language)}
            </span>
          </div>
          <button type="button" className="alert-evidence-btn" onClick={() => jumpToEvidence("hu-ili-sari-charts")}>
            {t.decisionEvidenceIli}
          </button>
        </article>
        <article className={`alert-card leader summary ${huLeaderClass}`} role="status" aria-live="polite">
          <h2>{t.leaderHuTitle}</h2>
          <div className="alert-emphasis-row">
            {huLeader ? <VirusIcon virus={huLeader.virus} /> : null}
            <strong className="alert-emphasis">{huLeaderVirus}</strong>
          </div>
          <p>{huLeaderText}</p>
          <div className="alert-meta">
            <span className={`alert-meta-chip confidence-${huLeaderConfidenceLevel}`}>
              {t.decisionConfidence}: {huLeaderConfidenceLabel}
            </span>
            <span className="alert-meta-chip">
              {t.decisionFreshness}: {latestVirologyWeekLabel}
            </span>
          </div>
          <button type="button" className="alert-evidence-btn" onClick={() => jumpToEvidence("hu-sentinel-positivity")}>
            {t.decisionEvidenceHuPositivity}
          </button>
        </article>
        <article className={`alert-card leader summary ${euLeaderClass}`} role="status" aria-live="polite">
          <h2>{t.leaderEuTitle}</h2>
          <div className="alert-emphasis-row">
            {euLeader ? <VirusIcon virus={euLeader.virus} /> : null}
            <strong className="alert-emphasis">{euLeaderVirus}</strong>
          </div>
          <p>{euLeaderText}</p>
          <div className="alert-meta">
            <span className={`alert-meta-chip confidence-${euLeaderConfidenceLevel}`}>
              {t.decisionConfidence}: {euLeaderConfidenceLabel}
            </span>
            <span className="alert-meta-chip">
              {t.decisionFreshness}: {latestEuWeekLabel}
            </span>
          </div>
          <button type="button" className="alert-evidence-btn" onClick={() => jumpToEvidence("eu-positivity-chart")}>
            {t.decisionEvidenceEuPositivity}
          </button>
        </article>
      </section>

      <section className="region-block hu-block" aria-label={t.sectionHuTitle}>
        <section className="region-divider hu" aria-label={t.sectionHuTitle}>
          <div className="region-divider-main">
            <span className="region-divider-kicker">{t.sectionKicker}</span>
            <div>
              <h2>{t.sectionHuTitle}</h2>
              <p>{t.sectionHuNote}</p>
            </div>
          </div>
          <button
            type="button"
            className="section-toggle region-toggle"
            aria-expanded={isHungarySectionOpen}
            aria-controls="hu-region-content"
            aria-label={`${isHungarySectionOpen ? t.sectionCollapse : t.sectionExpand}: ${t.sectionHuTitle}`}
            onClick={() => setIsHungarySectionOpen((open) => !open)}
          >
            <span className={`section-toggle-icon ${isHungarySectionOpen ? "open" : ""}`} aria-hidden="true">
              ▾
            </span>
            <span>{isHungarySectionOpen ? t.sectionCollapse : t.sectionExpand}</span>
          </button>
        </section>

        {isHungarySectionOpen ? (
          <div id="hu-region-content" className="region-content">
      <section className="briefing-grid">
        <section className="surge-section" aria-label={t.trendAria}>
          <header className="surge-header">
            <h2>{t.trendTitle}</h2>
            <p>{t.trendNote}</p>
          </header>
          <ul className="surge-list">
            {surgeSignals.length ? (
              surgeSignals.map((signal) => (
                <li key={`${signal.virus}-${signal.week ?? "na"}`} className={`surge-item trend-${signal.direction}`}>
                  <div>
                    <span className={`pathogen-name ${virusClassName(signal.virus)}`}>
                      <span className="virus-dot" aria-hidden="true" />
                      <strong>{displayVirusLabel(signal.virus, language)}</strong>
                    </span>
                    <span>{signal.week != null ? formatWeek(signal.week, language) : "–"}</span>
                  </div>
                  <span className="pill">{signal.label}</span>
                </li>
              ))
            ) : (
              <li className="surge-empty">{t.trendEmpty}</li>
            )}
          </ul>
        </section>

        <section className="stats-grid briefing-stats-grid">
          <article className="stat-card">
            <h3>{t.statsTotalIli}</h3>
            <strong>{snapshot.stats.totalIliCases.toLocaleString()}</strong>
          </article>
          <article className="stat-card">
            <h3>{t.statsPeakIli}</h3>
            <strong>
              {formatWeek(snapshot.stats.peakIliWeek, language)} / {snapshot.stats.peakIliCases?.toLocaleString() ?? "-"}
            </strong>
          </article>
          <article className="stat-card stat-card-ili-compare">
            <div className="stat-card-ili-head">
              <h3>{t.statsIliVsPrev}</h3>
              <span className="stat-week-chip">
                {latestIliVsPreviousSeason ? formatWeek(latestIliVsPreviousSeason.week, language) : "–"}
              </span>
            </div>
            <div className="stat-card-ili-main">
              <strong>{latestIliVsPreviousSeason ? latestIliVsPreviousSeason.currentCases.toLocaleString() : "–"}</strong>
              {latestIliVsPreviousSeason?.deltaPercent != null && latestIliVsPreviousSeason.previousCases != null ? (
                <span className={`stat-delta-pill trend-${latestIliVsPreviousSeason.direction}`}>
                  {formatTrendBubble(latestIliVsPreviousSeason.deltaPercent)}
                </span>
              ) : null}
            </div>
            <p className="stat-compare-baseline">
              {latestIliVsPreviousSeason?.deltaPercent != null && latestIliVsPreviousSeason.previousCases != null
                ? formatText(t.statsIliVsPrevBaseline, {
                    season: snapshot.historical.compareSeasonLabel ?? String(snapshot.selectedYear - 1),
                    value: latestIliVsPreviousSeason.previousCases.toLocaleString(),
                  })
                : t.statsIliVsPrevNoBaseline}
            </p>
          </article>
          <article className="stat-card">
            <h3>{t.statsFirstCrossing}</h3>
            <strong>{formatWeek(snapshot.stats.firstIliThresholdCrossingWeek, language)}</strong>
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
      </section>

      <section id="hu-ili-sari-charts" className="charts-grid">
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

      <section className="historical-section">
        <header className="historical-header">
          <h2>{t.historicalTitle}</h2>
          {snapshot.historical.available && snapshot.historical.compareSeasonLabel ? (
            <p>
              {language === "hu"
                ? `${snapshot.historical.currentSeasonLabel} összevetve: ${snapshot.historical.compareSeasonLabel}`
                : `${snapshot.historical.currentSeasonLabel} vs ${snapshot.historical.compareSeasonLabel}`}
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

      <section className="virology-section collapsible-section">
        <header className="virology-header">
          <div>
            <h2>{t.virologyTitle}</h2>
            <p>{formatText(t.virologyWeek, { week: latestVirologyWeekLabel })}</p>
          </div>
          <div className="virology-header-actions">
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
            <button
              type="button"
              className="section-toggle"
              aria-expanded={isSentinelVirologyOpen}
              aria-controls="sentinel-virology-content"
              aria-label={`${isSentinelVirologyOpen ? t.sectionCollapse : t.sectionExpand}: ${t.virologyTitle}`}
              onClick={() => setIsSentinelVirologyOpen((open) => !open)}
            >
              <span className={`section-toggle-icon ${isSentinelVirologyOpen ? "open" : ""}`} aria-hidden="true">
                ▾
              </span>
              <span>{isSentinelVirologyOpen ? t.sectionCollapse : t.sectionExpand}</span>
            </button>
          </div>
        </header>
        {isSentinelVirologyOpen ? (
          <div id="sentinel-virology-content" className="section-content">
            <div className="virology-grid">
              <EChartsPanel
                title={t.virologyDetectionsTrend}
                subtitle={formatText(t.virologyDetectionsSubtitle, { week: latestVirologyWeekLabel })}
                option={virologyDetectionsOption}
              />
              <div id="hu-sentinel-positivity">
                <EChartsPanel
                  title={t.virologyPositivityTrend}
                  subtitle={formatText(t.virologyDetectionsSubtitle, { week: latestVirologyWeekLabel })}
                  option={virologyPositivityOption}
                />
              </div>
            </div>

            <div className="virology-lists">
              <article className="virology-list-card compact">
                <h3>{t.virologyTopDetections}</h3>
                {virologyDetectionList.length ? (
                  <ul>
                    {virologyDetectionList.map((row) => (
                      <li key={`${row.virus}-${row.week}`} className={virusClassName(row.virus)}>
                        <span className="pathogen-name">
                          <span className="virus-dot" aria-hidden="true" />
                          {displayVirusLabel(row.virus, language)}
                        </span>
                        <strong>{row.detections.toLocaleString()}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="virology-empty">{t.virologyNoDetections}</p>
                )}
              </article>
              <article className="virology-list-card compact">
                <h3>{t.virologyTopPositivity}</h3>
                {virologyPositivityList.length ? (
                  <ul>
                    {virologyPositivityList.map((row) => (
                      <li key={`${row.virus}-${row.week}`} className={virusClassName(row.virus)}>
                        <span className="pathogen-name">
                          <span className="virus-dot" aria-hidden="true" />
                          {displayVirusLabel(row.virus, language)}
                        </span>
                        <strong>{row.positivity.toFixed(1)}%</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="virology-empty">{t.virologyNoPositivity}</p>
                )}
              </article>
            </div>
          </div>
        ) : null}
      </section>

      <section className="glance-section collapsible-section" aria-label={t.glanceAria}>
        <header className="glance-header">
          <div>
            <h2>{t.glanceTitle}</h2>
            <p>{t.glanceNote}</p>
          </div>
          <button
            type="button"
            className="section-toggle"
            aria-expanded={isSeasonGlanceOpen}
            aria-controls="season-glance-content"
            aria-label={`${isSeasonGlanceOpen ? t.sectionCollapse : t.sectionExpand}: ${t.glanceTitle}`}
            onClick={() => setIsSeasonGlanceOpen((open) => !open)}
          >
            <span className={`section-toggle-icon ${isSeasonGlanceOpen ? "open" : ""}`} aria-hidden="true">
              ▾
            </span>
            <span>{isSeasonGlanceOpen ? t.sectionCollapse : t.sectionExpand}</span>
          </button>
        </header>
        {isSeasonGlanceOpen ? (
          <div id="season-glance-content" className="glance-grid">
            <article className="glance-card">
              <h3>{t.glanceIli}</h3>
              <div className="glance-row">
                <span className="glance-key">{t.glancePeak}</span>
                <span className="glance-value">{formatGlanceLine(seasonAtGlance.iliGlance?.peak ?? null, language)}</span>
              </div>
              <div className="glance-row">
                <span className="glance-key">{t.glanceLatest}</span>
                <span className="glance-value">{formatGlanceLatest(seasonAtGlance.iliGlance, language)}</span>
              </div>
              <div className="glance-row">
                <span className="glance-key">{t.glanceSlope}</span>
                <span className="glance-value">{formatSlopePerWeek(seasonAtGlance.iliGlance?.slope ?? null, language)}</span>
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
                <span className="glance-value">{formatGlanceLine(seasonAtGlance.sariGlance?.peak ?? null, language)}</span>
              </div>
              <div className="glance-row">
                <span className="glance-key">{t.glanceLatest}</span>
                <span className="glance-value">{formatGlanceLatest(seasonAtGlance.sariGlance, language)}</span>
              </div>
              <div className="glance-row">
                <span className="glance-key">{t.glanceSlope}</span>
                <span className="glance-value">{formatSlopePerWeek(seasonAtGlance.sariGlance?.slope ?? null, language)}</span>
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
                <span className="glance-value">{formatGlanceLine(seasonAtGlance.icuGlance?.peak ?? null, language)}</span>
              </div>
              <div className="glance-row">
                <span className="glance-key">{t.glanceLatest}</span>
                <span className="glance-value">{formatGlanceLatest(seasonAtGlance.icuGlance, language)}</span>
              </div>
              <div className="glance-row">
                <span className="glance-key">{t.glanceSlope}</span>
                <span className="glance-value">{formatSlopePerWeek(seasonAtGlance.icuGlance?.slope ?? null, language)}</span>
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
                    ? `${formatWeek(seasonAtGlance.severity.week, language)}: ${seasonAtGlance.severity.sariPercent.toFixed(1)}%`
                    : "–"}
                </span>
              </div>
              <div className="glance-row">
                <span className="glance-key">{t.glanceSeverityIcu}</span>
                <span className="glance-value">
                  {seasonAtGlance.severity && Number.isFinite(seasonAtGlance.severity.icuShare)
                    ? `${formatWeek(seasonAtGlance.severity.week, language)}: ${Number(seasonAtGlance.severity.icuShare).toFixed(1)}%`
                    : "–"}
                </span>
              </div>
            </article>
          </div>
        ) : null}
      </section>

      <section className="quality-section" aria-label={t.rigorAria}>
        <header className="quality-header">
          <h2>{t.rigorTitle}</h2>
          <p>{t.rigorNote}</p>
        </header>

        <div className="quality-grid">
          <article
            className={`quality-card ${qualityCardClass(
              epidemiology.iliMetric.baseline.zScore != null && Math.abs(epidemiology.iliMetric.baseline.zScore) >= 2 ? "moderate" : "good"
            )}`}
          >
            <h3>{t.rigorIliRateCard}</h3>
            <strong>{formatRatePer100kLabel(epidemiology.iliMetric.ratePer100k, t.rigorPer100kSuffix)}</strong>
            <p>
              {t.rigorWoW}: {formatSignedPercent(epidemiology.iliMetric.weekOverWeekPercent)} · {t.rigorZScore}:{" "}
              {formatZScore(epidemiology.iliMetric.baseline.zScore)}
            </p>
            <p>
              {t.rigorBaselineSample}: {baselineSampleLabel}
              {epidemiology.iliMetric.baseline.baselineMean != null
                ? ` · ${t.rigorBaselineMean}: ${formatRatePer100kLabel(
                    ratePer100k(epidemiology.iliMetric.baseline.baselineMean),
                    t.rigorPer100kSuffix
                  )}`
                : ""}
            </p>
          </article>

          <article
            className={`quality-card ${qualityCardClass(
              epidemiology.sariMetric.baseline.zScore != null && Math.abs(epidemiology.sariMetric.baseline.zScore) >= 2 ? "moderate" : "good"
            )}`}
          >
            <h3>{t.rigorSariRateCard}</h3>
            <strong>{formatRatePer100kLabel(epidemiology.sariMetric.ratePer100k, t.rigorPer100kSuffix)}</strong>
            <p>
              {t.rigorWoW}: {formatSignedPercent(epidemiology.sariMetric.weekOverWeekPercent)} · {t.rigorZScore}:{" "}
              {formatZScore(epidemiology.sariMetric.baseline.zScore)}
            </p>
            <p>{t.rigorBaselineSample}: {epidemiology.sariMetric.baseline.baselineCount.toLocaleString()}</p>
          </article>

          <article className={`quality-card ${qualityCardClass(epidemiology.quality.ageLevel)}`}>
            <h3>{t.rigorAgeSplitTitle}</h3>
            {epidemiology.ageSplit ? (
              <>
                <strong>{formatWeek(epidemiology.ageSplit.week, language)}</strong>
                <div className="age-split-grid">
                  <span>{t.rigorAge0to14}: {epidemiology.ageSplit.age0to14.toFixed(1)}%</span>
                  <span>{t.rigorAge15to34}: {epidemiology.ageSplit.age15to34.toFixed(1)}%</span>
                  <span>{t.rigorAge35to59}: {epidemiology.ageSplit.age35to59.toFixed(1)}%</span>
                  <span>{t.rigorAge60plus}: {epidemiology.ageSplit.age60plus.toFixed(1)}%</span>
                </div>
              </>
            ) : (
              <p>{t.rigorAgeMissing}</p>
            )}
          </article>

          <article className={`quality-card ${qualityCardClass(epidemiology.quality.coverageLevel)}`}>
            <h3>{t.rigorQualityTitle}</h3>
            <div className="rigor-quality-list">
              <span className={`rigor-pill ${qualityCardClass(epidemiology.quality.coverageLevel)}`}>
                {t.rigorQualityCoverage}: {qualityLabelFor(epidemiology.quality.coverageLevel)} ({coveragePercentLabel})
              </span>
              <span className={`rigor-pill ${qualityCardClass(epidemiology.quality.baselineLevel)}`}>
                {t.rigorQualityBaseline}: {qualityLabelFor(epidemiology.quality.baselineLevel)} (n={epidemiology.quality.baselineCount})
              </span>
              <span className={`rigor-pill ${qualityCardClass(epidemiology.quality.ageLevel)}`}>
                {t.rigorQualityAge}: {qualityLabelFor(epidemiology.quality.ageLevel)}
              </span>
            </div>
          </article>
        </div>
      </section>

      <section className="table-section collapsible-section" aria-label={t.tableAria}>
        <header className="table-header">
          <div>
            <h2>{t.tableTitle}</h2>
            <p>{t.tableNote}</p>
          </div>
          <button
            type="button"
            className="section-toggle"
            aria-expanded={isWeeklyTableOpen}
            aria-controls="weekly-table-content"
            aria-label={`${isWeeklyTableOpen ? t.sectionCollapse : t.sectionExpand}: ${t.tableTitle}`}
            onClick={() => setIsWeeklyTableOpen((open) => !open)}
          >
            <span className={`section-toggle-icon ${isWeeklyTableOpen ? "open" : ""}`} aria-hidden="true">
              ▾
            </span>
            <span>{isWeeklyTableOpen ? t.sectionCollapse : t.sectionExpand}</span>
          </button>
        </header>
        {isWeeklyTableOpen ? (
          <div id="weekly-table-content" className="table-scroll" role="region" aria-label={t.tableScrollAria}>
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
                      <td>{formatWeek(row.week, language)}</td>
                      <td>{displayVirusLabel(row.virus, language)}</td>
                      <td>{row.region === "National" ? t.regionNational : row.region}</td>
                      <td>{Number.isFinite(row.cases) ? Number(row.cases).toLocaleString() : "–"}</td>
                      <td>{Number.isFinite(row.sariAdmissions) ? Number(row.sariAdmissions).toLocaleString() : "–"}</td>
                      <td>{Number.isFinite(row.sariIcu) ? Number(row.sariIcu).toLocaleString() : "–"}</td>
                      <td>
                        {row.topPositivityVirus && Number.isFinite(row.topPositivity) ? (
                          <span className={`table-top-positivity ${virusClassName(row.topPositivityVirus)}`}>
                            <span className="virus-dot" aria-hidden="true" />
                            <span>
                              {displayVirusLabel(row.topPositivityVirus, language)} ({Number(row.topPositivity).toFixed(1)}%)
                            </span>
                          </span>
                        ) : (
                          "–"
                        )}
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
        ) : null}
      </section>

          </div>
        ) : null}
      </section>
      <section className="region-block eu-block" aria-label={t.sectionEuTitle}>
        <section className="region-divider eu" aria-label={t.sectionEuTitle}>
          <div className="region-divider-main">
            <span className="region-divider-kicker">{t.sectionKicker}</span>
            <div>
              <h2>{t.sectionEuTitle}</h2>
              <p>{t.sectionEuNote}</p>
            </div>
          </div>
          <button
            type="button"
            className="section-toggle region-toggle"
            aria-expanded={isEuSectionOpen}
            aria-controls="eu-region-content"
            aria-label={`${isEuSectionOpen ? t.sectionCollapse : t.sectionExpand}: ${t.sectionEuTitle}`}
            onClick={() => setIsEuSectionOpen((open) => !open)}
          >
            <span className={`section-toggle-icon ${isEuSectionOpen ? "open" : ""}`} aria-hidden="true">
              ▾
            </span>
            <span>{isEuSectionOpen ? t.sectionCollapse : t.sectionExpand}</span>
          </button>
        </section>

        {isEuSectionOpen ? (
          <div id="eu-region-content" className="region-content">
      <section className="virology-section eu-section">
        <header className="virology-header">
          <div>
            <h2>{t.euVirologyTitle}</h2>
            <p>{formatText(t.virologyWeek, { week: latestEuWeekLabel })}</p>
          </div>
        </header>

        <div className="virology-grid">
          <EChartsPanel
            title={t.euDetectionsTrend}
            subtitle={formatText(t.euTrendSubtitle, { season: euSeasonLabel })}
            option={euDetectionsOption}
          />
          <div id="eu-positivity-chart">
            <EChartsPanel
              title={t.euPositivityTrend}
              subtitle={formatText(t.euTrendSubtitle, { season: euSeasonLabel })}
              option={euPositivityOption}
            />
          </div>
        </div>

        <div className="virology-lists eu-summary-lists">
          <article className="virology-list-card compact">
            <h3>{t.euTopDetections}</h3>
            {euDetectionsList.length ? (
              <ul>
                {euDetectionsList.map((row) => (
                  <li key={`${row.virus}-${row.week}`} className={virusClassName(row.virus)}>
                    <span className="pathogen-name">
                      <span className="virus-dot" aria-hidden="true" />
                      {displayVirusLabel(row.virus, language)}
                    </span>
                    <strong>{row.detections.toLocaleString()}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="virology-empty">{t.euNoDetections}</p>
            )}
          </article>
          <article className="virology-list-card compact">
            <h3>{t.euTopPositivity}</h3>
            {euPositivityList.length ? (
              <ul>
                {euPositivityList.map((row) => (
                  <li key={`${row.virus}-${row.week}`} className={virusClassName(row.virus)}>
                    <span className="pathogen-name">
                      <span className="virus-dot" aria-hidden="true" />
                      {displayVirusLabel(row.virus, language)}
                    </span>
                    <strong>{row.positivity.toFixed(1)}%</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="virology-empty">{t.euNoPositivity}</p>
            )}
          </article>
        </div>
      </section>
          </div>
        ) : null}
      </section>

      <footer className="dashboard-footer" aria-label={t.coverageAria}>
        <div className="footer-strip" role="status" aria-live="polite">
          <span className={`footer-chip source ${sourceChipTone}`}>
            {sourceLabel}
            {isDataLoading ? ` (${t.sourceLoading})` : ""}
          </span>
          <span className="footer-chip">
            {t.coverageNngyk}: {iliLatestWeekLabel}
          </span>
          <span className="footer-chip">
            {t.coverageSari}: {sariLatestWeekLabel}
          </span>
          <span className="footer-chip">
            {t.coverageErviss}: {latestEuWeekLabel}
          </span>
          <span className={`footer-chip ${iliMissingWeeks.length + sariMissingWeeks.length ? "warn" : "ok"}`}>
            {t.coverageMissing}: {iliMissingWeeks.length}/{sariMissingWeeks.length}
          </span>
          <span className="footer-chip">
            {dataLastUpdatePill}
          </span>
          <span className={`footer-chip ${snapshot.warnings.length ? "warn" : "ok"}`} title={warningsTitle}>
            {warningsPill}
          </span>
        </div>
      </footer>
    </div>
  );
}
