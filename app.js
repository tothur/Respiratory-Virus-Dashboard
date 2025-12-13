import { respiratoryData, seasonLabels } from "./data.js";

const SUPPORTED_LANGS = ["en", "hu"];
const STORAGE_LANG_KEY = "rvd-lang";

const yearSelect = document.getElementById("year");
const langSelect = document.getElementById("lang");
const totalCases = document.getElementById("total-cases");
const peakWeek = document.getElementById("peak-week");
const datasetDescription = document.getElementById("dataset-description");
const tableBody = document.getElementById("table-body");
const chipsRow = document.getElementById("chips");
const weekHeader = document.getElementById("week-header");
const casesHeader = document.getElementById("cases-header");
const surgeList = document.getElementById("surge-list");
const fluAlert = document.getElementById("flu-alert");
const fluAlertText = document.getElementById("flu-alert-text");
const fluAlertChip = document.getElementById("flu-alert-chip");
const latestWeekCasesValue = document.getElementById("latest-week-cases");
const latestWeekBadge = document.getElementById("latest-week-badge");
const leaderAlert = document.getElementById("leader-alert");
const leaderAlertText = document.getElementById("leader-alert-text");
const leaderAlertChip = document.getElementById("leader-alert-chip");
const leaderEuAlert = document.getElementById("leader-eu-alert");
const leaderEuAlertText = document.getElementById("leader-eu-alert-text");
const leaderEuAlertChip = document.getElementById("leader-eu-alert-chip");
const iliYearBadge = document.getElementById("ili-year-badge");
const sariAdmissionsValue = document.getElementById("sari-admissions");
const sariIcuValue = document.getElementById("sari-icu");
const sariWeekBadge = document.getElementById("sari-week-badge");
const viroWeekBadge = document.getElementById("viro-week-badge");
const viroDetectionsList = document.getElementById("viro-detections");
const viroPositivityList = document.getElementById("viro-positivity");
let viroDetectionsChart;
let viroPositivityChart;
const euDetectionsList = document.getElementById("eu-detections");
const euPositivityList = document.getElementById("eu-positivity");
const euWeekBadge = document.getElementById("eu-week-badge");
let euDetectionsChart;
let euPositivityChart;

const STRINGS = {
  en: {
    "meta.title": "Seasonal Respiratory Virus Dashboard – Hungary/EU",
    "header.title": "Seasonal Respiratory Virus Dashboard – Hungary/EU",
    "header.subtitle": "Respiratory pandemic dashboard for Hungary & EU/EEA powered by NNGYK and ECDC data",
    "header.controls": "Header controls",
    "controls.language": "Language",
    "controls.year": "Year",
    "sections.alerts": "Key alerts",
    "sections.trends": "Weekly trend highlights",
    "sections.charts": "Visual summaries",
    "sections.virology": "Virology detections and positivity",
    "sections.eu": "EU/EEA virology detections and positivity",
    "sections.table": "Weekly table",
    "sections.dataset": "Dataset notes",
    "alerts.flu.title": "Seasonal influenza threshold",
    "alerts.loading": "Awaiting data…",
    "alerts.loadingPos": "Awaiting positivity data…",
    "alerts.loadingEuPos": "Awaiting EU/EEA positivity data…",
    "alerts.leaderHu.title": "Leading virus by positivity in Hungary",
    "alerts.leaderEu.title": "Leading virus by positivity in the EU/EEA",
    "status.monitoring": "Monitoring",
    "status.latestWeek": "Latest week",
    "status.latestSeason": "Latest season",
    "metrics.total.title": "Total cases",
    "metrics.total.note": "Based on selected dataset, year and pathogen.",
    "metrics.peak.title": "Peak week",
    "metrics.peak.note": "Calendar week with the highest activity.",
    "metrics.latest.title": "Latest week cases",
    "metrics.latest.note": "Most recent reported week for the selected pathogen.",
    "metrics.sariAdmissions.title": "SARI admissions",
    "metrics.sariAdmissions.note": "Severe acute respiratory infection hospitalizations (sentinel hospitals).",
    "metrics.sariIcu.title": "SARI ICU",
    "metrics.sariIcu.note": "ICU/sub-intensive admissions among SARI hospitalizations.",
    "trend.title": "Weekly trend signals",
    "trend.note": "Fast view of which pathogens are currently surging or easing.",
    "trend.badge": "Live selection",
    "charts.ili.title": "Flu-like illness (NNGYK)",
    "charts.ili.note": "Weekly ILI counts from Hungarian sentinel reports.",
    "charts.sari.title": "SARI hospitalizations",
    "charts.sari.note": "Weekly SARI admissions and ICU load from sentinel hospitals.",
    "charts.sari.badge": "Hospital trend",
    "charts.ili.aria": "ILI trend",
    "charts.sari.aria": "SARI hospitalizations trend",
    "viro.detections.title": "Sentinel Virus Detections",
    "viro.detections.note": "Latest detections among sentinel samples.",
    "viro.positivity.title": "Test positivity",
    "viro.positivity.note": "Positivity rates in sentinel samples.",
    "viro.badge": "Virology",
    "viro.detections.list.aria": "Sentinel detections",
    "viro.detections.chart.aria": "Sentinel detections trend",
    "viro.positivity.list.aria": "Sentinel positivity",
    "viro.positivity.chart.aria": "Sentinel positivity trend",
    "eu.detections.title": "EU/EEA Virus Detections",
    "eu.detections.note": "SARI virological detections (ERVISS, EU/EEA).",
    "eu.positivity.title": "EU/EEA Test Positivity",
    "eu.positivity.note": "Positivity rates in SARI samples (ERVISS, EU/EEA).",
    "eu.badge": "EU/EEA",
    "eu.detections.list.aria": "EU detections",
    "eu.detections.chart.aria": "EU detections trend",
    "eu.positivity.list.aria": "EU positivity",
    "eu.positivity.chart.aria": "EU positivity trend",
    "table.title": "Respiratory viruses week-by-week in Hungary",
    "table.note": "Click Week or Cases to sort; shows matching SARI and positivity context.",
    "table.badge": "Accessible table view",
    "table.headers.week": "Week",
    "table.headers.virus": "Virus",
    "table.headers.region": "Region",
    "table.headers.cases": "Cases",
    "table.headers.sariAdmissions": "SARI admissions",
    "table.headers.sariIcu": "SARI ICU",
    "table.headers.topPositivity": "Top positivity",
    "dataset.note": "Aggregated national respiratory virus surveillance shared by the National Public Health Center.",
    // Dynamic strings
    "status.awaitingData": "Awaiting data",
    "status.noData": "No data",
    "chips.dataPoints": "Data points",
    "chips.peakWeek": "Peak week",
    "chips.medianCases": "Median cases",
    "trend.empty": "No weekly trend data yet.",
    "trend.noRecentChange": "No recent change",
    "trend.direction.surging": "Surging",
    "trend.direction.declining": "Declining",
    "trend.direction.flat": "Flat",
    "alerts.leaderHu.text": "Week {week}: {virus} shows the highest sentinel test positivity ({pos}%).",
    "alerts.leaderEu.text": "Week {week} ({year}): {virus} leads EU/EEA sentinel positivity ({pos}%).",
    "alerts.flu.text.above":
      "Week {week}: ILI activity ({cases} cases) is above the alert threshold ({threshold}).",
    "alerts.flu.text.below":
      "Week {week}: ILI activity ({cases} cases) remains below the alert threshold ({threshold}).",
    "alerts.flu.chip.above": "Epidemic signal",
    "alerts.flu.chip.below": "Below threshold",
    "viro.week.latest": "Latest week",
    "viro.week.week": "Week {week}",
    "viro.detections.empty": "No detections available.",
    "viro.positivity.empty": "No positivity data available.",
    "eu.week.latest": "Latest week",
    "eu.detections.empty": "No detections available.",
    "eu.positivity.empty": "No positivity data available.",
    "charts.ili.datasetLabel": "Flu-like illness (NNGYK)",
    "charts.sari.admissionsLabel": "SARI admissions",
    "charts.sari.icuLabel": "SARI ICU",
    "charts.positivity.suffix": " positivity",
    "week.label": "Week {week}",
  },
  hu: {
    "meta.title": "Szezonális Légúti Kórokozó Dashboard – Magyarország/EU",
    "header.title": "Szezonális Légúti Kórokozó Dashboard – Magyarország/EU",
    "header.subtitle": "Magyarországi és EU/EGT légúti helyzetkép az NNGYK és ECDC adatai alapján",
    "header.controls": "Fejléc vezérlők",
    "controls.language": "Nyelv",
    "controls.year": "Év",
    "sections.alerts": "Fő riasztások",
    "sections.trends": "Heti trend kiemelések",
    "sections.charts": "Vizuális összefoglalók",
    "sections.virology": "Virológiai kimutatások és pozitivitás",
    "sections.eu": "EU/EGT virológiai kimutatások és pozitivitás",
    "sections.table": "Heti táblázat",
    "sections.dataset": "Adatkészletek megjegyzései",
    "alerts.flu.title": "Szezonális influenzaküszöb",
    "alerts.loading": "Adatok betöltése…",
    "alerts.loadingPos": "Pozitivitási adatok betöltése…",
    "alerts.loadingEuPos": "EU/EGT pozitivitási adatok betöltése…",
    "alerts.leaderHu.title": "Vezető kórokozó pozitivitás szerint (Magyarország)",
    "alerts.leaderEu.title": "Vezető kórokozó pozitivitás szerint (EU/EGT)",
    "status.monitoring": "Megfigyelés",
    "status.latestWeek": "Legfrissebb hét",
    "status.latestSeason": "Legfrissebb szezon",
    "metrics.total.title": "Esetszám összesen",
    "metrics.total.note": "A kiválasztott adatbázis, év és kórokozó alapján.",
    "metrics.peak.title": "Csúcs hét",
    "metrics.peak.note": "A legmagasabb aktivitású naptári hét.",
    "metrics.latest.title": "Legfrissebb heti esetszám",
    "metrics.latest.note": "A kiválasztott kórokozó legfrissebb jelentett hete.",
    "metrics.sariAdmissions.title": "SARI felvételek",
    "metrics.sariAdmissions.note": "Súlyos akut légúti fertőzés miatti kórházi felvételek (őrszem kórházak).",
    "metrics.sariIcu.title": "SARI ICU",
    "metrics.sariIcu.note": "Intenzív/szubintenzív ellátás a SARI felvételek között.",
    "trend.title": "Heti trend jelzések",
    "trend.note": "Gyors áttekintés arról, mely kórokozók erősödnek vagy enyhülnek.",
    "trend.badge": "Aktuális nézet",
    "charts.ili.title": "Influenzaszerű megbetegedések (NNGYK)",
    "charts.ili.note": "Heti ILI esetszám magyarországi őrszem jelentések alapján.",
    "charts.sari.title": "SARI kórházi felvételek",
    "charts.sari.note": "Heti SARI felvételek és intenzív terhelés az őrszem kórházakból.",
    "charts.sari.badge": "Kórházi trend",
    "charts.ili.aria": "ILI trend",
    "charts.sari.aria": "SARI kórházi felvételek trend",
    "viro.detections.title": "Sentinel orvosi vírus kimutatások",
    "viro.detections.note": "Legfrissebb kimutatások az őrszem mintákban.",
    "viro.positivity.title": "Tesztpozitivitás (sentinel orvosi minták)",
    "viro.positivity.note": "Pozitivitási arányok az őrszem mintákban.",
    "viro.badge": "Virológia",
    "viro.detections.list.aria": "Őrszem kimutatások",
    "viro.detections.chart.aria": "Őrszem kimutatások trend",
    "viro.positivity.list.aria": "Őrszem pozitivitás",
    "viro.positivity.chart.aria": "Őrszem pozitivitás trend",
    "eu.detections.title": "EU/EGT vírus kimutatások",
    "eu.detections.note": "SARI virológiai kimutatások (ERVISS, EU/EGT).",
    "eu.positivity.title": "EU/EGT tesztpozitivitás",
    "eu.positivity.note": "Pozitivitási arányok a SARI mintákban (ERVISS, EU/EGT).",
    "eu.badge": "EU/EGT",
    "eu.detections.list.aria": "EU kimutatások",
    "eu.detections.chart.aria": "EU kimutatások trend",
    "eu.positivity.list.aria": "EU pozitivitás",
    "eu.positivity.chart.aria": "EU pozitivitás trend",
    "table.title": "Légúti vírusok heti bontásban (Magyarország)",
    "table.note": "Kattints a Hét vagy Esetszám oszlopra a rendezéshez; SARI és pozitivitási kontextussal.",
    "table.badge": "Akadálymentes táblázat",
    "table.headers.week": "Hét",
    "table.headers.virus": "Vírus",
    "table.headers.region": "Régió",
    "table.headers.cases": "Esetszám",
    "table.headers.sariAdmissions": "SARI felvételek",
    "table.headers.sariIcu": "SARI intenzív",
    "table.headers.topPositivity": "Legmagasabb pozitivitás",
    "dataset.note": "Az NNGYK által közzétett országos légúti járványügyi felügyeleti adatok összesítve.",
    // Dynamic strings
    "status.awaitingData": "Adatra vár",
    "status.noData": "Nincs adat",
    "chips.dataPoints": "Adatpont",
    "chips.peakWeek": "Csúcs hét",
    "chips.medianCases": "Medián esetszám",
    "trend.empty": "Még nincs heti trend adat.",
    "trend.noRecentChange": "Nincs friss változás",
    "trend.direction.surging": "Erősödik",
    "trend.direction.declining": "Enyhül",
    "trend.direction.flat": "Változatlan",
    "alerts.leaderHu.text": "{week}. hét: {virus} a legmagasabb sentinel tesztpozitivitású ({pos}%).",
    "alerts.leaderEu.text": "{week}. hét ({year}): {virus} vezeti az EU/EGT sentinel pozitivitást ({pos}%).",
    "alerts.flu.text.above":
      "{week}. hét: az ILI aktivitás ({cases} eset) meghaladja a riasztási küszöböt ({threshold}).",
    "alerts.flu.text.below":
      "{week}. hét: az ILI aktivitás ({cases} eset) a riasztási küszöb alatt marad ({threshold}).",
    "alerts.flu.chip.above": "Járványjelzés",
    "alerts.flu.chip.below": "Küszöb alatt",
    "viro.week.latest": "Legfrissebb hét",
    "viro.week.week": "{week}. hét",
    "viro.detections.empty": "Nincs elérhető kimutatás.",
    "viro.positivity.empty": "Nincs elérhető pozitivitási adat.",
    "eu.week.latest": "Legfrissebb hét",
    "eu.detections.empty": "Nincs elérhető kimutatás.",
    "eu.positivity.empty": "Nincs elérhető pozitivitási adat.",
    "charts.ili.datasetLabel": "ILI (influenzaszerű megbetegedés, NNGYK)",
    "charts.sari.admissionsLabel": "SARI felvételek",
    "charts.sari.icuLabel": "SARI intenzív",
    "charts.positivity.suffix": " pozitivitás",
    "week.label": "{week}. hét",
  },
};

let currentLang = "en";

function normalizeLang(lang) {
  const value = String(lang || "").toLowerCase();
  if (SUPPORTED_LANGS.includes(value)) return value;
  if (value.startsWith("hu")) return "hu";
  if (value.startsWith("en")) return "en";
  return null;
}

function resolveInitialLang() {
  try {
    const url = new URL(window.location.href);
    const queryLang = normalizeLang(url.searchParams.get("lang"));
    if (queryLang) return queryLang;
  } catch {
    // ignore
  }
  const stored = normalizeLang(localStorage.getItem(STORAGE_LANG_KEY));
  if (stored) return stored;
  const navigatorLang = normalizeLang(
    (navigator.languages && navigator.languages[0]) || navigator.language || navigator.userLanguage
  );
  return navigatorLang || "en";
}

function t(key, params = null) {
  const table = STRINGS[currentLang] || STRINGS.en;
  const fallback = STRINGS.en;
  const raw = table[key] ?? fallback[key];
  if (raw == null) return key;
  if (!params) return raw;
  return String(raw).replace(/\{(\w+)\}/g, (_, name) => (params[name] != null ? String(params[name]) : `{${name}}`));
}

function applyStaticI18n() {
  document.documentElement.lang = currentLang;
  document.title = t("meta.title");

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const value = t(key);
    if (value) el.textContent = value;
  });

  document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    const spec = el.getAttribute("data-i18n-attr");
    if (!spec) return;
    spec
      .split(/[;,]/g)
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((pair) => {
        const [attr, key] = pair.split(":").map((s) => s.trim());
        if (!attr || !key) return;
        el.setAttribute(attr, t(key));
      });
  });
}

function setLanguage(lang, { persist = true, updateUrl = false } = {}) {
  const normalized = normalizeLang(lang) || "en";
  currentLang = normalized;
  if (langSelect) langSelect.value = normalized;
  if (persist) {
    try {
      localStorage.setItem(STORAGE_LANG_KEY, normalized);
    } catch {
      // ignore
    }
  }
  if (updateUrl) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("lang", normalized);
      window.history.replaceState({}, "", url);
    } catch {
      // ignore
    }
  }
  applyStaticI18n();
}

// National epidemic threshold set to ~28,900 cases (approx. 289 per 100k for ~10M population).
const ILI_THRESHOLD = 28900;
const DEFAULT_VIRUS = "ILI (flu-like illness)";
const DATASET = "NNGYK";
const ERVISS_DATASET = "ERVISS";
const ERVISS_YEAR_PRIORITY = [2026, 2025];
let sortColumn = "week";
let sortDirection = "asc";
let latestFiltered = [];

let trendChart;
let sariChart;

const seasonWeekIndex = (week) => {
  const value = Number(week);
  if (!Number.isFinite(value)) return -Infinity;
  return value >= 40 ? value : value + 53;
};

const seasonWeekCompare = (a, b) => seasonWeekIndex(a) - seasonWeekIndex(b);

const matchesSeasonYear = (rowYear, selectedYear) => {
  const value = Number(rowYear);
  return !Number.isFinite(value) || value === selectedYear;
};

const VIRUS_LABELS_HU = {
  "ILI (flu-like illness)": "ILI (influenzaszerű megbetegedés)",
  Influenza: "Influenza",
  "Influenza A": "Influenza A",
  "Influenza B": "Influenza B",
  "Influenza A(H1N1pdm09)": "Influenza A(H1N1pdm09)",
  "Influenza A(H3)": "Influenza A(H3)",
  "Influenza A(NT)": "Influenza A(NT)",
  RSV: "RSV",
  "SARS-CoV-2": "SARS-CoV-2",
};

const REGION_LABELS_HU = { National: "Országos" };

function displayVirus(name) {
  if (currentLang !== "hu") return name;
  return VIRUS_LABELS_HU[name] || name;
}

function displayRegion(name) {
  if (currentLang !== "hu") return name;
  return REGION_LABELS_HU[name] || name;
}

function formatWeek(week) {
  return `W${Number(week).toString().padStart(2, "0")}`;
}

function formatWeekLabel(week) {
  const label = formatWeek(week);
  return t("week.label", { week: label });
}

function formatWeekBadge(week) {
  const label = formatWeek(week);
  if (currentLang === "hu") return t("viro.week.week", { week: label });
  return label;
}

function formatSeasonLabel(year) {
  const known = seasonLabels[year];
  if (known) return known;
  return currentLang === "hu" ? `${year} szezon` : `${year} season`;
}

function populateFilters() {
  yearSelect.innerHTML = "";
  respiratoryData.years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = seasonLabels[year] || year;
    yearSelect.appendChild(option);
  });
}

function currentSelection() {
  return {
    dataset: DATASET,
    year: Number(yearSelect.value),
    virus: DEFAULT_VIRUS,
  };
}

function summarize(data) {
  const total = data.reduce((sum, row) => sum + row.cases, 0);
  const peak = data.reduce((max, row) => (row.cases > max.cases ? row : max), { cases: 0 });
  return { total, peakWeek: peak.week ?? "–" };
}

function renderChips(data) {
  chipsRow.innerHTML = "";
  const summary = summarize(data);
  const chips = [
    { label: t("chips.dataPoints"), value: data.length },
    { label: t("chips.peakWeek"), value: summary.peakWeek },
    { label: t("chips.medianCases"), value: median(data.map((d) => d.cases)) },
  ];

  chips.forEach((chip) => {
    const span = document.createElement("span");
    span.className = "chip";
    span.textContent = `${chip.label}: ${chip.value}`;
    chipsRow.appendChild(span);
  });
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

function latestPositivityLeader(year) {
  const positivity = (respiratoryData.virologyPositivity || []).filter((row) => matchesSeasonYear(row.year, year));
  if (!positivity.length) return null;
  const latestWeek = positivity.reduce(
    (best, row) => (seasonWeekIndex(row.week) > seasonWeekIndex(best) ? row.week : best),
    positivity[0].week
  );
  const latestRows = positivity.filter((p) => p.week === latestWeek);
  if (!latestRows.length) return null;
  const leader = latestRows.reduce(
    (best, row) => (Number(row.positivity ?? 0) > Number(best.positivity ?? -Infinity) ? row : best),
    { positivity: -Infinity }
  );
  if (!leader || leader.positivity === -Infinity) return null;
  return { week: latestWeek, virus: leader.virus, positivity: Number(leader.positivity) };
}

function latestEuPositivityLeader() {
  const detections = respiratoryData.ervissDetections || [];
  const positivity = respiratoryData.ervissPositivity || [];
  if (!detections.length && !positivity.length) return null;
  const yearCandidates = Array.from(
    new Set(
      [...detections, ...positivity]
        .map((row) => Number(row.year))
        .filter((year) => Number.isFinite(year))
    )
  );
  const targetYear =
    ERVISS_YEAR_PRIORITY.find((yr) => yearCandidates.includes(yr)) ||
    (yearCandidates.length ? Math.max(...yearCandidates) : null);
  if (!targetYear) return null;
  const targetPositivity = positivity.filter((p) => Number(p.year) === targetYear);
  if (!targetPositivity.length) return null;
  const latestWeek = Math.max(...targetPositivity.map((p) => p.week));
  const latestRows = targetPositivity.filter((p) => p.week === latestWeek);
  if (!latestRows.length) return null;
  const leader = latestRows.reduce(
    (best, row) => (Number(row.positivity ?? 0) > Number(best.positivity ?? -Infinity) ? row : best),
    { positivity: -Infinity }
  );
  if (!leader || leader.positivity === -Infinity) return null;
  return {
    week: latestWeek,
    year: targetYear,
    virus: leader.virus,
    positivity: Number(leader.positivity),
  };
}

function renderLeaderAlert(year) {
  const leader = latestPositivityLeader(year);
  if (!leader) {
    leaderAlert.hidden = true;
    return;
  }
  leaderAlert.hidden = false;
  const weekLabel = formatWeek(leader.week);
  const posLabel = leader.positivity.toFixed(1);
  const virusLabel = displayVirus(leader.virus);
  leaderAlertText.textContent = t("alerts.leaderHu.text", { week: weekLabel, virus: virusLabel, pos: posLabel });
  leaderAlertChip.textContent = virusLabel;
}

function renderEuLeaderAlert() {
  const leader = latestEuPositivityLeader();
  if (!leader) {
    leaderEuAlert.hidden = true;
    return;
  }
  leaderEuAlert.hidden = false;
  const weekLabel = formatWeek(leader.week);
  const posLabel = leader.positivity.toFixed(1);
  const virusLabel = displayVirus(leader.virus);
  leaderEuAlertText.textContent = t("alerts.leaderEu.text", {
    week: weekLabel,
    year: leader.year,
    virus: virusLabel,
    pos: posLabel,
  });
  leaderEuAlertChip.textContent = virusLabel;
}

function latestILITotals(dataset, year) {
  const toNumber = (value) => {
    if (value === null || value === undefined) return 0;
    const cleaned = typeof value === "string" ? value.replace(/[^\d.-]/g, "") : value;
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  };

  const rows = respiratoryData.weekly
    .filter((row) => row.dataset === dataset && row.year === year && row.virus === DEFAULT_VIRUS)
    .map((row) => ({
      week: Number(row.week),
      cases: toNumber(row.cases),
    }))
    .filter((row) => Number.isFinite(row.week));

  if (!rows.length) return null;
  const latestWeek = rows.reduce(
    (best, row) => (seasonWeekIndex(row.week) > seasonWeekIndex(best) ? row.week : best),
    rows[0].week
  );
  const latestRows = rows.filter((row) => row.week === latestWeek);
  const total = latestRows.reduce((sum, row) => sum + (Number.isFinite(row.cases) ? row.cases : 0), 0);
  return { latestWeek, total };
}

function renderLatestWeekCases(data) {
  const toNumber = (value) => {
    if (value === null || value === undefined) return 0;
    const cleaned = typeof value === "string" ? value.replace(/[^\d.-]/g, "") : value;
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  };

  if (!data.length) {
    latestWeekCasesValue.textContent = "–";
    latestWeekBadge.textContent = t("status.awaitingData");
    return;
  }
  const latestWeek = data.reduce(
    (best, row) => (seasonWeekIndex(row.week) > seasonWeekIndex(best) ? row.week : best),
    data[0].week
  );
  const total = data
    .filter((row) => row.week === latestWeek)
    .reduce((sum, row) => sum + toNumber(row.cases), 0);
  latestWeekCasesValue.textContent = total.toLocaleString();
  latestWeekBadge.textContent = formatWeekBadge(latestWeek);
}

function renderFluAlert(dataset, year) {
  const latest = latestILITotals(dataset, year);
  if (!latest) {
    fluAlert.hidden = true;
    return;
  }

  fluAlert.hidden = false;
  fluAlert.classList.remove("alert-ok", "alert-critical");

  const exceeds = latest.total >= ILI_THRESHOLD;
  const weekLabel = formatWeek(latest.latestWeek);
  const thresholdLabel = ILI_THRESHOLD.toLocaleString();
  const text = t(exceeds ? "alerts.flu.text.above" : "alerts.flu.text.below", {
    week: weekLabel,
    cases: latest.total.toLocaleString(),
    threshold: thresholdLabel,
  });

  fluAlert.classList.add(exceeds ? "alert-critical" : "alert-ok");

  fluAlertText.textContent = text;
  fluAlertChip.textContent = t(exceeds ? "alerts.flu.chip.above" : "alerts.flu.chip.below");
}

function formatSurgeLabel(direction, pct, previousWeek) {
  const directionLabel = t(`trend.direction.${direction}`);
  const sign = pct >= 0 ? "+" : "";
  const prev = formatWeek(previousWeek);
  if (currentLang === "hu") {
    return `${directionLabel} (${sign}${pct}% a ${prev} héthez képest)`;
  }
  return `${directionLabel} (${sign}${pct}% vs ${prev})`;
}

function computeSurgeSignals(dataset, year) {
  const rows = respiratoryData.weekly.filter((row) => row.dataset === dataset && row.year === year);
  const byVirus = rows.reduce((map, row) => {
    map.set(row.virus, [...(map.get(row.virus) || []), row]);
    return map;
  }, new Map());

  return Array.from(byVirus.entries())
    .map(([virus, entries]) => {
      const sorted = [...entries].sort((a, b) => seasonWeekCompare(a.week, b.week));
      const latest = sorted[sorted.length - 1];
      const previous = sorted[sorted.length - 2];
      if (!latest || !previous) {
        return { virus, label: t("trend.noRecentChange"), change: 0, week: latest?.week ?? "–", direction: "flat" };
      }
      const delta = latest.cases - previous.cases;
      const pct = previous.cases ? Math.round((delta / previous.cases) * 100) : 0;
      const direction = delta > 0 ? "surging" : delta < 0 ? "declining" : "flat";
      return {
        virus,
        label: formatSurgeLabel(direction, pct, previous.week),
        change: delta,
        week: latest.week,
        direction,
      };
    })
    .sort((a, b) => b.change - a.change);
}

function renderSurgeSignals(dataset, year) {
  const signals = computeSurgeSignals(dataset, year).slice(0, 4);
  surgeList.innerHTML = "";

  if (!signals.length) {
    const li = document.createElement("li");
    li.textContent = t("trend.empty");
    surgeList.appendChild(li);
    return;
  }

  signals.forEach((signal) => {
    const li = document.createElement("li");
    const direction = signal.direction || "flat";
    li.className = `trend-${direction}`;
    const virusLabel = displayVirus(signal.virus);
    const weekLabel = Number.isFinite(Number(signal.week)) ? formatWeekLabel(signal.week) : "–";
    li.innerHTML = `<div><strong>${virusLabel}</strong><span>${weekLabel}</span></div><span class="pill">${signal.label}</span>`;
    surgeList.appendChild(li);
  });
}

function updateSortHeaders() {
  const ariaValue = sortDirection === "asc" ? "ascending" : "descending";
  if (weekHeader) {
    weekHeader.setAttribute("aria-sort", sortColumn === "week" ? ariaValue : "none");
    const indicator = weekHeader.querySelector(".sort-indicator");
    if (indicator) indicator.textContent = sortColumn === "week" ? (sortDirection === "asc" ? "▲" : "▼") : "";
  }
  if (casesHeader) {
    casesHeader.setAttribute("aria-sort", sortColumn === "cases" ? ariaValue : "none");
    const indicator = casesHeader.querySelector(".sort-indicator");
    if (indicator) indicator.textContent = sortColumn === "cases" ? (sortDirection === "asc" ? "▲" : "▼") : "";
  }
}

function renderTable(data, seasonYear) {
  tableBody.innerHTML = "";
  updateSortHeaders();
  const sorted = [...data].sort((a, b) => {
    const key = sortColumn === "cases" ? "cases" : "week";
    const valA = key === "week" ? seasonWeekIndex(a.week) : Number(a[key] ?? 0);
    const valB = key === "week" ? seasonWeekIndex(b.week) : Number(b[key] ?? 0);
    if (valA !== valB) {
      return (valA - valB) * (sortDirection === "asc" ? 1 : -1);
    }
    // Stable-ish fallback to week then virus for consistent ordering.
    const weekDiff = seasonWeekIndex(a.week) - seasonWeekIndex(b.week);
    if (weekDiff !== 0) return weekDiff;
    return (a.virus || "").localeCompare(b.virus || "");
  });
  const sariByWeek = (respiratoryData.sariWeekly || [])
    .filter((row) => matchesSeasonYear(row.year, seasonYear))
    .reduce((map, row) => {
      map.set(row.week, row);
      return map;
    }, new Map());
  const positivityByWeek = (respiratoryData.virologyPositivity || [])
    .filter((row) => matchesSeasonYear(row.year, seasonYear))
    .reduce((map, row) => {
      const current = map.get(row.week);
      if (!current || Number(row.positivity ?? 0) > Number(current.positivity ?? 0)) {
        map.set(row.week, row);
      }
      return map;
    }, new Map());

  sorted.forEach((row) => {
    const sari = sariByWeek.get(row.week);
    const admissionsLabel =
      sari && sari.admissions != null && Number.isFinite(Number(sari.admissions))
        ? Number(sari.admissions).toLocaleString()
        : "–";
    const icuLabel =
      sari && sari.icu != null && Number.isFinite(Number(sari.icu)) ? Number(sari.icu).toLocaleString() : "–";
    const pos = positivityByWeek.get(row.week);
    const posLabel =
      pos && pos.positivity != null && Number.isFinite(Number(pos.positivity))
        ? `${displayVirus(pos.virus)} (${Number(pos.positivity).toFixed(1)}%)`
        : "–";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>W${row.week.toString().padStart(2, "0")}</td>
      <td>${displayVirus(row.virus)}</td>
      <td>${displayRegion(row.region)}</td>
      <td>${row.cases.toLocaleString()}</td>
      <td>${admissionsLabel}</td>
      <td>${icuLabel}</td>
      <td>${posLabel}</td>
    `;
    tableBody.appendChild(tr);
  });
}

function renderILIChart(year) {
  const ctx = document.getElementById("ili-chart").getContext("2d");
  const rows = respiratoryData.weekly
    .filter((row) => row.dataset === DATASET && row.year === year && row.virus === DEFAULT_VIRUS)
    .sort((a, b) => seasonWeekCompare(a.week, b.week));

  const labels = rows.map((d) => formatWeek(d.week));
  const values = rows.map((d) => d.cases);

  if (trendChart) trendChart.destroy();

  iliYearBadge.textContent = rows.length ? formatSeasonLabel(year) : t("status.awaitingData");

  trendChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels.length ? labels : [t("status.noData")],
      datasets: [
        {
          label: t("charts.ili.datasetLabel"),
          data: values.length ? values : [0],
          backgroundColor: "rgba(6, 182, 212, 0.6)",
          borderColor: "#06b6d4",
          borderWidth: 1.5,
          borderRadius: 6,
          hoverBackgroundColor: "rgba(6, 182, 212, 0.8)",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: "#e5e7eb" } },
        tooltip: { mode: "index", intersect: false },
      },
      scales: {
        x: { ticks: { color: "#9ca3af" }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: "#9ca3af" }, grid: { color: "rgba(255,255,255,0.05)" } },
      },
    },
  });
}

function latestSariForSeason(year) {
  const rows = (respiratoryData.sariWeekly || []).filter((row) => matchesSeasonYear(row.year, year));
  if (!rows.length) return null;
  return rows.reduce((best, row) => (seasonWeekIndex(row.week) > seasonWeekIndex(best.week) ? row : best), rows[0]);
}

function renderSariCards(year) {
  const latest = latestSariForSeason(year);
  if (!latest) {
    sariAdmissionsValue.textContent = "–";
    sariIcuValue.textContent = "–";
    sariWeekBadge.textContent = t("status.awaitingData");
    return;
  }
  sariAdmissionsValue.textContent =
    latest.admissions != null && Number.isFinite(Number(latest.admissions)) ? Number(latest.admissions).toLocaleString() : "–";
  sariIcuValue.textContent =
    latest.icu != null && Number.isFinite(Number(latest.icu)) ? Number(latest.icu).toLocaleString() : "–";
  sariWeekBadge.textContent = formatWeekBadge(latest.week);
}

function renderSariChart(year) {
  const ctx = document.getElementById("sari-chart").getContext("2d");
  const rows =
    respiratoryData.sariWeekly
      ?.filter((row) => matchesSeasonYear(row.year, year))
      .slice()
      .sort((a, b) => seasonWeekCompare(a.week, b.week)) ?? [];
  const labels = rows.map((d) => formatWeek(d.week));
  const admissions = rows.map((d) => d.admissions);
  const icu = rows.map((d) => d.icu);

  if (sariChart) sariChart.destroy();

  sariChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels.length ? labels : [t("status.noData")],
      datasets: [
        {
          label: t("charts.sari.admissionsLabel"),
          data: admissions.length ? admissions : [0],
          backgroundColor: "rgba(249, 115, 22, 0.7)",
          borderColor: "#f97316",
          borderWidth: 1.5,
          borderRadius: 6,
          hoverBackgroundColor: "rgba(249, 115, 22, 0.85)",
          maxBarThickness: 26,
        },
        {
          label: t("charts.sari.icuLabel"),
          data: icu.length ? icu : [0],
          backgroundColor: "rgba(250, 204, 21, 0.7)",
          borderColor: "#facc15",
          borderWidth: 1.5,
          borderRadius: 6,
          hoverBackgroundColor: "rgba(250, 204, 21, 0.85)",
          maxBarThickness: 26,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: "#e5e7eb" } },
        tooltip: { mode: "index", intersect: false },
      },
      scales: {
        x: { ticks: { color: "#9ca3af" }, grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: { color: "#9ca3af" },
          grid: { color: "rgba(255,255,255,0.05)" },
        },
      },
    },
  });
}

function aggregateDetections(detections = respiratoryData.virologyDetections || [], yearFilter = null) {
  const byKey = new Map();
  detections.forEach((row) => {
    const week = Number(row.week);
    if (!Number.isFinite(week)) return;
    const year = Number(row.year);
    if (yearFilter !== null && Number.isFinite(year) && year !== yearFilter) return;
    const key = `${Number.isFinite(year) ? year : "NA"}-${week}-${row.virus}`;
    const current = byKey.get(key) || { year: Number.isFinite(year) ? year : undefined, week, virus: row.virus, detections: 0 };
    current.detections += Number(row.detections ?? 0);
    byKey.set(key, current);
  });
  return Array.from(byKey.values());
}

function renderVirology(year) {
  const detections = aggregateDetections(respiratoryData.virologyDetections || [], year);
  const positivity = (respiratoryData.virologyPositivity || []).filter((row) => matchesSeasonYear(row.year, year));

  const candidateWeeks = Array.from(
    new Set([...detections.map((d) => d.week), ...positivity.map((p) => p.week)].filter((w) => Number.isFinite(Number(w))))
  );
  const latestWeek = candidateWeeks.length
    ? candidateWeeks.reduce((best, week) => (seasonWeekIndex(week) > seasonWeekIndex(best) ? week : best), candidateWeeks[0])
    : "–";
  viroWeekBadge.textContent =
    latestWeek === "–" ? t("viro.week.latest") : t("viro.week.week", { week: formatWeek(latestWeek) });

  viroDetectionsList.innerHTML = "";
  detections
    .filter((d) => d.week === latestWeek)
    .slice(0, 6)
    .forEach((row) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${displayVirus(row.virus)}</span><strong>${Number(row.detections ?? 0).toLocaleString()}</strong>`;
      viroDetectionsList.appendChild(li);
    });
  if (!viroDetectionsList.children.length) {
    const li = document.createElement("li");
    li.textContent = t("viro.detections.empty");
    viroDetectionsList.appendChild(li);
  }

  viroPositivityList.innerHTML = "";
  positivity
    .filter((p) => p.week === latestWeek)
    .slice(0, 6)
    .forEach((row) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${displayVirus(row.virus)}</span><strong>${Number(row.positivity ?? 0).toFixed(1)}%</strong>`;
      viroPositivityList.appendChild(li);
    });
  if (!viroPositivityList.children.length) {
    const li = document.createElement("li");
    li.textContent = t("viro.positivity.empty");
    viroPositivityList.appendChild(li);
  }

  // Trend charts
  const detCtx = document.getElementById("viro-detections-chart").getContext("2d");
  const posCtx = document.getElementById("viro-positivity-chart").getContext("2d");

  const detWeeks = Array.from(new Set(detections.map((d) => d.week))).sort(seasonWeekCompare);
  const detViruses = Array.from(new Set(detections.map((d) => d.virus)));
  const detectionPalette = {
    "SARS-CoV-2": "#22c55e",
    "Influenza A(H1N1pdm09)": "#f97316",
    "Influenza A(NT)": "#38bdf8",
    "Influenza B": "#a855f7",
  };
  const detectionFallback = ["#eab308", "#14b8a6", "#ef4444", "#6366f1"];
  const detSeries = detViruses.map((virus, idx) => {
    const color = detectionPalette[virus] || detectionFallback[idx % detectionFallback.length];
    const points = detections.filter((d) => d.virus === virus).reduce((acc, row) => {
      acc[row.week] = row.detections;
      return acc;
    }, {});
    return {
      label: displayVirus(virus),
      data: detWeeks.map((w) => points[w] ?? null),
      borderColor: color,
      backgroundColor: color,
      tension: 0.3,
      fill: false,
      pointRadius: 3,
      pointHoverRadius: 5,
    };
  });

  if (viroDetectionsChart) viroDetectionsChart.destroy();
  viroDetectionsChart = new Chart(detCtx, {
    type: "line",
    data: { labels: detWeeks.map((w) => formatWeek(w)), datasets: detSeries },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { labels: { color: "#e5e7eb" } } },
      scales: {
        x: { ticks: { color: "#9ca3af" }, grid: { display: false } },
        y: { ticks: { color: "#9ca3af" }, grid: { color: "rgba(255,255,255,0.05)" } },
      },
    },
  });

  const posWeeks = Array.from(new Set(positivity.map((d) => d.week))).sort(seasonWeekCompare);
  const posViruses = Array.from(new Set(positivity.map((d) => d.virus)));
  const posSeries = posViruses.map((virus, idx) => {
    const color = ["#a855f7", "#22d3ee", "#f97316"][idx % 3];
    const points = positivity.filter((d) => d.virus === virus).reduce((acc, row) => {
      acc[row.week] = row.positivity;
      return acc;
    }, {});
    return {
      label: `${displayVirus(virus)}${t("charts.positivity.suffix")}`,
      data: posWeeks.map((w) => points[w] ?? null),
      borderColor: color,
      backgroundColor: color,
      tension: 0.3,
      fill: false,
      pointRadius: 3,
      pointHoverRadius: 5,
    };
  });

  if (viroPositivityChart) viroPositivityChart.destroy();
  viroPositivityChart = new Chart(posCtx, {
    type: "line",
    data: { labels: posWeeks.map((w) => formatWeek(w)), datasets: posSeries },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: "#e5e7eb" } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1)}%`,
          },
        },
      },
      scales: {
        x: { ticks: { color: "#9ca3af" }, grid: { display: false } },
        y: { ticks: { color: "#9ca3af", callback: (v) => `${v}%` }, grid: { color: "rgba(255,255,255,0.05)" } },
      },
    },
  });
}

function renderEuVirology() {
  const allDetections = respiratoryData.ervissDetections || [];
  const allPositivity = respiratoryData.ervissPositivity?.slice() || [];
  const yearCandidates = Array.from(
    new Set(
      [...allDetections, ...allPositivity]
        .map((row) => Number(row.year))
        .filter((year) => Number.isFinite(year))
    )
  );
  const targetYear =
    ERVISS_YEAR_PRIORITY.find((yr) => yearCandidates.includes(yr)) ||
    (yearCandidates.length ? Math.max(...yearCandidates) : null);

  const detections = targetYear ? aggregateDetections(allDetections, targetYear) : [];
  const positivity = targetYear ? allPositivity.filter((p) => Number(p.year) === targetYear) : [];

  const latestWeek =
    detections.length || positivity.length
      ? Math.max(0, ...detections.map((d) => d.week || 0), ...positivity.map((p) => p.week || 0))
      : null;
  const hasLatestWeek = Number.isFinite(latestWeek) && latestWeek > 0;
  euWeekBadge.textContent = hasLatestWeek
    ? `${targetYear ? `${targetYear}-` : ""}W${latestWeek.toString().padStart(2, "0")}`
    : t("eu.week.latest");

  euDetectionsList.innerHTML = "";
  detections
    .filter((d) => (hasLatestWeek ? d.week === latestWeek : false))
    .slice(0, 6)
    .forEach((row) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${displayVirus(row.virus)}</span><strong>${Number(row.detections ?? 0).toLocaleString()}</strong>`;
      euDetectionsList.appendChild(li);
    });
  if (!euDetectionsList.children.length) {
    const li = document.createElement("li");
    li.textContent = t("eu.detections.empty");
    euDetectionsList.appendChild(li);
  }

  euPositivityList.innerHTML = "";
  positivity
    .filter((p) => (hasLatestWeek ? p.week === latestWeek : false))
    .slice(0, 6)
    .forEach((row) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${displayVirus(row.virus)}</span><strong>${Number(row.positivity ?? 0).toFixed(1)}%</strong>`;
      euPositivityList.appendChild(li);
    });
  if (!euPositivityList.children.length) {
    const li = document.createElement("li");
    li.textContent = t("eu.positivity.empty");
    euPositivityList.appendChild(li);
  }

  const detCtx = document.getElementById("eu-detections-chart").getContext("2d");
  const posCtx = document.getElementById("eu-positivity-chart").getContext("2d");

  const detWeeks = Array.from(new Set(detections.map((d) => d.week))).sort((a, b) => a - b);
  const detViruses = Array.from(new Set(detections.map((d) => d.virus)));
  const detectionPalette = {
    "SARS-CoV-2": "#22c55e",
    "Influenza A(H1N1pdm09)": "#f97316",
    "Influenza A(NT)": "#38bdf8",
    "Influenza B": "#a855f7",
  };
  const detectionFallback = ["#eab308", "#14b8a6", "#ef4444", "#6366f1"];
  const detSeries = detViruses.map((virus, idx) => {
    const color = detectionPalette[virus] || detectionFallback[idx % detectionFallback.length];
    const points = detections.filter((d) => d.virus === virus).reduce((acc, row) => {
      acc[row.week] = row.detections;
      return acc;
    }, {});
    return {
      label: displayVirus(virus),
      data: detWeeks.map((w) => points[w] ?? null),
      borderColor: color,
      backgroundColor: color,
      tension: 0.3,
      fill: false,
      pointRadius: 3,
      pointHoverRadius: 5,
    };
  });

  if (euDetectionsChart) euDetectionsChart.destroy();
  euDetectionsChart = new Chart(detCtx, {
    type: "line",
    data: { labels: detWeeks.map((w) => formatWeek(w)), datasets: detSeries },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { labels: { color: "#e5e7eb" } } },
      scales: {
        x: { ticks: { color: "#9ca3af" }, grid: { display: false } },
        y: { ticks: { color: "#9ca3af" }, grid: { color: "rgba(255,255,255,0.05)" } },
      },
    },
  });

  const posWeeks = Array.from(new Set(positivity.map((d) => d.week))).sort((a, b) => a - b);
  const posViruses = Array.from(new Set(positivity.map((d) => d.virus)));
  const posSeries = posViruses.map((virus, idx) => {
    const color = ["#a855f7", "#22d3ee", "#f97316", "#22c55e"][idx % 4];
    const points = positivity.filter((d) => d.virus === virus).reduce((acc, row) => {
      acc[row.week] = row.positivity;
      return acc;
    }, {});
    return {
      label: `${displayVirus(virus)}${t("charts.positivity.suffix")}`,
      data: posWeeks.map((w) => points[w] ?? null),
      borderColor: color,
      backgroundColor: color,
      tension: 0.3,
      fill: false,
      pointRadius: 3,
      pointHoverRadius: 5,
    };
  });

  if (euPositivityChart) euPositivityChart.destroy();
  euPositivityChart = new Chart(posCtx, {
    type: "line",
    data: { labels: posWeeks.map((w) => formatWeek(w)), datasets: posSeries },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: "#e5e7eb" } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1)}%`,
          },
        },
      },
      scales: {
        x: { ticks: { color: "#9ca3af" }, grid: { display: false } },
        y: { ticks: { color: "#9ca3af", callback: (v) => `${v}%` }, grid: { color: "rgba(255,255,255,0.05)" } },
      },
    },
  });
}

function handleSort(column) {
  if (sortColumn === column) {
    sortDirection = sortDirection === "asc" ? "desc" : "asc";
  } else {
    sortColumn = column;
    sortDirection = "asc";
  }
  renderTable(latestFiltered, currentSelection().year);
}

function bindSortControls() {
  const controls = [
    { el: weekHeader, column: "week" },
    { el: casesHeader, column: "cases" },
  ];
  controls.forEach(({ el, column }) => {
    if (!el) return;
    const activate = () => handleSort(column);
    el.addEventListener("click", activate);
    el.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    });
  });
}

function applyFilters() {
  const { dataset, year, virus } = currentSelection();
  const filtered = respiratoryData.weekly.filter(
    (row) => row.dataset === dataset && row.year === year && row.virus === virus
  );
  latestFiltered = filtered;

  const { total, peakWeek: peak } = summarize(filtered);
  totalCases.textContent = total.toLocaleString();
  peakWeek.textContent = peak;
  datasetDescription.textContent = t("dataset.note");

  renderTable(filtered, year);
  renderChips(filtered);
  renderLatestWeekCases(filtered);
  renderSurgeSignals(dataset, year);
  renderLeaderAlert(year);
  renderEuLeaderAlert();
  renderFluAlert(dataset, year);
  renderILIChart(year);
  renderSariCards(year);
  renderSariChart(year);
  renderVirology(year);
  renderEuVirology();
}

async function loadNNGYKData() {
  try {
    const response = await fetch("./nngyk_all.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const parsed = await response.json();
    if (!Array.isArray(parsed)) throw new Error("Unexpected payload");

    const weekly = [];
    const sariRows = [];
    const viroDetections = [];
    const viroPositivity = [];
    const years = new Set();
    const viruses = new Set();

    parsed.forEach((entry) => {
      const rows = entry?.payload?.weekly || [];
      const sari = entry?.payload?.sari;
      const viro = entry?.payload?.virology || {};
      const seasonYear = Number(entry.season_year ?? entry?.payload?.metadata?.season_year ?? rows[0]?.year);
      const normalizedYear = Number.isFinite(seasonYear) ? seasonYear : undefined;
      rows.forEach((row) => {
        weekly.push(row);
        if (Number.isFinite(row.year)) {
          years.add(row.year);
        }
        if (row.virus) {
          viruses.add(row.virus);
        }
      });
      if (sari && sari.week != null) {
        const week = Number(sari.week);
        const admissions = sari.admissions == null ? null : Number(sari.admissions);
        const icu = sari.icu == null ? null : Number(sari.icu);
        if (Number.isFinite(week) && (Number.isFinite(admissions) || Number.isFinite(icu))) {
          sariRows.push({
            year: normalizedYear,
            week,
            admissions: Number.isFinite(admissions) ? admissions : null,
            icu: Number.isFinite(icu) ? icu : null,
          });
        }
      }
      const weekVal = entry.week || rows[0]?.week || null;
      if (viro && weekVal) {
        const week = Number(weekVal);
        (viro.detections || []).forEach((d) => {
          if (d.virus && d.detections != null) {
            viroDetections.push({ year: normalizedYear, week, virus: d.virus, detections: Number(d.detections) });
          }
        });
        (viro.positivity || []).forEach((p) => {
          if (p.virus && p.positivity != null) {
            viroPositivity.push({ year: normalizedYear, week, virus: p.virus, positivity: Number(p.positivity) });
          }
        });
      }
    });

    if (weekly.length) {
      const aggregated = new Map();
      weekly.forEach((row) => {
        const dataset = row.dataset || DATASET;
        const year = Number(row.year);
        const week = Number(row.week);
        const virus = row.virus || DEFAULT_VIRUS;
        const region = row.region || "National";
        if (!Number.isFinite(year) || !Number.isFinite(week)) return;
        const key = `${dataset}-${year}-${week}-${virus}-${region}`;
        const current = aggregated.get(key) || { dataset, year, week, virus, cases: 0, region };
        current.cases += Number(row.cases ?? 0);
        aggregated.set(key, current);
        if (Number.isFinite(year)) years.add(year);
        if (virus) viruses.add(virus);
      });

      const aggregatedRows = Array.from(aggregated.values()).sort(
        (a, b) => a.year - b.year || a.week - b.week || a.virus.localeCompare(b.virus)
      );
      if (aggregatedRows.length) {
        respiratoryData.weekly = aggregatedRows;
        respiratoryData.viruses = Array.from(viruses).sort();
        respiratoryData.years = Array.from(years).sort((a, b) => a - b);
        respiratoryData.datasets.NNGYK.description = "Structured from parsed NNGYK bulletins (latest run).";
        if (sariRows.length) {
          respiratoryData.sariWeekly = sariRows
            .filter((row) => row.admissions !== null || row.icu !== null)
            .sort((a, b) => (a.year ?? 0) - (b.year ?? 0) || seasonWeekCompare(a.week, b.week));
        }
        if (viroDetections.length) {
          respiratoryData.virologyDetections = viroDetections.sort(
            (a, b) => (a.year ?? 0) - (b.year ?? 0) || seasonWeekCompare(a.week, b.week)
          );
        }
        if (viroPositivity.length) {
          respiratoryData.virologyPositivity = viroPositivity.sort(
            (a, b) => (a.year ?? 0) - (b.year ?? 0) || seasonWeekCompare(a.week, b.week)
          );
        }
        console.info(`Loaded ${aggregatedRows.length} weekly rows from nngyk_all.json`);
      } else {
        console.warn("nngyk_all.json loaded but contained no weekly rows after aggregation");
      }
    } else {
      console.warn("nngyk_all.json loaded but no weekly rows found");
    }
  } catch (error) {
    console.warn("Falling back to bundled sample NNGYK data", error);
  }
}

async function loadERVISSSari() {
  try {
    let payload = null;
    const candidates = ["./erviss_data/erviss_sari.json", "./erviss_sari.json"];
    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: "no-cache" });
        if (res.ok) {
          payload = await res.json();
          break;
        }
      } catch (e) {
        // try next
      }
    }
    if (!payload) return;

    const detections = (payload.detections || []).map((row) => {
      const year = Number(row.year ?? payload.latest_year);
      return {
        year: Number.isFinite(year) ? year : undefined,
        week: Number(row.week),
        virus: row.virus,
        detections: Number(row.detections ?? 0),
      };
    });
    const positivity = (payload.positivity || []).map((row) => {
      const year = Number(row.year ?? payload.latest_year);
      return {
        year: Number.isFinite(year) ? year : undefined,
        week: Number(row.week),
        virus: row.virus,
        positivity: Number(row.positivity ?? 0),
      };
    });

    respiratoryData.ervissDetections = detections.sort((a, b) => a.week - b.week);
    respiratoryData.ervissPositivity = positivity.sort((a, b) => a.week - b.week);
    respiratoryData.datasets[ERVISS_DATASET] = {
      name: "ERVISS (EU/EEA)",
      description: "EU/EEA SARI virological detections and positivity from ECDC ERVISS.",
    };
    console.info(`Loaded ERVISS SARI EU/EEA virology rows (${detections.length} detections, ${positivity.length} positivity).`);
  } catch (error) {
    console.warn("ERVISS SARI virology not loaded", error);
  }
}

async function main() {
  setLanguage(resolveInitialLang(), { persist: false });
  await loadNNGYKData();
  await loadERVISSSari();
  populateFilters();

  const fallbackYear = respiratoryData.years[respiratoryData.years.length - 1];
  const latestNNGYKYear =
    Math.max(
      ...respiratoryData.weekly.filter((row) => row.dataset === DATASET).map((row) => row.year),
      fallbackYear
    ) || fallbackYear;

  yearSelect.value = latestNNGYKYear;

  bindSortControls();
  applyFilters();

  yearSelect.addEventListener("change", applyFilters);
  if (langSelect) {
    langSelect.addEventListener("change", () => {
      setLanguage(langSelect.value, { persist: true, updateUrl: true });
      applyFilters();
    });
  }
}

main();
