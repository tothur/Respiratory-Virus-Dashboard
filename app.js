import { respiratoryData, seasonLabels } from "./data.js";

const SUPPORTED_LANGS = ["en", "hu"];
const STORAGE_LANG_KEY = "rvd-lang";
const INFLUENZA_ALL_KEY = "__influenza_all__";
const VIRO_ALL_KEY = "__all_viruses__";
const STORAGE_THEME_KEY = "rvd-theme";

const yearSelect = document.getElementById("year");
const langSelect = document.getElementById("lang");
const themeSelect = document.getElementById("theme");
const viroVirusSelect = document.getElementById("viro-virus");
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
const sariIcuWeekBadge = document.getElementById("sari-icu-week-badge");
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
const historicalCard = document.getElementById("historical-card");
let historicalILIChart;
let historicalSariChart;
let historicalIcuChart;
const historicalIliDelta = document.getElementById("historical-ili-delta");
const historicalSariDelta = document.getElementById("historical-sari-delta");
const historicalIcuDelta = document.getElementById("historical-icu-delta");
const glanceIliPeak = document.getElementById("glance-ili-peak");
const glanceIliLatest = document.getElementById("glance-ili-latest");
const glanceIliSlope = document.getElementById("glance-ili-slope");
const glanceIliWow = document.getElementById("glance-ili-wow");
const glanceIliWeeksAbove = document.getElementById("glance-ili-weeks-above");
const glanceSariPeak = document.getElementById("glance-sari-peak");
const glanceSariLatest = document.getElementById("glance-sari-latest");
const glanceSariSlope = document.getElementById("glance-sari-slope");
const glanceSariWow = document.getElementById("glance-sari-wow");
const glanceIcuPeak = document.getElementById("glance-icu-peak");
const glanceIcuLatest = document.getElementById("glance-icu-latest");
const glanceIcuSlope = document.getElementById("glance-icu-slope");
const glanceIcuWow = document.getElementById("glance-icu-wow");
const glanceIliSeasonToDate = document.getElementById("glance-ili-std");
const glanceSariSeasonToDate = document.getElementById("glance-sari-std");
const glanceSariPer100 = document.getElementById("glance-sari-per-100");
const glanceIcuShare = document.getElementById("glance-icu-share");

const STRINGS = {
  en: {
    "meta.title": "Seasonal Respiratory Pathogen Dashboard",
    "header.title": "Seasonal Respiratory Pathogen Dashboard",
    "header.subtitle": "Hungarian and European situation overview based on NNGYK and ECDC data",
    "header.controls": "Header controls",
    "controls.language": "Language",
    "controls.year": "Year",
    "controls.pathogen": "Pathogen",
    "controls.theme": "Theme",
    "theme.system": "System",
    "theme.dark": "Dark",
    "theme.light": "Light",
    "sections.alerts": "Key alerts",
    "sections.trends": "Weekly trend highlights",
    "sections.charts": "Visual summaries",
    "sections.virology": "Virology detections and positivity",
    "sections.eu": "EU/EEA virology detections and positivity",
    "sections.table": "Weekly table",
    "sections.dataset": "Dataset notes",
    "sections.huBanner.aria": "Hungary section",
    "sections.huBanner.kicker": "Section",
    "sections.huBanner.title": "Hungary",
    "sections.huBanner.note": "National surveillance and sentinel signals.",
    "sections.euBanner.aria": "EU/EEA section",
    "sections.euBanner.kicker": "Section",
    "sections.euBanner.title": "EU/EEA",
    "sections.euBanner.note": "ECDC ERVISS detections and positivity.",
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
    "table.scroll.aria": "Scrollable table",
    "table.headers.week": "Week",
    "table.headers.virus": "Virus",
    "table.headers.region": "Region",
    "table.headers.cases": "Cases",
    "table.headers.sariAdmissions": "SARI admissions",
    "table.headers.sariIcu": "SARI ICU",
    "table.headers.topPositivity": "Top positivity",
    "dataset.note": "Aggregated national respiratory virus surveillance shared by the National Public Health Center.",
    "glance.aria": "Season at a glance",
    "glance.title": "Season at a glance",
    "glance.note": "Growth and burden signals alongside peak and recent trend.",
    "glance.ili": "Flu-like illness",
    "glance.sari": "SARI hospitalizations",
    "glance.icu": "SARI ICU",
    "glance.peak": "Peak",
    "glance.latest": "Latest",
    "glance.slope": "3-week slope",
    "glance.wow": "WoW change",
    "glance.ili.weeksAbove": "Weeks above threshold",
    "glance.seasonToDate.title": "Season-to-date burden",
    "glance.seasonToDate.ili": "ILI cumulative",
    "glance.seasonToDate.sari": "SARI cumulative",
    "glance.seasonToDate.median": "Median",
    "glance.seasonToDate.lastSeason": "Last season",
    "glance.seasonToDate.noBaseline": "No baseline",
    "glance.severity.title": "Severity ratios",
    "glance.severity.sariPer100": "SARI as % of ILI",
    "glance.severity.icuShare": "ICU as % of SARI",
    "coverage.nngyk": "NNGYK latest",
    "coverage.sari": "SARI latest",
    "coverage.erviss": "ERVISS latest",
    "coverage.missing": "Missing weeks",
    "markers.seasonStart": "Season start",
    "markers.holidays": "Holidays",
    "markers.threshold": "Threshold",
    "markers.crossing": "Crossing",
    "virus.all": "All viruses",
    "virus.influenzaAll": "Influenza (all)",
    "historical.title": "Historical trends",
    "historical.metrics.ili": "Flu-like illness",
    "historical.metrics.sariAdmissions": "SARI hospitalizations",
    "historical.metrics.sariIcu": "SARI ICU",
    "historical.ili.aria": "Historical flu-like illness comparison",
    "historical.sari.aria": "Historical SARI admissions comparison",
    "historical.icu.aria": "Historical SARI ICU comparison",
    "historical.delta.label": "Change vs last season",
    "historical.delta.summary": "Change vs last season: {value}",
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
    "meta.title": "Szezonális Légúti Kórokozó Dashboard",
    "header.title": "Szezonális Légúti Kórokozó Dashboard",
    "header.subtitle": "A magyarországi és európai helyzetkép az NNGYK és ECDC adatai alapján",
    "header.controls": "Fejléc vezérlők",
    "controls.language": "Nyelv",
    "controls.year": "Év",
    "controls.pathogen": "Kórokozó",
    "controls.theme": "Téma",
    "theme.system": "Rendszer",
    "theme.dark": "Sötét",
    "theme.light": "Világos",
    "sections.alerts": "Fő riasztások",
    "sections.trends": "Heti trend kiemelések",
    "sections.charts": "Vizuális összefoglalók",
    "sections.virology": "Virológiai kimutatások és pozitivitás",
    "sections.eu": "EU/EGT virológiai kimutatások és pozitivitás",
    "sections.table": "Heti táblázat",
    "sections.dataset": "Adatkészletek megjegyzései",
    "sections.huBanner.aria": "Magyarország szekció",
    "sections.huBanner.kicker": "Szekció",
    "sections.huBanner.title": "Magyarország",
    "sections.huBanner.note": "Országos felügyeleti adatok és sentinel jelzések.",
    "sections.euBanner.aria": "EU/EGT szekció",
    "sections.euBanner.kicker": "Szekció",
    "sections.euBanner.title": "EU/EGT",
    "sections.euBanner.note": "ECDC ERVISS kimutatások és tesztpozitivitás.",
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
    "metrics.sariAdmissions.note": "Súlyos akut légúti fertőzés miatti kórházi felvételek (sentinel kórházak).",
    "metrics.sariIcu.title": "SARI ICU",
    "metrics.sariIcu.note": "Intenzív/szubintenzív ellátás a SARI felvételek között.",
    "trend.title": "Heti trend jelzések",
    "trend.note": "Gyors áttekintés arról, mely kórokozók erősödnek vagy enyhülnek.",
    "trend.badge": "Aktuális nézet",
    "charts.ili.title": "Influenzaszerű megbetegedések (NNGYK)",
    "charts.ili.note": "Heti ILI esetszám magyarországi sentinel jelentések alapján.",
    "charts.sari.title": "SARI kórházi felvételek",
    "charts.sari.note": "Heti SARI felvételek és intenzív terhelés a sentinel kórházakból.",
    "charts.sari.badge": "Kórházi trend",
    "charts.ili.aria": "ILI trend",
    "charts.sari.aria": "SARI kórházi felvételek trend",
    "viro.detections.title": "Sentinel orvosi vírus kimutatások",
    "viro.detections.note": "Legfrissebb kimutatások a sentinel mintákban.",
    "viro.positivity.title": "Tesztpozitivitás (sentinel orvosi minták)",
    "viro.positivity.note": "Pozitivitási arányok a sentinel mintákban.",
    "viro.badge": "Virológia",
    "viro.detections.list.aria": "Sentinel kimutatások",
    "viro.detections.chart.aria": "Sentinel kimutatások trend",
    "viro.positivity.list.aria": "Sentinel pozitivitás",
    "viro.positivity.chart.aria": "Sentinel pozitivitás trend",
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
    "table.scroll.aria": "Görgethető táblázat",
    "table.headers.week": "Hét",
    "table.headers.virus": "Vírus",
    "table.headers.region": "Régió",
    "table.headers.cases": "Esetszám",
    "table.headers.sariAdmissions": "SARI felvételek",
    "table.headers.sariIcu": "SARI intenzív",
    "table.headers.topPositivity": "Legmagasabb pozitivitás",
    "dataset.note": "Az NNGYK által közzétett országos légúti járványügyi felügyeleti adatok összesítve.",
    "glance.aria": "Szezon áttekintés",
    "glance.title": "Szezon áttekintés",
    "glance.note": "Növekedés és terhelés a csúcs és a rövid távú trend mellett.",
    "glance.ili": "Influenzaszerű megbetegedés (ILI)",
    "glance.sari": "SARI felvételek",
    "glance.icu": "SARI intenzív",
    "glance.peak": "Csúcs",
    "glance.latest": "Legfrissebb",
    "glance.slope": "3 hetes trend",
    "glance.wow": "Heti változás",
    "glance.ili.weeksAbove": "Küszöb feletti hetek",
    "glance.seasonToDate.title": "Szezon eddig",
    "glance.seasonToDate.ili": "ILI kumulatív",
    "glance.seasonToDate.sari": "SARI kumulatív",
    "glance.seasonToDate.median": "Medián",
    "glance.seasonToDate.lastSeason": "Előző szezon",
    "glance.seasonToDate.noBaseline": "Nincs összehasonlítás",
    "glance.severity.title": "Súlyossági arányok",
    "glance.severity.sariPer100": "SARI az ILI %-ában",
    "glance.severity.icuShare": "ICU a SARI %-ában",
    "coverage.nngyk": "NNGYK legfrissebb",
    "coverage.sari": "SARI legfrissebb",
    "coverage.erviss": "ERVISS legfrissebb",
    "coverage.missing": "Hiányzó hetek",
    "markers.seasonStart": "Szezon kezdete",
    "markers.holidays": "Ünnepek",
    "markers.threshold": "Küszöb",
    "markers.crossing": "Átlépés",
    "virus.all": "Összes vírus",
    "virus.influenzaAll": "Influenza (mind)",
    "historical.title": "Történeti trendek",
    "historical.metrics.ili": "Influenzaszerű megbetegedés (ILI)",
    "historical.metrics.sariAdmissions": "SARI felvételek",
    "historical.metrics.sariIcu": "SARI intenzív",
    "historical.ili.aria": "Történeti ILI összehasonlítás",
    "historical.sari.aria": "Történeti SARI felvételek összehasonlítás",
    "historical.icu.aria": "Történeti SARI intenzív összehasonlítás",
    "historical.delta.label": "Előző szezonhoz képest",
    "historical.delta.summary": "Előző szezonhoz képest: {value}",
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
  if (viroVirusSelect && viroVirusSelect.options.length) {
    const previous = viroVirusSelect.value;
    Array.from(viroVirusSelect.options).forEach((opt) => {
      opt.textContent = displayVirus(opt.value);
    });
    viroVirusSelect.value = previous;
  }
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

function applyTheme(theme) {
  const value = String(theme || "system");
  const normalized = value === "dark" || value === "light" ? value : "system";
  if (normalized === "system") {
    const prefersLight = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: light)").matches
      : false;
    if (prefersLight) document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", normalized);
  }
  configureChartDefaults();
}

function initThemeControls() {
  const storedTheme = (() => {
    try {
      return localStorage.getItem(STORAGE_THEME_KEY);
    } catch {
      return null;
    }
  })();

  const theme = storedTheme || "system";
  applyTheme(theme);
  if (themeSelect) themeSelect.value = theme;

  if (themeSelect) {
    themeSelect.addEventListener("change", () => {
      const next = themeSelect.value;
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_THEME_KEY, next);
      } catch {
        // ignore
      }
      applyFilters();
    });
  }

  if (typeof window !== "undefined" && window.matchMedia) {
    const mql = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => {
      const current = themeSelect?.value || theme;
      if (current === "system") {
        applyTheme("system");
        applyFilters();
      }
    };
    try {
      mql.addEventListener("change", handler);
    } catch {
      // Safari fallback
      mql.addListener(handler);
    }
  }
}

let chartsConfigured = false;

function chartTheme() {
  const styles = getComputedStyle(document.documentElement);
  const theme = document.documentElement.getAttribute("data-theme");
  const text = styles.getPropertyValue("--text").trim() || "#e8edf7";
  const muted = styles.getPropertyValue("--muted").trim() || "#9fb3c8";
  const grid = theme === "light" ? "rgba(15, 23, 42, 0.10)" : "rgba(255, 255, 255, 0.05)";
  const tooltipBg = theme === "light" ? "rgba(255, 255, 255, 0.94)" : "rgba(2, 6, 23, 0.92)";
  const tooltipBorder = theme === "light" ? "rgba(15, 23, 42, 0.18)" : "rgba(255, 255, 255, 0.14)";
  return { text, muted, grid, tooltipBg, tooltipBorder, theme };
}

function configureChartDefaults() {
  if (typeof Chart === "undefined") return;
  const colors = chartTheme();

  Chart.defaults.font.family = '"Inter", system-ui, -apple-system, sans-serif';
  Chart.defaults.color = colors.muted;
  Chart.defaults.borderColor = colors.grid;
  Chart.defaults.plugins.legend.labels.color = colors.text;
  Chart.defaults.plugins.legend.labels.boxWidth = 10;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.tooltip.backgroundColor = colors.tooltipBg;
  Chart.defaults.plugins.tooltip.borderColor = colors.tooltipBorder;
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.titleColor = colors.text;
  Chart.defaults.plugins.tooltip.bodyColor = colors.text;
  Chart.defaults.plugins.tooltip.titleSpacing = 6;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 12;

  if (!chartsConfigured && typeof Chart.register === "function") {
    Chart.register({
      id: "focusDim",
      beforeDatasetsDraw: (chart) => {
        if (chart.config.type !== "line") return;
        if ((chart.data?.datasets || []).length < 2) return;
        const active = chart.getActiveElements ? chart.getActiveElements() : [];
        chart.$focusDim = active && active.length ? active[0].datasetIndex : null;
      },
      beforeDatasetDraw: (chart, args) => {
        if (chart.$focusDim == null) return;
        if (chart.config.type !== "line") return;
        chart.ctx.save();
        if (args.index !== chart.$focusDim) chart.ctx.globalAlpha = 0.18;
      },
      afterDatasetDraw: (chart) => {
        if (chart.$focusDim == null) return;
        if (chart.config.type !== "line") return;
        chart.ctx.restore();
      },
      afterDatasetsDraw: (chart) => {
        chart.$focusDim = null;
      },
    });
    chartsConfigured = true;
  }
}

function markChartRendered(canvasEl) {
  if (!canvasEl) return;
  canvasEl.classList.remove("chart-fade");
  // Restart animation.
  void canvasEl.offsetWidth;
  canvasEl.classList.add("chart-fade");
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

function normalizeVirusName(name) {
  if (!name) return name;
  const value = String(name).trim();
  if (!value) return value;
  const lower = value.toLowerCase();
  if (lower === "rsv") return "RSV";
  if (/^rs[-\s]*v[ií]rus$/i.test(value)) return "RSV";
  if (/^l[eé]g[uú]ti\s+[oó]ri[aá]ssejtes\s+v[ií]rus$/i.test(value)) return "RSV";
  return value;
}

function displayVirus(name) {
  if (name === VIRO_ALL_KEY) return t("virus.all");
  if (name === INFLUENZA_ALL_KEY) return t("virus.influenzaAll");
  const normalized = normalizeVirusName(name);
  if (currentLang !== "hu") return normalized;
  return VIRUS_LABELS_HU[normalized] || normalized;
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

function viroVirusesForSeason(year) {
  const detections = aggregateDetectionsWithInfluenzaAll(respiratoryData.virologyDetections || [], year);
  return Array.from(new Set(detections.map((row) => row.virus))).sort((a, b) => {
    if (a === INFLUENZA_ALL_KEY) return -1;
    if (b === INFLUENZA_ALL_KEY) return 1;
    return String(a).localeCompare(String(b));
  });
}

function populateViroVirusSelect(year, preferred = null) {
  if (!viroVirusSelect) return;
  const viruses = viroVirusesForSeason(year);
  viroVirusSelect.innerHTML = "";
  {
    const option = document.createElement("option");
    option.value = VIRO_ALL_KEY;
    option.textContent = displayVirus(VIRO_ALL_KEY);
    viroVirusSelect.appendChild(option);
  }
  viruses.forEach((virus) => {
    const option = document.createElement("option");
    option.value = virus;
    option.textContent = displayVirus(virus);
    viroVirusSelect.appendChild(option);
  });
  const next = (preferred && (preferred === VIRO_ALL_KEY || viruses.includes(preferred)) ? preferred : null) || VIRO_ALL_KEY;
  viroVirusSelect.value = next;
}

function chipIconSvg(id) {
  const base = (path) =>
    `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="${path}"/></svg>`;
  switch (id) {
    case "points":
      return base(
        "M7 3a4 4 0 1 0 0 8a4 4 0 0 0 0-8Zm0 2a2 2 0 1 1 0 4a2 2 0 0 1 0-4Zm10-2a4 4 0 1 0 0 8a4 4 0 0 0 0-8Zm0 2a2 2 0 1 1 0 4a2 2 0 0 1 0-4ZM4 21a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v0.5H4V21Zm10 0a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v0.5h-10V21Z"
      );
    case "peak":
      return base("M12 3l2.2 5.6L20 9.2l-4.4 3.7L17 19l-5-3l-5 3l1.4-6.1L4 9.2l5.8-.6L12 3Z");
    case "median":
      return base("M5 6h14v2H5V6Zm0 5h9v2H5v-2Zm0 5h14v2H5v-2Z");
    case "nngyk":
      return base("M4 20V8l8-4l8 4v12h-2V9.3l-6-3l-6 3V20H4Z");
    case "sari":
      return base("M12 2a7 7 0 0 1 7 7c0 4.2-3 7.7-7 13c-4-5.3-7-8.8-7-13a7 7 0 0 1 7-7Zm0 4a3 3 0 1 0 0 6a3 3 0 0 0 0-6Z");
    case "erviss":
      return base(
        "M12 2.5a9.5 9.5 0 1 0 0 19a9.5 9.5 0 0 0 0-19Zm6.9 8h-2.8a16.4 16.4 0 0 0-1-4.4a7.54 7.54 0 0 1 3.8 4.4ZM12 4.6c.8 1.1 1.5 2.9 1.9 5.9H10.1c.4-3 1.1-4.8 1.9-5.9ZM5.3 6.1a7.54 7.54 0 0 1 3.8-1.5a16.4 16.4 0 0 0-1 4.4H5.3Zm0 11.8h2.8a16.4 16.4 0 0 0 1 4.4a7.54 7.54 0 0 1-3.8-4.4Zm4.8 0h3.8c-.4 3-1.1 4.8-1.9 5.9c-.8-1.1-1.5-2.9-1.9-5.9Zm0-2h3.8a19 19 0 0 0 0-3.8h-3.8a19 19 0 0 0 0 3.8Zm5.8 6.4a16.4 16.4 0 0 0 1-4.4h2.8a7.54 7.54 0 0 1-3.8 4.4Z"
      );
    case "missing":
      return base("M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20Zm1 5v6h-2V7h2Zm-1 11a1.25 1.25 0 1 1 0-2.5a1.25 1.25 0 0 1 0 2.5Z");
    default:
      return base("M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18Z");
  }
}

function renderChips(data) {
  chipsRow.innerHTML = "";
  const summary = summarize(data);
  const selectedYear = Number(yearSelect?.value);
  const iliLatest = latestILITotals(DATASET, selectedYear);
  const iliLatestLabel = iliLatest ? formatWeek(iliLatest.latestWeek) : "–";
  const sariLatest = latestSariForSeason(selectedYear);
  const sariLatestLabel = sariLatest ? formatWeek(sariLatest.week) : "–";

  const ervissDet = respiratoryData.ervissDetections || [];
  const ervissPos = respiratoryData.ervissPositivity || [];
  const ervissCandidates = [...ervissDet, ...ervissPos]
    .map((row) => ({ year: Number(row.year), week: Number(row.week) }))
    .filter((row) => Number.isFinite(row.year) && Number.isFinite(row.week));
  const ervissLatest = ervissCandidates.reduce(
    (best, row) =>
      !best || row.year > best.year || (row.year === best.year && row.week > best.week) ? row : best,
    null
  );
  const ervissLatestLabel = ervissLatest ? `${ervissLatest.year}-${formatWeek(ervissLatest.week)}` : "–";

  const missingWeekList = (weeks) => {
    const unique = Array.from(new Set(weeks.map((w) => Number(w)).filter((w) => Number.isFinite(w))));
    if (unique.length < 2) return [];
    const sorted = unique.slice().sort(seasonWeekCompare);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const idxMin = seasonWeekIndex(min);
    const idxMax = seasonWeekIndex(max);
    const expected = [];
    for (let idx = idxMin; idx <= idxMax; idx += 1) {
      const week = idx >= 53 ? idx - 53 : idx;
      expected.push(week);
    }
    const present = new Set(unique);
    return expected.filter((w) => !present.has(w));
  };

  const iliMissing = iliLatest
    ? missingWeekList(
        respiratoryData.weekly
          .filter((row) => row.dataset === DATASET && row.year === selectedYear && row.virus === DEFAULT_VIRUS)
          .map((row) => row.week)
      )
    : [];
  const sariMissing = sariLatest
    ? missingWeekList((respiratoryData.sariWeekly || []).filter((r) => Number(r.year) === selectedYear).map((r) => r.week))
    : [];

  const chips = [
    { id: "points", label: t("chips.dataPoints"), value: data.length },
    { id: "peak", label: t("chips.peakWeek"), value: summary.peakWeek },
    { id: "median", label: t("chips.medianCases"), value: median(data.map((d) => d.cases)) },
    { id: "nngyk", label: t("coverage.nngyk"), value: iliLatestLabel },
    { id: "sari", label: t("coverage.sari"), value: sariLatestLabel },
    { id: "erviss", label: t("coverage.erviss"), value: ervissLatestLabel },
    {
      id: "missing",
      label: `${t("coverage.missing")} (ILI/SARI)`,
      value:
        (iliMissing.length || sariMissing.length)
          ? `${iliMissing.length}/${sariMissing.length}`
          : "0/0",
    },
  ];

  chips.forEach((chip) => {
    const span = document.createElement("span");
    span.className = "chip";
    span.innerHTML = `<span class="chip-icon">${chipIconSvg(chip.id)}</span><span class="chip-label">${chip.label}</span><span class="chip-value">${chip.value}</span>`;
    chipsRow.appendChild(span);
  });
}

function updateLoadingIndicators() {
  const isLoadingText = (text) => {
    if (!text) return false;
    return /Awaiting|Adatok betöltése|Adatra vár|betöltése/i.test(text);
  };
  const candidates = [
    fluAlertText,
    leaderAlertText,
    leaderEuAlertText,
    latestWeekBadge,
    sariWeekBadge,
    viroWeekBadge,
    euWeekBadge,
    iliYearBadge,
  ].filter(Boolean);
  candidates.forEach((el) => {
    const loading = isLoadingText(el.textContent);
    el.classList.toggle("loading-sheen", loading);
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

function renderTable(data, seasonYear, selectedVirus) {
  tableBody.innerHTML = "";
  updateSortHeaders();
  const sariRows = (respiratoryData.sariWeekly || []).filter((row) => matchesSeasonYear(row.year, seasonYear));
  const positivityRows = (respiratoryData.virologyPositivity || []).filter((row) => matchesSeasonYear(row.year, seasonYear));
  const detectionsRows = (respiratoryData.virologyDetections || []).filter((row) => matchesSeasonYear(row.year, seasonYear));
  const weeksWithRows = new Set(data.map((row) => Number(row.week)).filter(Number.isFinite));
  const allWeeks = new Set([
    ...weeksWithRows,
    ...sariRows.map((row) => Number(row.week)).filter(Number.isFinite),
    ...positivityRows.map((row) => Number(row.week)).filter(Number.isFinite),
    ...detectionsRows.map((row) => Number(row.week)).filter(Number.isFinite),
  ]);
  const placeholderRegion = data[0]?.region || "National";
  const placeholderVirus = selectedVirus || DEFAULT_VIRUS;
  const merged = [
    ...data,
    ...Array.from(allWeeks)
      .filter((week) => !weeksWithRows.has(week))
      .map((week) => ({
        dataset: DATASET,
        year: seasonYear,
        virus: placeholderVirus,
        week,
        cases: null,
        region: placeholderRegion,
      })),
  ];
  const sorted = [...merged].sort((a, b) => {
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
  const sariByWeek = sariRows
    .reduce((map, row) => {
      map.set(row.week, row);
      return map;
    }, new Map());
  const positivityByWeek = positivityRows
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
    const casesLabel =
      row.cases != null && Number.isFinite(Number(row.cases)) ? Number(row.cases).toLocaleString() : "–";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>W${row.week.toString().padStart(2, "0")}</td>
      <td>${displayVirus(row.virus)}</td>
      <td>${displayRegion(row.region)}</td>
      <td>${casesLabel}</td>
      <td>${admissionsLabel}</td>
      <td>${icuLabel}</td>
      <td>${posLabel}</td>
    `;
    tableBody.appendChild(tr);
  });
}

function renderILIChart(year) {
  const canvas = document.getElementById("ili-chart");
  const ctx = canvas.getContext("2d");
  const colors = chartTheme();
  const rows = respiratoryData.weekly
    .filter((row) => row.dataset === DATASET && row.year === year && row.virus === DEFAULT_VIRUS)
    .sort((a, b) => seasonWeekCompare(a.week, b.week));

  const labels = rows.map((d) => formatWeek(d.week));
  const values = rows.map((d) => d.cases);

  if (trendChart) trendChart.destroy();

  iliYearBadge.textContent = rows.length ? formatSeasonLabel(year) : t("status.awaitingData");

  const thresholdSeries = {
    label: t("markers.threshold"),
    type: "line",
    data: labels.length ? labels.map(() => ILI_THRESHOLD) : [ILI_THRESHOLD],
    borderColor: "rgba(244, 63, 94, 0.9)",
    borderWidth: 1.5,
    borderDash: [6, 6],
    pointRadius: 0,
    tension: 0,
  };

  const crossingPoint = (() => {
    if (values.length < 2) return null;
    for (let i = 1; i < values.length; i += 1) {
      if (values[i] >= ILI_THRESHOLD && values[i - 1] < ILI_THRESHOLD) {
        return { x: labels[i], y: values[i] };
      }
    }
    return null;
  })();

  const crossingSeries = crossingPoint
    ? {
        label: t("markers.crossing"),
        type: "scatter",
        data: [crossingPoint],
        backgroundColor: "rgba(244, 63, 94, 1)",
        borderColor: "rgba(244, 63, 94, 1)",
        pointRadius: 5,
        pointHoverRadius: 7,
      }
    : null;

  const seasonMarkerPlugin = {
    id: "seasonMarkers",
    afterDraw: (chart) => {
      const { ctx } = chart;
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;
      if (!xScale || !yScale) return;
      const stroke = colors.theme === "light" ? "rgba(15, 23, 42, 0.16)" : "rgba(148, 163, 184, 0.35)";
      const labelColor = colors.muted;
      const drawLine = (label, text) => {
        const idx = chart.data.labels.indexOf(label);
        if (idx < 0) return;
        const x = xScale.getPixelForValue(idx);
        ctx.save();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, yScale.top);
        ctx.lineTo(x, yScale.bottom);
        ctx.stroke();
        ctx.fillStyle = labelColor;
        ctx.font = "12px Inter, system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(text, x + 6, yScale.top + 14);
        ctx.restore();
      };
      drawLine("W40", t("markers.seasonStart"));
      drawLine("W52", t("markers.holidays"));
      drawLine("W01", t("markers.holidays"));
    },
  };

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
        thresholdSeries,
        ...(crossingSeries ? [crossingSeries] : []),
      ],
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: { mode: "index", intersect: false },
      },
      scales: {
        x: { ticks: { color: colors.muted }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: colors.muted }, grid: { color: colors.grid } },
      },
    },
    plugins: [seasonMarkerPlugin],
  });
  markChartRendered(canvas);
}

function latestSariForSeason(year) {
  const rows = (respiratoryData.sariWeekly || []).filter((row) => matchesSeasonYear(row.year, year));
  if (!rows.length) return null;
  return rows.reduce((best, row) => (seasonWeekIndex(row.week) > seasonWeekIndex(best.week) ? row : best), rows[0]);
}

function computeGlance(values) {
  const rows = values.filter((row) => Number.isFinite(Number(row.week))).slice().sort((a, b) => seasonWeekCompare(a.week, b.week));
  if (!rows.length) return null;
  const peak = rows.reduce((best, row) => (Number(row.value ?? 0) > Number(best.value ?? -Infinity) ? row : best), rows[0]);
  const latest = rows[rows.length - 1];
  const lastPoints = rows.slice(Math.max(0, rows.length - 3));
  let slope = null;
  if (lastPoints.length >= 2) {
    const first = lastPoints[0];
    const last = lastPoints[lastPoints.length - 1];
    const delta = Number(last.value ?? 0) - Number(first.value ?? 0);
    slope = delta / (lastPoints.length - 1);
  }
  const pctOfPeak = peak && Number(peak.value) ? (Number(latest.value ?? 0) / Number(peak.value)) * 100 : null;
  return { peak, latest, pctOfPeak, slope };
}

function computeWeekOverWeekChange(values) {
  const rows = values.filter((row) => Number.isFinite(Number(row.week))).slice().sort((a, b) => seasonWeekCompare(a.week, b.week));
  if (rows.length < 2) return null;
  const latest = rows[rows.length - 1];
  const previous = rows[rows.length - 2];
  const latestValue = Number(latest.value ?? 0);
  const previousValue = Number(previous.value ?? 0);
  if (!Number.isFinite(latestValue) || !Number.isFinite(previousValue) || previousValue <= 0) return null;
  return ((latestValue - previousValue) / previousValue) * 100;
}

function formatSignedPercent(value) {
  if (!Number.isFinite(value)) return "–";
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

function sumThroughWeek(values, targetWeek) {
  if (!Number.isFinite(targetWeek)) return null;
  return values
    .filter((row) => Number.isFinite(row.week) && Number.isFinite(row.value))
    .filter((row) => seasonWeekCompare(row.week, targetWeek) <= 0)
    .reduce((sum, row) => sum + row.value, 0);
}

function computeSeasonToDateComparison(seriesForYear, currentYear, targetWeek) {
  const currentSeries = seriesForYear(currentYear);
  const currentTotal = sumThroughWeek(currentSeries, targetWeek);
  if (!Number.isFinite(currentTotal)) {
    return { currentTotal: null, baselineCount: 0, median: null, lastSeason: null, percentile: null };
  }

  const years = (respiratoryData.years || []).map((year) => Number(year)).filter(Number.isFinite);
  const baselineYears = years.filter((year) => year < Number(currentYear));
  const baselineTotals = baselineYears
    .map((year) => sumThroughWeek(seriesForYear(year), targetWeek))
    .filter((total) => Number.isFinite(total) && total > 0);
  const lastSeasonYear = baselineYears.length ? Math.max(...baselineYears) : null;
  const lastSeason = lastSeasonYear != null ? sumThroughWeek(seriesForYear(lastSeasonYear), targetWeek) : null;
  const medianValue = baselineTotals.length >= 2 ? median(baselineTotals) : null;
  const percentile =
    baselineTotals.length >= 2
      ? Math.round((baselineTotals.filter((value) => value <= currentTotal).length / baselineTotals.length) * 100)
      : null;

  return {
    currentTotal,
    baselineCount: baselineTotals.length,
    median: medianValue,
    lastSeason: Number.isFinite(lastSeason) ? lastSeason : null,
    percentile,
  };
}

function formatSeasonToDateValue(summary) {
  if (!summary || !Number.isFinite(summary.currentTotal)) return "–";
  const currentLabel = summary.currentTotal.toLocaleString();
  if (!summary.baselineCount) {
    return `${currentLabel} (${t("glance.seasonToDate.noBaseline")})`;
  }
  const extras = [];
  if (summary.baselineCount >= 2 && Number.isFinite(summary.median)) {
    extras.push(`${t("glance.seasonToDate.median")} ${summary.median.toLocaleString()}`);
  } else if (Number.isFinite(summary.lastSeason)) {
    extras.push(`${t("glance.seasonToDate.lastSeason")} ${summary.lastSeason.toLocaleString()}`);
  }
  if (summary.percentile != null) {
    extras.push(`P${summary.percentile}`);
  }
  return extras.length ? `${currentLabel} (${extras.join(", ")})` : currentLabel;
}

function computeSeverityRatios(iliSeries, sariRows) {
  if (!iliSeries.length || !sariRows.length) return null;
  const iliByWeek = new Map(iliSeries.map((row) => [Number(row.week), Number(row.value ?? 0)]));
  const sharedWeeks = sariRows
    .map((row) => Number(row.week))
    .filter((week) => Number.isFinite(week) && iliByWeek.has(week))
    .sort(seasonWeekCompare);
  if (!sharedWeeks.length) return null;
  const week = sharedWeeks[sharedWeeks.length - 1];
  const iliValue = Number(iliByWeek.get(week) ?? 0);
  const sariRow = sariRows.find((row) => Number(row.week) === week);
  const admissions = Number(sariRow?.admissions ?? 0);
  const icu = Number(sariRow?.icu ?? 0);
  if (!Number.isFinite(iliValue) || iliValue <= 0 || !Number.isFinite(admissions) || admissions <= 0) return null;
  const sariPercent = (admissions / iliValue) * 100;
  const icuShare = Number.isFinite(icu) && admissions > 0 ? (icu / admissions) * 100 : null;
  return { week, sariPercent, icuShare };
}

function formatGlanceLine(glance) {
  if (!glance) return "–";
  const week = formatWeek(glance.week);
  const value = Number(glance.value ?? 0);
  return `${week}: ${value.toLocaleString()}`;
}

function renderSeasonAtGlance(year) {
  const buildIliSeries = (targetYear) => {
    const iliTotals = respiratoryData.weekly
      .filter((row) => row.dataset === DATASET && Number(row.year) === Number(targetYear) && row.virus === DEFAULT_VIRUS)
      .reduce((map, row) => {
        const week = Number(row.week);
        if (!Number.isFinite(week)) return map;
        map.set(week, (map.get(week) || 0) + Number(row.cases ?? 0));
        return map;
      }, new Map());
    return Array.from(iliTotals.entries()).map(([week, value]) => ({ week, value }));
  };

  const iliSeries = buildIliSeries(year);
  const iliGlance = computeGlance(iliSeries);

  const sariRows = (respiratoryData.sariWeekly || []).filter((row) => matchesSeasonYear(row.year, year));
  const sariSeries = sariRows.map((row) => ({ week: Number(row.week), value: Number(row.admissions ?? 0) }));
  const icuSeries = sariRows.map((row) => ({ week: Number(row.week), value: Number(row.icu ?? 0) }));
  const sariGlance = computeGlance(sariSeries);
  const icuGlance = computeGlance(icuSeries);
  const iliWow = computeWeekOverWeekChange(iliSeries);
  const sariWow = computeWeekOverWeekChange(sariSeries);
  const icuWow = computeWeekOverWeekChange(icuSeries);
  const weeksAboveThreshold = iliSeries.filter((row) => Number(row.value ?? 0) >= ILI_THRESHOLD).length;
  const severity = computeSeverityRatios(iliSeries, sariRows) || {};

  const buildSariSeries = (targetYear) =>
    (respiratoryData.sariWeekly || [])
      .filter((row) => Number(row.year) === Number(targetYear))
      .map((row) => ({ week: Number(row.week), value: Number(row.admissions ?? 0) }));
  const iliSeasonToDate = computeSeasonToDateComparison(buildIliSeries, year, iliGlance?.latest?.week);
  const sariSeasonToDate = computeSeasonToDateComparison(buildSariSeries, year, sariGlance?.latest?.week);

  const renderBlock = (peakEl, latestEl, slopeEl, glance) => {
    if (!peakEl || !latestEl || !slopeEl) return;
    if (!glance) {
      peakEl.textContent = "–";
      latestEl.textContent = "–";
      slopeEl.textContent = "–";
      return;
    }
    peakEl.textContent = formatGlanceLine(glance.peak);
    const latestLine = `${formatWeek(glance.latest.week)}: ${Number(glance.latest.value ?? 0).toLocaleString()}${
      glance.pctOfPeak != null ? ` (${Math.round(glance.pctOfPeak)}%)` : ""
    }`;
    latestEl.textContent = latestLine;
    if (glance.slope == null) {
      slopeEl.textContent = "–";
    } else {
      const rounded = Math.round(glance.slope);
      const sign = rounded > 0 ? "+" : "";
      slopeEl.textContent = `${sign}${rounded.toLocaleString()}/week`;
    }
  };

  renderBlock(glanceIliPeak, glanceIliLatest, glanceIliSlope, iliGlance);
  renderBlock(glanceSariPeak, glanceSariLatest, glanceSariSlope, sariGlance);
  renderBlock(glanceIcuPeak, glanceIcuLatest, glanceIcuSlope, icuGlance);
  if (glanceIliWow) glanceIliWow.textContent = formatSignedPercent(iliWow);
  if (glanceSariWow) glanceSariWow.textContent = formatSignedPercent(sariWow);
  if (glanceIcuWow) glanceIcuWow.textContent = formatSignedPercent(icuWow);
  if (glanceIliWeeksAbove) {
    glanceIliWeeksAbove.textContent = iliSeries.length ? weeksAboveThreshold.toLocaleString() : "–";
  }
  if (glanceIliSeasonToDate) glanceIliSeasonToDate.textContent = formatSeasonToDateValue(iliSeasonToDate);
  if (glanceSariSeasonToDate) glanceSariSeasonToDate.textContent = formatSeasonToDateValue(sariSeasonToDate);
  if (glanceSariPer100) {
    glanceSariPer100.textContent =
      Number.isFinite(severity.sariPercent) ? `${formatWeek(severity.week)}: ${severity.sariPercent.toFixed(1)}%` : "–";
  }
  if (glanceIcuShare) {
    glanceIcuShare.textContent =
      Number.isFinite(severity.icuShare) ? `${formatWeek(severity.week)}: ${severity.icuShare.toFixed(1)}%` : "–";
  }
}

function renderSariCards(year) {
  const latest = latestSariForSeason(year);
  if (!latest) {
    sariAdmissionsValue.textContent = "–";
    sariIcuValue.textContent = "–";
    sariWeekBadge.textContent = t("status.awaitingData");
    if (sariIcuWeekBadge) sariIcuWeekBadge.textContent = t("status.awaitingData");
    return;
  }
  sariAdmissionsValue.textContent =
    latest.admissions != null && Number.isFinite(Number(latest.admissions)) ? Number(latest.admissions).toLocaleString() : "–";
  sariIcuValue.textContent =
    latest.icu != null && Number.isFinite(Number(latest.icu)) ? Number(latest.icu).toLocaleString() : "–";
  sariWeekBadge.textContent = formatWeekBadge(latest.week);
  if (sariIcuWeekBadge) sariIcuWeekBadge.textContent = formatWeekBadge(latest.week);
}

function renderSariChart(year) {
  const canvas = document.getElementById("sari-chart");
  const ctx = canvas.getContext("2d");
  const colors = chartTheme();
  const rows =
    respiratoryData.sariWeekly
      ?.filter((row) => matchesSeasonYear(row.year, year))
      .slice()
      .sort((a, b) => seasonWeekCompare(a.week, b.week)) ?? [];
  const labels = rows.map((d) => formatWeek(d.week));
  const admissions = rows.map((d) => d.admissions);
  const icu = rows.map((d) => d.icu);

  if (sariChart) sariChart.destroy();

  const seasonMarkerPlugin = {
    id: "seasonMarkersSari",
    afterDraw: (chart) => {
      const { ctx } = chart;
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;
      if (!xScale || !yScale) return;
      const stroke = colors.theme === "light" ? "rgba(15, 23, 42, 0.16)" : "rgba(148, 163, 184, 0.35)";
      const labelColor = colors.muted;
      const drawLine = (label, text) => {
        const idx = chart.data.labels.indexOf(label);
        if (idx < 0) return;
        const x = xScale.getPixelForValue(idx);
        ctx.save();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, yScale.top);
        ctx.lineTo(x, yScale.bottom);
        ctx.stroke();
        ctx.fillStyle = labelColor;
        ctx.font = "12px Inter, system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(text, x + 6, yScale.top + 14);
        ctx.restore();
      };
      drawLine("W40", t("markers.seasonStart"));
      drawLine("W52", t("markers.holidays"));
      drawLine("W01", t("markers.holidays"));
    },
  };

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
        tooltip: { mode: "index", intersect: false },
      },
      scales: {
        x: { ticks: { color: colors.muted }, grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: { color: colors.muted },
          grid: { color: colors.grid },
        },
      },
    },
    plugins: [seasonMarkerPlugin],
  });
  markChartRendered(canvas);
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

function isInfluenzaVirus(name) {
  if (!name || typeof name !== "string") return false;
  if (name === INFLUENZA_ALL_KEY) return false;
  return name.startsWith("Influenza");
}

function aggregateDetectionsWithInfluenzaAll(detections = respiratoryData.virologyDetections || [], yearFilter = null) {
  const aggregated = aggregateDetections(detections, yearFilter);
  const byWeek = new Map();
  aggregated.forEach((row) => {
    if (!isInfluenzaVirus(row.virus)) return;
    const week = Number(row.week);
    if (!Number.isFinite(week)) return;
    byWeek.set(week, (byWeek.get(week) || 0) + Number(row.detections ?? 0));
  });

  const influenzaRows = Array.from(byWeek.entries())
    .filter(([, total]) => Number.isFinite(total) && total > 0)
    .map(([week, detections]) => ({ year: yearFilter ?? undefined, week, virus: INFLUENZA_ALL_KEY, detections }));

  return aggregated.concat(influenzaRows);
}

function renderVirology(year) {
  const colors = chartTheme();
  const detections = aggregateDetectionsWithInfluenzaAll(respiratoryData.virologyDetections || [], year);
  const positivity = (respiratoryData.virologyPositivity || []).filter((row) => matchesSeasonYear(row.year, year));

  if (viroVirusSelect) {
    populateViroVirusSelect(year, viroVirusSelect.value);
  }
  const selectedDetVirus = viroVirusSelect?.value || VIRO_ALL_KEY;

  const candidateWeeks = Array.from(
    new Set([...detections.map((d) => d.week), ...positivity.map((p) => p.week)].filter((w) => Number.isFinite(Number(w))))
  );
  const latestWeek = candidateWeeks.length
    ? candidateWeeks.reduce((best, week) => (seasonWeekIndex(week) > seasonWeekIndex(best) ? week : best), candidateWeeks[0])
    : "–";
  viroWeekBadge.textContent =
    latestWeek === "–" ? t("viro.week.latest") : t("viro.week.week", { week: formatWeek(latestWeek) });

  viroDetectionsList.innerHTML = "";
  const latestDetectionRows = detections
    .filter((d) => d.week === latestWeek)
    .slice()
    .sort((a, b) => Number(b.detections ?? 0) - Number(a.detections ?? 0));
  const influenzaAllRow = latestDetectionRows.find((row) => row.virus === INFLUENZA_ALL_KEY);
  const detectionRowsForList = [
    ...(influenzaAllRow ? [influenzaAllRow] : []),
    ...latestDetectionRows.filter((row) => row.virus !== INFLUENZA_ALL_KEY),
  ].slice(0, 6);

  detectionRowsForList.forEach((row) => {
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
  const detViruses =
    selectedDetVirus === VIRO_ALL_KEY
      ? Array.from(new Set(detections.map((d) => d.virus))).sort((a, b) => {
          if (a === INFLUENZA_ALL_KEY) return -1;
          if (b === INFLUENZA_ALL_KEY) return 1;
          return String(a).localeCompare(String(b));
        })
      : [selectedDetVirus];
  const detectionPalette = {
    "SARS-CoV-2": "#22c55e",
    "Influenza A(H1N1pdm09)": "#f97316",
    "Influenza A(NT)": "#38bdf8",
    "Influenza B": "#a855f7",
    [INFLUENZA_ALL_KEY]: "#ec4899",
  };
  const detectionFallback = ["#eab308", "#14b8a6", "#ef4444", "#6366f1"];
  const detSeries = detViruses.map((virus, idx) => {
    const color = detectionPalette[virus] || detectionFallback[idx % detectionFallback.length];
    const points = detections
      .filter((d) => d.virus === virus)
      .reduce((acc, row) => {
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
      borderWidth: 2,
    };
  });

  if (viroDetectionsChart) viroDetectionsChart.destroy();
  viroDetectionsChart = new Chart(detCtx, {
    type: "line",
    data: { labels: detWeeks.length ? detWeeks.map((w) => formatWeek(w)) : [t("status.noData")], datasets: detSeries },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      scales: {
        x: { ticks: { color: colors.muted }, grid: { display: false } },
        y: { ticks: { color: colors.muted }, grid: { color: colors.grid } },
      },
    },
  });
  markChartRendered(document.getElementById("viro-detections-chart"));

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
      borderWidth: 2,
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
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1)}%`,
          },
        },
      },
      scales: {
        x: { ticks: { color: colors.muted }, grid: { display: false } },
        y: { ticks: { color: colors.muted, callback: (v) => `${v}%` }, grid: { color: colors.grid } },
      },
    },
  });
  markChartRendered(document.getElementById("viro-positivity-chart"));
}

function renderEuVirology() {
  const colors = chartTheme();
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
      borderWidth: 2,
    };
  });

  if (euDetectionsChart) euDetectionsChart.destroy();
  euDetectionsChart = new Chart(detCtx, {
    type: "line",
    data: { labels: detWeeks.map((w) => formatWeek(w)), datasets: detSeries },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      scales: {
        x: { ticks: { color: colors.muted }, grid: { display: false } },
        y: { ticks: { color: colors.muted }, grid: { color: colors.grid } },
      },
    },
  });
  markChartRendered(document.getElementById("eu-detections-chart"));

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
      borderWidth: 2,
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
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1)}%`,
          },
        },
      },
      scales: {
        x: { ticks: { color: colors.muted }, grid: { display: false } },
        y: { ticks: { color: colors.muted, callback: (v) => `${v}%` }, grid: { color: colors.grid } },
      },
    },
  });
  markChartRendered(document.getElementById("eu-positivity-chart"));
}

function destroyHistoricalCharts() {
  if (historicalILIChart) historicalILIChart.destroy();
  if (historicalSariChart) historicalSariChart.destroy();
  if (historicalIcuChart) historicalIcuChart.destroy();
  historicalILIChart = null;
  historicalSariChart = null;
  historicalIcuChart = null;
}

function sumByWeek(rows, valueKey) {
  const byWeek = new Map();
  rows.forEach((row) => {
    const week = Number(row.week);
    if (!Number.isFinite(week)) return;
    const value = Number(row[valueKey] ?? 0);
    if (!Number.isFinite(value)) return;
    byWeek.set(week, (byWeek.get(week) || 0) + value);
  });
  return byWeek;
}

function latestPercentChange(currentMap, previousMap, weeks) {
  if (!weeks.length) return null;
  for (let i = weeks.length - 1; i >= 0; i -= 1) {
    const week = weeks[i];
    const currentValue = currentMap.get(week);
    const previousValue = previousMap.get(week);
    if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue) || previousValue === 0) continue;
    return ((currentValue - previousValue) / previousValue) * 100;
  }
  return null;
}

function setHistoricalDelta(el, value) {
  if (!el) return;
  const valueLabel = Number.isFinite(value) ? formatSignedPercent(value) : "–";
  el.textContent = t("historical.delta.summary", { value: valueLabel });
}

function renderHistoricalTrends(selectedYear) {
  if (!historicalCard) return;
  const colors = chartTheme();
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "rgba(125, 211, 252, 0.95)";

  const compareYear = selectedYear - 1;
  const hasCompareYear = Array.isArray(respiratoryData.years) && respiratoryData.years.includes(compareYear);
  const show = selectedYear === 2025 && hasCompareYear;
  historicalCard.hidden = !show;
  if (!show) {
    destroyHistoricalCharts();
    setHistoricalDelta(historicalIliDelta, null);
    setHistoricalDelta(historicalSariDelta, null);
    setHistoricalDelta(historicalIcuDelta, null);
    return;
  }

  const iliRowsA = respiratoryData.weekly.filter(
    (row) => row.dataset === DATASET && row.year === compareYear && row.virus === DEFAULT_VIRUS
  );
  const iliRowsB = respiratoryData.weekly.filter(
    (row) => row.dataset === DATASET && row.year === selectedYear && row.virus === DEFAULT_VIRUS
  );
  const iliA = sumByWeek(iliRowsA, "cases");
  const iliB = sumByWeek(iliRowsB, "cases");

  const sariRows = respiratoryData.sariWeekly || [];
  const sariA = sumByWeek(sariRows.filter((row) => Number(row.year) === compareYear), "admissions");
  const sariB = sumByWeek(sariRows.filter((row) => Number(row.year) === selectedYear), "admissions");
  const icuA = sumByWeek(sariRows.filter((row) => Number(row.year) === compareYear), "icu");
  const icuB = sumByWeek(sariRows.filter((row) => Number(row.year) === selectedYear), "icu");

  const weeks = Array.from(
    new Set([
      ...iliA.keys(),
      ...iliB.keys(),
      ...sariA.keys(),
      ...sariB.keys(),
      ...icuA.keys(),
      ...icuB.keys(),
    ])
  ).sort(seasonWeekCompare);

  const iliDelta = latestPercentChange(iliB, iliA, weeks);
  const sariDelta = latestPercentChange(sariB, sariA, weeks);
  const icuDelta = latestPercentChange(icuB, icuA, weeks);

  const labels = weeks.length ? weeks.map((w) => formatWeek(w)) : [t("status.noData")];
  const makeSeries = (map) => (weeks.length ? weeks.map((w) => (map.has(w) ? map.get(w) : null)) : [0]);
  const makeDeltaSeries = (current, previous) =>
    weeks.length
      ? weeks.map((w) => {
          const currentValue = current.get(w);
          const previousValue = previous.get(w);
          if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue) || previousValue === 0) return null;
          return ((currentValue - previousValue) / previousValue) * 100;
        })
      : [0];

  const seasonA = formatSeasonLabel(compareYear);
  const seasonB = formatSeasonLabel(selectedYear);
  const muted = colors.theme === "light" ? "rgba(15, 23, 42, 0.55)" : "rgba(148, 163, 184, 0.9)";
  const deltaColor = colors.theme === "light" ? "rgba(37, 99, 235, 0.6)" : "rgba(96, 165, 250, 0.75)";
  const deltaLabel = t("historical.delta.label");

  const iliCtx = document.getElementById("historical-ili-chart")?.getContext("2d");
  const sariCtx = document.getElementById("historical-sari-chart")?.getContext("2d");
  const icuCtx = document.getElementById("historical-icu-chart")?.getContext("2d");
  if (!iliCtx || !sariCtx || !icuCtx) return;

  destroyHistoricalCharts();

  setHistoricalDelta(historicalIliDelta, iliDelta);
  setHistoricalDelta(historicalSariDelta, sariDelta);
  setHistoricalDelta(historicalIcuDelta, icuDelta);

  const baseOptions = {
    responsive: true,
    interaction: { mode: "index", intersect: false },
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const label = ctx.dataset.label || "";
            const value = ctx.parsed.y;
            if (ctx.dataset.isDelta) {
              if (!Number.isFinite(value)) return `${label}: –`;
              const sign = value > 0 ? "+" : "";
              return `${label}: ${sign}${value.toFixed(1)}%`;
            }
            if (!Number.isFinite(value)) return `${label}: –`;
            return `${label}: ${Number(value).toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: { ticks: { color: colors.muted }, grid: { display: false } },
      y: { beginAtZero: true, ticks: { color: colors.muted }, grid: { color: colors.grid } },
      y1: {
        position: "right",
        ticks: { color: colors.muted, callback: (v) => `${v}%` },
        grid: { drawOnChartArea: false },
      },
    },
  };

  historicalILIChart = new Chart(iliCtx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: seasonA,
          data: makeSeries(iliA),
          borderColor: muted,
          backgroundColor: muted,
          pointRadius: 2.5,
          pointHoverRadius: 4,
          tension: 0.25,
          borderWidth: 2,
        },
        {
          label: seasonB,
          data: makeSeries(iliB),
          borderColor: accent,
          backgroundColor: accent,
          pointRadius: 2.5,
          pointHoverRadius: 4,
          tension: 0.25,
          borderWidth: 2,
        },
        {
          label: deltaLabel,
          data: makeDeltaSeries(iliB, iliA),
          borderColor: deltaColor,
          backgroundColor: deltaColor,
          pointRadius: 0,
          pointHoverRadius: 3,
          tension: 0.25,
          borderWidth: 2,
          borderDash: [6, 6],
          yAxisID: "y1",
          isDelta: true,
        },
      ],
    },
    options: baseOptions,
  });
  markChartRendered(document.getElementById("historical-ili-chart"));

  historicalSariChart = new Chart(sariCtx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: seasonA,
          data: makeSeries(sariA),
          borderColor: muted,
          backgroundColor: muted,
          pointRadius: 2.5,
          pointHoverRadius: 4,
          tension: 0.25,
          borderWidth: 2,
        },
        {
          label: seasonB,
          data: makeSeries(sariB),
          borderColor: "rgba(251, 146, 60, 0.95)",
          backgroundColor: "rgba(251, 146, 60, 0.95)",
          pointRadius: 2.5,
          pointHoverRadius: 4,
          tension: 0.25,
          borderWidth: 2,
        },
        {
          label: deltaLabel,
          data: makeDeltaSeries(sariB, sariA),
          borderColor: deltaColor,
          backgroundColor: deltaColor,
          pointRadius: 0,
          pointHoverRadius: 3,
          tension: 0.25,
          borderWidth: 2,
          borderDash: [6, 6],
          yAxisID: "y1",
          isDelta: true,
        },
      ],
    },
    options: baseOptions,
  });
  markChartRendered(document.getElementById("historical-sari-chart"));

  historicalIcuChart = new Chart(icuCtx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: seasonA,
          data: makeSeries(icuA),
          borderColor: muted,
          backgroundColor: muted,
          pointRadius: 2.5,
          pointHoverRadius: 4,
          tension: 0.25,
          borderWidth: 2,
        },
        {
          label: seasonB,
          data: makeSeries(icuB),
          borderColor: "rgba(250, 204, 21, 0.95)",
          backgroundColor: "rgba(250, 204, 21, 0.95)",
          pointRadius: 2.5,
          pointHoverRadius: 4,
          tension: 0.25,
          borderWidth: 2,
        },
        {
          label: deltaLabel,
          data: makeDeltaSeries(icuB, icuA),
          borderColor: deltaColor,
          backgroundColor: deltaColor,
          pointRadius: 0,
          pointHoverRadius: 3,
          tension: 0.25,
          borderWidth: 2,
          borderDash: [6, 6],
          yAxisID: "y1",
          isDelta: true,
        },
      ],
    },
    options: baseOptions,
  });
  markChartRendered(document.getElementById("historical-icu-chart"));
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

  renderTable(filtered, year, virus);
  renderChips(filtered);
  renderLatestWeekCases(filtered);
  renderSurgeSignals(dataset, year);
  renderLeaderAlert(year);
  renderEuLeaderAlert();
  renderFluAlert(dataset, year);
  renderSeasonAtGlance(year);
  renderILIChart(year);
  renderSariCards(year);
  renderSariChart(year);
  renderVirology(year);
  renderEuVirology();
  renderHistoricalTrends(year);
  updateLoadingIndicators();
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
        const normalizedVirus = normalizeVirusName(row.virus);
        weekly.push({ ...row, virus: normalizedVirus });
        if (Number.isFinite(row.year)) {
          years.add(row.year);
        }
        if (normalizedVirus) {
          viruses.add(normalizedVirus);
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
            viroDetections.push({
              year: normalizedYear,
              week,
              virus: normalizeVirusName(d.virus),
              detections: Number(d.detections),
            });
          }
        });
        (viro.positivity || []).forEach((p) => {
          if (p.virus && p.positivity != null) {
            viroPositivity.push({
              year: normalizedYear,
              week,
              virus: normalizeVirusName(p.virus),
              positivity: Number(p.positivity),
            });
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
  document.documentElement.classList.add("is-loading");
  setLanguage(resolveInitialLang(), { persist: false });
  initThemeControls();
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
  if (viroVirusSelect) {
    viroVirusSelect.addEventListener("change", applyFilters);
  }
  if (langSelect) {
    langSelect.addEventListener("change", () => {
      setLanguage(langSelect.value, { persist: true, updateUrl: true });
      applyFilters();
    });
  }

  document.documentElement.classList.remove("is-loading");
}

main();
