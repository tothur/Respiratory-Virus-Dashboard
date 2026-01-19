import { respiratoryData, seasonLabels } from "./data.js";

const yearSelect = document.getElementById("year");
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

const VIRUS_LABELS = {
  "ILI (flu-like illness)": "ILI (influenzaszerű megbetegedés)",
  "Influenza A": "Influenza A",
  "Influenza B": "Influenza B",
  "Influenza A(H1N1pdm09)": "Influenza A(H1N1pdm09)",
  "Influenza A(H3)": "Influenza A(H3)",
  "RSV": "RSV",
  "SARS-CoV-2": "SARS-CoV-2",
};

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

const translateVirus = (name) => VIRUS_LABELS[normalizeVirusName(name)] || normalizeVirusName(name);
const REGION_LABELS = { National: "Országos" };
const translateRegion = (name) => REGION_LABELS[name] || name;
const formatWeek = (week) => `W${week.toString().padStart(2, "0")}`;
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
const DATASET_DESCRIPTIONS = {
  NNGYK: "Az NNGYK légúti figyelőszolgálatának strukturált, feldolgozott heti adatai.",
  ERVISS: "EU/EGT SARI virológiai kimutatások és pozitivitás (ECDC ERVISS).",
};

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
    { label: "Adatpont", value: data.length },
    { label: "Csúcs hét", value: summary.peakWeek },
    { label: "Medián esetszám", value: median(data.map((d) => d.cases)) },
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
  leaderAlertText.textContent = `${weekLabel}. hét: ${translateVirus(leader.virus)} a legmagasabb sentinel tesztpozitivitású (${posLabel}%).`;
  leaderAlertChip.textContent = translateVirus(leader.virus);
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
  leaderEuAlertText.textContent = `${weekLabel}. hét (${leader.year}): ${translateVirus(
    leader.virus
  )} vezeti az EU/EGT sentinel pozitivitást (${posLabel}%).`;
  leaderEuAlertChip.textContent = translateVirus(leader.virus);
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
    latestWeekBadge.textContent = "Adatra vár";
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
  latestWeekBadge.textContent = `${formatWeek(latestWeek)}. hét`;
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
  const weekLabel = latest.latestWeek.toString().padStart(2, "0");
  const thresholdLabel = ILI_THRESHOLD.toLocaleString();
  const text = exceeds
    ? `W${weekLabel}. hét: az ILI aktivitás (${latest.total.toLocaleString()} eset) meghaladja a riasztási küszöböt (${thresholdLabel}).`
    : `W${weekLabel}. hét: az ILI aktivitás (${latest.total.toLocaleString()} eset) a riasztási küszöb alatt marad (${thresholdLabel}).`;

  fluAlert.classList.add(exceeds ? "alert-critical" : "alert-ok");

  fluAlertText.textContent = text;
  fluAlertChip.textContent = exceeds ? "Járványjelzés" : "Küszöb alatt";
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
        return { virus, label: "Nincs friss változás", change: 0, week: latest?.week ?? "–", direction: "flat" };
      }
      const delta = latest.cases - previous.cases;
      const pct = previous.cases ? Math.round((delta / previous.cases) * 100) : 0;
      const direction = delta > 0 ? "surging" : delta < 0 ? "declining" : "flat";
      const dirLabel = direction === "surging" ? "Erősödik" : direction === "declining" ? "Enyhül" : "Változatlan";
      return {
        virus,
        label: `${dirLabel} (${pct >= 0 ? "+" : ""}${pct}% a W${previous.week.toString().padStart(2, "0")} héthez képest)`,
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
    li.textContent = "Még nincs heti trend adat.";
    surgeList.appendChild(li);
    return;
  }

  signals.forEach((signal) => {
    const li = document.createElement("li");
    li.className = `trend-${signal.direction.toLowerCase()}`;
    li.innerHTML = `<div><strong>${translateVirus(signal.virus)}</strong><span>${formatWeek(
      signal.week
    )}. hét</span></div><span class="pill">${signal.label}</span>`;
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
        ? `${translateVirus(pos.virus)} (${Number(pos.positivity).toFixed(1)}%)`
        : "–";
    const casesLabel =
      row.cases != null && Number.isFinite(Number(row.cases)) ? Number(row.cases).toLocaleString() : "–";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>W${row.week.toString().padStart(2, "0")}</td>
      <td>${translateVirus(row.virus)}</td>
      <td>${translateRegion(row.region)}</td>
      <td>${casesLabel}</td>
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

  const seasonLabel = seasonLabels[year] || `${year} szezon`;
  iliYearBadge.textContent = rows.length ? seasonLabel : "Adatra vár";

  trendChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels.length ? labels : ["Nincs adat"],
      datasets: [
        {
          label: "ILI (influenzaszerű megbetegedés, NNGYK)",
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
    sariWeekBadge.textContent = "Adatra vár";
    return;
  }
  sariAdmissionsValue.textContent =
    latest.admissions != null && Number.isFinite(Number(latest.admissions)) ? Number(latest.admissions).toLocaleString() : "–";
  sariIcuValue.textContent =
    latest.icu != null && Number.isFinite(Number(latest.icu)) ? Number(latest.icu).toLocaleString() : "–";
  sariWeekBadge.textContent = `${formatWeek(latest.week)}. hét`;
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
      labels: labels.length ? labels : ["Nincs adat"],
      datasets: [
        {
          label: "SARI felvételek",
          data: admissions.length ? admissions : [0],
          backgroundColor: "rgba(249, 115, 22, 0.7)",
          borderColor: "#f97316",
          borderWidth: 1.5,
          borderRadius: 6,
          hoverBackgroundColor: "rgba(249, 115, 22, 0.85)",
          maxBarThickness: 26,
        },
        {
          label: "SARI intenzív",
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
    latestWeek === "–" ? "Legfrissebb hét" : `W${latestWeek.toString().padStart(2, "0")}. hét`;

  viroDetectionsList.innerHTML = "";
  detections
    .filter((d) => d.week === latestWeek)
    .slice(0, 6)
    .forEach((row) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${translateVirus(row.virus)}</span><strong>${Number(row.detections ?? 0).toLocaleString()}</strong>`;
      viroDetectionsList.appendChild(li);
    });
  if (!viroDetectionsList.children.length) {
    const li = document.createElement("li");
    li.textContent = "Nincs elérhető kimutatás.";
    viroDetectionsList.appendChild(li);
  }

  viroPositivityList.innerHTML = "";
  positivity
    .filter((p) => p.week === latestWeek)
    .slice(0, 6)
    .forEach((row) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${translateVirus(row.virus)}</span><strong>${Number(row.positivity ?? 0).toFixed(1)}%</strong>`;
      viroPositivityList.appendChild(li);
    });
  if (!viroPositivityList.children.length) {
    const li = document.createElement("li");
    li.textContent = "Nincs elérhető pozitivitási adat.";
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
      label: translateVirus(virus),
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
      label: `${translateVirus(virus)} pozitivitás`,
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
    ? `${targetYear ? `${targetYear}-` : ""}${formatWeek(latestWeek)}`
    : "Legfrissebb hét";

  euDetectionsList.innerHTML = "";
  detections
    .filter((d) => (hasLatestWeek ? d.week === latestWeek : false))
    .slice(0, 6)
    .forEach((row) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${translateVirus(row.virus)}</span><strong>${Number(row.detections ?? 0).toLocaleString()}</strong>`;
      euDetectionsList.appendChild(li);
    });
  if (!euDetectionsList.children.length) {
    const li = document.createElement("li");
    li.textContent = "Nincs elérhető kimutatás.";
    euDetectionsList.appendChild(li);
  }

  euPositivityList.innerHTML = "";
  positivity
    .filter((p) => (hasLatestWeek ? p.week === latestWeek : false))
    .slice(0, 6)
    .forEach((row) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${translateVirus(row.virus)}</span><strong>${Number(row.positivity ?? 0).toFixed(1)}%</strong>`;
      euPositivityList.appendChild(li);
    });
  if (!euPositivityList.children.length) {
    const li = document.createElement("li");
    li.textContent = "Nincs elérhető pozitivitási adat.";
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
      label: translateVirus(virus),
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
      label: `${translateVirus(virus)} pozitivitás`,
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
  datasetDescription.textContent = DATASET_DESCRIPTIONS[dataset] || respiratoryData.datasets[dataset].description;

  renderTable(filtered, year, virus);
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
        respiratoryData.datasets.NNGYK.description =
          "NNGYK bulletinokból automatikusan kinyert és strukturált heti adatok.";
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
        console.info(`Betöltve ${aggregatedRows.length} heti sor a nngyk_all.json fájlból`);
      } else {
        console.warn("A nngyk_all.json betöltődött, de az összesítés után nem maradt heti sor.");
      }
    } else {
      console.warn("A nngyk_all.json betöltődött, de nem tartalmazott heti sorokat.");
    }
  } catch (error) {
    console.warn("Alapértelmezett mintaadatok használata (NNGYK)", error);
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
      name: "ERVISS (EU/EGT)",
      description: "EU/EGT SARI virológiai kimutatások és pozitivitás az ECDC ERVISS adatbázisból.",
    };
    console.info(
      `Betöltve ERVISS SARI EU/EGT virológia (${detections.length} kimutatás, ${positivity.length} pozitivitási sor).`
    );
  } catch (error) {
    console.warn("ERVISS SARI virológia nem töltődött be", error);
  }
}

async function main() {
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
}

main();
