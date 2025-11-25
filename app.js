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
const variantList = document.getElementById("variant-list");
const variantNote = document.getElementById("variant-note");
const variantWeekBadge = document.getElementById("variant-week-badge");
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
let variantChart;

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
    { label: "Data points", value: data.length },
    { label: "Peak week", value: summary.peakWeek },
    { label: "Median cases", value: median(data.map((d) => d.cases)) },
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

function latestPositivityLeader() {
  const positivity = respiratoryData.virologyPositivity || [];
  if (!positivity.length) return null;
  const latestWeek = Math.max(...positivity.map((p) => p.week));
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

function renderLeaderAlert() {
  const leader = latestPositivityLeader();
  if (!leader) {
    leaderAlert.hidden = true;
    return;
  }
  leaderAlert.hidden = false;
  const weekLabel = `W${leader.week.toString().padStart(2, "0")}`;
  const posLabel = leader.positivity.toFixed(1);
  leaderAlertText.textContent = `Week ${weekLabel}: ${leader.virus} shows the highest sentinel test positivity (${posLabel}%).`;
  leaderAlertChip.textContent = leader.virus;
}

function renderEuLeaderAlert() {
  const leader = latestEuPositivityLeader();
  if (!leader) {
    leaderEuAlert.hidden = true;
    return;
  }
  leaderEuAlert.hidden = false;
  const weekLabel = `W${leader.week.toString().padStart(2, "0")}`;
  const posLabel = leader.positivity.toFixed(1);
  leaderEuAlertText.textContent = `Week ${weekLabel} (${leader.year}): ${leader.virus} leads EU/EEA sentinel positivity (${posLabel}%).`;
  leaderEuAlertChip.textContent = leader.virus;
}

function latestILITotals(dataset, year) {
  const rows = respiratoryData.weekly.filter(
    (row) => row.dataset === dataset && row.year === year && row.virus === DEFAULT_VIRUS
  );

  if (!rows.length) return null;
  const latestWeek = Math.max(...rows.map((row) => row.week));
  const latestRows = rows.filter((row) => row.week === latestWeek);
  const total = latestRows.reduce((sum, row) => sum + row.cases, 0);
  return { latestWeek, total };
}

function renderLatestWeekCases(data) {
  if (!data.length) {
    latestWeekCasesValue.textContent = "–";
    latestWeekBadge.textContent = "Awaiting data";
    return;
  }
  const latestWeek = Math.max(...data.map((row) => row.week));
  const total = data
    .filter((row) => row.week === latestWeek)
    .reduce((sum, row) => sum + Number(row.cases ?? 0), 0);
  latestWeekCasesValue.textContent = total.toLocaleString();
  latestWeekBadge.textContent = `W${latestWeek.toString().padStart(2, "0")}`;
}

function renderFluAlert(dataset, year) {
  const latest = latestILITotals(dataset, year);
  if (!latest) {
    fluAlert.hidden = true;
    return;
  }

  fluAlert.hidden = false;
  fluAlert.classList.remove("alert-ok");

  const exceeds = latest.total >= ILI_THRESHOLD;
  const weekLabel = latest.latestWeek.toString().padStart(2, "0");
  const thresholdLabel = ILI_THRESHOLD.toLocaleString();
  const text = exceeds
    ? `Week W${weekLabel}: ILI activity (${latest.total.toLocaleString()} cases) is above the alert threshold (${thresholdLabel}).`
    : `Week W${weekLabel}: ILI activity (${latest.total.toLocaleString()} cases) remains below the alert threshold (${thresholdLabel}).`;

  if (!exceeds) {
    fluAlert.classList.add("alert-ok");
  }

  fluAlertText.textContent = text;
  fluAlertChip.textContent = exceeds ? "Epidemic signal" : "Below threshold";
}

function computeSurgeSignals(dataset, year) {
  const rows = respiratoryData.weekly.filter((row) => row.dataset === dataset && row.year === year);
  const byVirus = rows.reduce((map, row) => {
    map.set(row.virus, [...(map.get(row.virus) || []), row]);
    return map;
  }, new Map());

  return Array.from(byVirus.entries())
    .map(([virus, entries]) => {
      const sorted = entries.sort((a, b) => a.week - b.week);
      const latest = sorted[sorted.length - 1];
      const previous = sorted[sorted.length - 2];
      if (!latest || !previous) {
        return { virus, label: "No recent change", change: 0, week: latest?.week ?? "–" };
      }
      const delta = latest.cases - previous.cases;
      const pct = previous.cases ? Math.round((delta / previous.cases) * 100) : 0;
      const direction = delta > 0 ? "Surging" : delta < 0 ? "Declining" : "Flat";
      return {
        virus,
        label: `${direction} (${pct >= 0 ? "+" : ""}${pct}% vs W${previous.week.toString().padStart(2, "0")})`,
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
    li.textContent = "No weekly trend data yet.";
    surgeList.appendChild(li);
    return;
  }

  signals.forEach((signal) => {
    const li = document.createElement("li");
    li.className = `trend-${signal.direction.toLowerCase()}`;
    li.innerHTML = `<div><strong>${signal.virus}</strong><span>Week ${signal.week}</span></div><span class="pill">${signal.label}</span>`;
    surgeList.appendChild(li);
  });
}

function findVariantBreakdown(dataset, year, virus) {
  const grouped = aggregateDetections();
  const influenzaRows = grouped.filter((row) => row.virus.toLowerCase().startsWith("influenza"));
  if (!influenzaRows.length) return null;

  const latestWeek = Math.max(...influenzaRows.map((r) => r.week));
  const latest = influenzaRows.filter((r) => r.week === latestWeek);
  const breakdown = latest.map((r) => ({
    lineage: r.virus.replace(/^(Influenza\s*)/i, ""),
    detections: r.detections,
  }));

  const weeks = Array.from(new Set(influenzaRows.map((r) => r.week))).sort((a, b) => a - b);
  const lineages = Array.from(new Set(influenzaRows.map((r) => r.virus))).sort();
  const series = lineages.map((lineage) => {
    const points = influenzaRows
      .filter((r) => r.virus === lineage)
      .reduce((acc, row) => {
        acc[row.week] = row.detections;
        return acc;
      }, {});
    return { lineage: lineage.replace(/^(Influenza\s*)/i, ""), data: weeks.map((w) => points[w] ?? null) };
  });

  return { dataset, year, virus, breakdown, week: latestWeek, weeks, series };
}

function renderVariants(dataset, year, virus) {
  const match = findVariantBreakdown(dataset, year, virus);
  variantList.innerHTML = "";
  if (variantChart) {
    variantChart.destroy();
    variantChart = null;
  }

  if (!match) {
    variantNote.textContent = "No subtype breakdown is available yet.";
    variantWeekBadge.textContent = "Latest week";
    return;
  }

  const weekLabel = `W${match.week.toString().padStart(2, "0")}`;
  variantNote.textContent = `Influenza subtypes detected in ${weekLabel}, with historical weekly totals shown below.`;
  variantWeekBadge.textContent = `Week ${weekLabel}`;

  const ordered = match.breakdown.sort((a, b) => (b.detections || 0) - (a.detections || 0));
  ordered.forEach((entry) => {
    const li = document.createElement("li");
    const suffix = entry.detections ? `${entry.detections}` : entry.share != null ? `${entry.share}%` : "";
    li.innerHTML = `<span>${entry.lineage}</span><strong>${suffix}</strong>`;
    variantList.appendChild(li);
  });

  const ctx = document.getElementById("variant-chart")?.getContext("2d");
  if (ctx && match.series.length) {
    const labels = match.weeks.map((w) => `W${w.toString().padStart(2, "0")}`);
    const palette = ["#38bdf8", "#22c55e", "#a855f7", "#f97316", "#facc15", "#64748b"];
    const datasets = match.series.map((entry, idx) => {
      const color = palette[idx % palette.length];
      return {
        label: entry.lineage,
        data: entry.data,
        borderColor: color,
        backgroundColor: color,
        tension: 0.3,
        fill: false,
        spanGaps: true,
        pointRadius: 3,
        pointHoverRadius: 5,
      };
    });

    variantChart = new Chart(ctx, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: "#e5e7eb" } } },
        scales: {
          x: { ticks: { color: "#9ca3af" }, grid: { display: false } },
          y: { ticks: { color: "#9ca3af" }, grid: { color: "rgba(255,255,255,0.05)" }, beginAtZero: true },
        },
      },
    });
  }
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

function renderTable(data) {
  tableBody.innerHTML = "";
  updateSortHeaders();
  const sorted = [...data].sort((a, b) => {
    const key = sortColumn === "cases" ? "cases" : "week";
    const valA = Number(a[key] ?? 0);
    const valB = Number(b[key] ?? 0);
    if (valA !== valB) {
      return (valA - valB) * (sortDirection === "asc" ? 1 : -1);
    }
    // Stable-ish fallback to week then virus for consistent ordering.
    const weekDiff = Number(a.week ?? 0) - Number(b.week ?? 0);
    if (weekDiff !== 0) return weekDiff;
    return (a.virus || "").localeCompare(b.virus || "");
  });
  const sariByWeek = (respiratoryData.sariWeekly || []).reduce((map, row) => {
    map.set(row.week, row);
    return map;
  }, new Map());
  const positivityByWeek = (respiratoryData.virologyPositivity || []).reduce((map, row) => {
    const current = map.get(row.week);
    if (!current || Number(row.positivity ?? 0) > Number(current.positivity ?? 0)) {
      map.set(row.week, row);
    }
    return map;
  }, new Map());

  sorted.forEach((row) => {
    const sari = sariByWeek.get(row.week);
    const admissionsLabel =
      sari && Number.isFinite(Number(sari.admissions)) ? Number(sari.admissions).toLocaleString() : "–";
    const icuLabel = sari && Number.isFinite(Number(sari.icu)) ? Number(sari.icu).toLocaleString() : "–";
    const pos = positivityByWeek.get(row.week);
    const posLabel =
      pos && Number.isFinite(Number(pos.positivity))
        ? `${pos.virus} (${Number(pos.positivity).toFixed(1)}%)`
        : "–";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>W${row.week.toString().padStart(2, "0")}</td>
      <td>${row.virus}</td>
      <td>${row.region}</td>
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
    .sort((a, b) => a.week - b.week);

  const labels = rows.map((d) => `W${d.week.toString().padStart(2, "0")}`);
  const values = rows.map((d) => d.cases);

  if (trendChart) trendChart.destroy();

  const seasonLabel = seasonLabels[year] || `${year} season`;
  iliYearBadge.textContent = rows.length ? seasonLabel : "Awaiting data";

  trendChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels.length ? labels : ["No data"],
      datasets: [
        {
          label: "Flu-like illness (NNGYK)",
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

function latestSari() {
  if (!respiratoryData.sariWeekly?.length) return null;
  const latest = respiratoryData.sariWeekly.reduce(
    (max, row) => (row.week > max.week ? row : max),
    { week: 0, admissions: 0, icu: 0 }
  );
  return latest;
}

function renderSariCards() {
  const latest = latestSari();
  if (!latest) {
    sariAdmissionsValue.textContent = "–";
    sariIcuValue.textContent = "–";
    sariWeekBadge.textContent = "Awaiting data";
    return;
  }
  sariAdmissionsValue.textContent = latest.admissions.toLocaleString();
  sariIcuValue.textContent = latest.icu.toLocaleString();
  sariWeekBadge.textContent = `Week W${latest.week.toString().padStart(2, "0")}`;
}

function renderSariChart() {
  const ctx = document.getElementById("sari-chart").getContext("2d");
  const rows = respiratoryData.sariWeekly?.slice().sort((a, b) => a.week - b.week) ?? [];
  const labels = rows.map((d) => `W${d.week.toString().padStart(2, "0")}`);
  const admissions = rows.map((d) => d.admissions);
  const icu = rows.map((d) => d.icu);

  if (sariChart) sariChart.destroy();

  sariChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels.length ? labels : ["No data"],
      datasets: [
        {
          label: "SARI admissions",
          data: admissions.length ? admissions : [0],
          backgroundColor: "rgba(249, 115, 22, 0.7)",
          borderColor: "#f97316",
          borderWidth: 1.5,
          borderRadius: 6,
          hoverBackgroundColor: "rgba(249, 115, 22, 0.85)",
          maxBarThickness: 26,
        },
        {
          label: "SARI ICU",
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

function renderVirology() {
  const detections = aggregateDetections(respiratoryData.virologyDetections || []);
  const positivity = respiratoryData.virologyPositivity?.slice() || [];

  const latestWeek =
    detections.length || positivity.length
      ? Math.max(0, ...detections.map((d) => d.week || 0), ...positivity.map((p) => p.week || 0))
      : "–";
  viroWeekBadge.textContent = latestWeek === "–" ? "Latest week" : `Week W${latestWeek.toString().padStart(2, "0")}`;

  viroDetectionsList.innerHTML = "";
  detections
    .filter((d) => d.week === latestWeek)
    .slice(0, 6)
    .forEach((row) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${row.virus}</span><strong>${Number(row.detections ?? 0).toLocaleString()}</strong>`;
      viroDetectionsList.appendChild(li);
    });
  if (!viroDetectionsList.children.length) {
    const li = document.createElement("li");
    li.textContent = "No detections available.";
    viroDetectionsList.appendChild(li);
  }

  viroPositivityList.innerHTML = "";
  positivity
    .filter((p) => p.week === latestWeek)
    .slice(0, 6)
    .forEach((row) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${row.virus}</span><strong>${Number(row.positivity ?? 0).toFixed(1)}%</strong>`;
      viroPositivityList.appendChild(li);
    });
  if (!viroPositivityList.children.length) {
    const li = document.createElement("li");
    li.textContent = "No positivity data available.";
    viroPositivityList.appendChild(li);
  }

  // Trend charts
  const detCtx = document.getElementById("viro-detections-chart").getContext("2d");
  const posCtx = document.getElementById("viro-positivity-chart").getContext("2d");

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
      label: virus,
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
    data: { labels: detWeeks.map((w) => `W${w.toString().padStart(2, "0")}`), datasets: detSeries },
    options: {
      responsive: true,
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
    const color = ["#a855f7", "#22d3ee", "#f97316"][idx % 3];
    const points = positivity.filter((d) => d.virus === virus).reduce((acc, row) => {
      acc[row.week] = row.positivity;
      return acc;
    }, {});
    return {
      label: `${virus} positivity`,
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
    data: { labels: posWeeks.map((w) => `W${w.toString().padStart(2, "0")}`), datasets: posSeries },
    options: {
      responsive: true,
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
    : "Latest week";

  euDetectionsList.innerHTML = "";
  detections
    .filter((d) => (hasLatestWeek ? d.week === latestWeek : false))
    .slice(0, 6)
    .forEach((row) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${row.virus}</span><strong>${Number(row.detections ?? 0).toLocaleString()}</strong>`;
      euDetectionsList.appendChild(li);
    });
  if (!euDetectionsList.children.length) {
    const li = document.createElement("li");
    li.textContent = "No detections available.";
    euDetectionsList.appendChild(li);
  }

  euPositivityList.innerHTML = "";
  positivity
    .filter((p) => (hasLatestWeek ? p.week === latestWeek : false))
    .slice(0, 6)
    .forEach((row) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${row.virus}</span><strong>${Number(row.positivity ?? 0).toFixed(1)}%</strong>`;
      euPositivityList.appendChild(li);
    });
  if (!euPositivityList.children.length) {
    const li = document.createElement("li");
    li.textContent = "No positivity data available.";
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
      label: virus,
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
    data: { labels: detWeeks.map((w) => `W${w.toString().padStart(2, "0")}`), datasets: detSeries },
    options: {
      responsive: true,
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
      label: `${virus} positivity`,
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
    data: { labels: posWeeks.map((w) => `W${w.toString().padStart(2, "0")}`), datasets: posSeries },
    options: {
      responsive: true,
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
  renderTable(latestFiltered);
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
  datasetDescription.textContent = respiratoryData.datasets[dataset].description;

  renderTable(filtered);
  renderChips(filtered);
  renderLatestWeekCases(filtered);
  renderSurgeSignals(dataset, year);
  renderVariants(dataset, year, virus);
  renderLeaderAlert();
  renderEuLeaderAlert();
  renderFluAlert(dataset, year);
  renderILIChart(year);
  renderSariCards();
  renderSariChart();
  renderVirology();
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
      rows.forEach((row) => {
        weekly.push(row);
        if (Number.isFinite(row.year)) {
          years.add(row.year);
        }
        if (row.virus) {
          viruses.add(row.virus);
        }
      });
      if (sari && sari.week) {
        const admissions = Number(sari.admissions ?? 0);
        const icu = Number(sari.icu ?? 0);
        if (Number.isFinite(admissions) || Number.isFinite(icu)) {
          sariRows.push({
            week: sari.week,
            admissions,
            icu,
          });
        }
      }
      const weekVal = entry.week || rows[0]?.week || null;
      if (viro && weekVal) {
        (viro.detections || []).forEach((d) => {
          if (d.virus && d.detections != null) {
            viroDetections.push({ week: weekVal, virus: d.virus, detections: Number(d.detections) });
          }
        });
        (viro.positivity || []).forEach((p) => {
          if (p.virus && p.positivity != null) {
            viroPositivity.push({ week: weekVal, virus: p.virus, positivity: Number(p.positivity) });
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
          respiratoryData.sariWeekly = sariRows.sort((a, b) => a.week - b.week);
        }
        if (viroDetections.length) {
          respiratoryData.virologyDetections = viroDetections.sort((a, b) => a.week - b.week);
        }
        if (viroPositivity.length) {
          respiratoryData.virologyPositivity = viroPositivity.sort((a, b) => a.week - b.week);
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
