import { respiratoryData, europeanContextSample, europeanPositivityTrendSample } from "./data.js";

const datasetSelect = document.getElementById("dataset");
const yearSelect = document.getElementById("year");
const virusSelect = document.getElementById("virus");
const totalCases = document.getElementById("total-cases");
const peakWeek = document.getElementById("peak-week");
const datasetBadge = document.getElementById("dataset-badge");
const datasetDescription = document.getElementById("dataset-description");
const tableBody = document.getElementById("table-body");
const chipsRow = document.getElementById("chips");
const euDetectionsList = document.getElementById("eu-detections");
const euPositivityList = document.getElementById("eu-positivity");
const euWeekStamp = document.getElementById("eu-week-stamp");
const euPositivityBadge = document.getElementById("eu-positivity-badge");
const surgeList = document.getElementById("surge-list");
const variantList = document.getElementById("variant-list");
const variantNote = document.getElementById("variant-note");
const fluAlert = document.getElementById("flu-alert");
const fluAlertText = document.getElementById("flu-alert-text");
const fluAlertChip = document.getElementById("flu-alert-chip");
const iliYearBadge = document.getElementById("ili-year-badge");

const INFLUENZA_THRESHOLD = 2000;
const INFLUENZA_VIRUSES = ["Influenza A", "Influenza B"];

let trendChart;
let euPositivityChart;

function populateFilters() {
  Object.entries(respiratoryData.datasets).forEach(([key, meta]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = meta.name;
    datasetSelect.appendChild(option);
  });

  respiratoryData.years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  });

  respiratoryData.viruses.forEach((virus) => {
    const option = document.createElement("option");
    option.value = virus;
    option.textContent = virus;
    virusSelect.appendChild(option);
  });
}

function currentSelection() {
  return {
    dataset: datasetSelect.value,
    year: Number(yearSelect.value),
    virus: virusSelect.value,
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

function latestInfluenzaTotals(dataset, year) {
  const rows = respiratoryData.weekly.filter(
    (row) => row.dataset === dataset && row.year === year && INFLUENZA_VIRUSES.includes(row.virus)
  );

  if (!rows.length) return null;
  const latestWeek = Math.max(...rows.map((row) => row.week));
  const latestRows = rows.filter((row) => row.week === latestWeek);
  const total = latestRows.reduce((sum, row) => sum + row.cases, 0);
  return { latestWeek, total };
}

function renderFluAlert(dataset, year) {
  const latest = latestInfluenzaTotals(dataset, year);
  if (!latest) {
    fluAlert.hidden = true;
    return;
  }

  fluAlert.hidden = false;
  fluAlert.classList.remove("alert-ok");

  const exceeds = latest.total >= INFLUENZA_THRESHOLD;
  const weekLabel = latest.latestWeek.toString().padStart(2, "0");
  const text = exceeds
    ? `Week W${weekLabel}: combined influenza A/B activity (${latest.total.toLocaleString()} cases) is above the epidemic threshold (${INFLUENZA_THRESHOLD}).`
    : `Week W${weekLabel}: influenza A/B activity (${latest.total.toLocaleString()} cases) remains below the epidemic threshold (${INFLUENZA_THRESHOLD}).`;

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
  return respiratoryData.variants.find(
    (entry) => entry.dataset === dataset && entry.year === year && entry.virus === virus
  );
}

function renderVariants(dataset, year, virus) {
  const match = findVariantBreakdown(dataset, year, virus);
  variantList.innerHTML = "";

  if (!match) {
    variantNote.textContent = "No variant lineage breakdown is available for this selection yet.";
    return;
  }

  variantNote.textContent = "Lineage share among typed detections.";
  match.breakdown
    .sort((a, b) => b.share - a.share)
    .forEach((entry) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${entry.lineage}</span><strong>${entry.share}%</strong>`;
      variantList.appendChild(li);
    });
}

function renderTable(data) {
  tableBody.innerHTML = "";
  const sorted = [...data].sort((a, b) => a.week - b.week);
  sorted.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>W${row.week.toString().padStart(2, "0")}</td>
      <td>${row.virus}</td>
      <td>${row.region}</td>
      <td>${row.cases.toLocaleString()}</td>
    `;
    tableBody.appendChild(tr);
  });
}

function renderILIChart(year) {
  const ctx = document.getElementById("ili-chart").getContext("2d");
  const rows = respiratoryData.weekly
    .filter(
      (row) =>
        row.dataset === "NNGYK" &&
        row.year === year &&
        (row.virus === "ILI (flu-like illness)" || INFLUENZA_VIRUSES.includes(row.virus))
    )
    .sort((a, b) => a.week - b.week);

  const labels = rows.map((d) => `W${d.week.toString().padStart(2, "0")}`);
  const values = rows.map((d) => d.cases);

  if (trendChart) trendChart.destroy();

  iliYearBadge.textContent = rows.length ? `${year} season` : "Awaiting data";

  trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels.length ? labels : ["No data"],
      datasets: [
        {
          label: "Flu-like illness (NNGYK)",
          data: values.length ? values : [0],
          tension: 0.35,
          fill: true,
          borderColor: "#06b6d4",
          backgroundColor: "rgba(6, 182, 212, 0.2)",
          pointRadius: 4,
          pointHoverRadius: 6,
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
        y: { ticks: { color: "#9ca3af" }, grid: { color: "rgba(255,255,255,0.05)" } },
      },
    },
  });
}

function renderEuPositivityTrend(trend) {
  const ctx = document.getElementById("eu-positivity-chart").getContext("2d");
  const hasVirusKey = trend.some((d) => d.virus);
  const palette = {
    "Influenza A/B": "#a855f7",
    RSV: "#22d3ee",
    "SARS-CoV-2": "#f97316",
  };

  const weeks = hasVirusKey
    ? Array.from(new Set(trend.map((d) => d.week))).sort((a, b) => a.localeCompare(b))
    : [...trend].sort((a, b) => a.week.localeCompare(b.week)).map((d) => d.week);

  const datasetMap = new Map();
  trend.forEach((row, idx) => {
    const virus = row.virus || "Influenza";
    if (!datasetMap.has(virus)) {
      const colorKeys = Object.keys(palette);
      const color = palette[virus] || palette[colorKeys[idx % colorKeys.length]];
      datasetMap.set(virus, { label: `${virus} positivity`, color, points: {} });
    }
    datasetMap.get(virus).points[row.week] = row.positivity;
  });

  if (euPositivityChart) euPositivityChart.destroy();

  euPositivityBadge.textContent = weeks.length ? `${weeks[weeks.length - 1]} latest` : "Awaiting data";

  const datasets = weeks.length
    ? Array.from(datasetMap.entries()).map(([virus, { label, color, points }]) => ({
        label,
        data: weeks.map((week) => points[week] ?? null),
        tension: 0.32,
        fill: false,
        borderColor: color,
        backgroundColor: color,
        pointRadius: 3,
        pointHoverRadius: 5,
      }))
    : [
        {
          label: "EU/EEA test positivity",
          data: [0],
          tension: 0.32,
          fill: false,
          borderColor: palette["Influenza A/B"],
          backgroundColor: palette["Influenza A/B"],
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ];

  euPositivityChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: weeks.length ? weeks : ["No data"],
      datasets,
    },
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
        x: { ticks: { color: "#9ca3af", maxRotation: 0 }, grid: { display: false } },
        y: { ticks: { color: "#9ca3af", callback: (v) => `${v}%` }, grid: { color: "rgba(255,255,255,0.05)" } },
      },
    },
  });
}

function applyFilters() {
  const { dataset, year, virus } = currentSelection();
  const filtered = respiratoryData.weekly.filter(
    (row) => row.dataset === dataset && row.year === year && row.virus === virus
  );

  const { total, peakWeek: peak } = summarize(filtered);
  totalCases.textContent = total.toLocaleString();
  peakWeek.textContent = peak;
  datasetBadge.textContent = respiratoryData.datasets[dataset].name;
  datasetDescription.textContent = respiratoryData.datasets[dataset].description;

  renderTable(filtered);
  renderChips(filtered);
  renderSurgeSignals(dataset, year);
  renderVariants(dataset, year, virus);
  renderFluAlert(dataset, year);
  renderILIChart(year);
}

function renderEuropeanContext(context) {
  const detectionsWeek = context.detections?.[0]?.week ?? "–";
  const positivityWeek = context.positivity?.[0]?.week ?? "–";
  const effectiveWeek = detectionsWeek !== "–" ? detectionsWeek : positivityWeek;
  euWeekStamp.textContent = effectiveWeek === "–" ? "Latest ISO week" : effectiveWeek;

  euDetectionsList.innerHTML = "";
  context.detections
    .slice(0, 4)
    .forEach((row) => {
      const li = document.createElement("li");
      const detections = Number(row.detections ?? 0);
      const formatted = Number.isFinite(detections)
        ? detections.toLocaleString()
        : (row.detections ?? "");
      li.innerHTML = `<span>${row.virus}</span><strong>${formatted}</strong>`;
      euDetectionsList.appendChild(li);
    });

  euPositivityList.innerHTML = "";
  context.positivity
    .slice(0, 4)
    .forEach((row) => {
      const li = document.createElement("li");
      const tests = row.tests ? ` · ${Number(row.tests).toLocaleString()} tests` : "";
      const positivity = Number(row.positivity ?? 0);
      const formattedPos = Number.isFinite(positivity)
        ? positivity.toFixed(1)
        : row.positivity ?? "";
      li.innerHTML = `<span>${row.virus}</span><strong>${formattedPos}%${tests}</strong>`;
      euPositivityList.appendChild(li);
    });

  const positivityTrend = context.positivityTrend?.length
    ? context.positivityTrend
    : europeanPositivityTrendSample;
  renderEuPositivityTrend(positivityTrend);
}

async function loadERVISSContext() {
  try {
    const response = await fetch("./erviss_latest.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const json = await response.json();
    if (!json.detections || !json.positivity) throw new Error("Missing keys");
    return json;
  } catch (error) {
    console.warn("Falling back to sample ERVISS context", error);
    return europeanContextSample;
  }
}

async function main() {
  populateFilters();
  datasetSelect.value = "NNGYK";
  yearSelect.value = respiratoryData.years[respiratoryData.years.length - 1];
  virusSelect.value = "ILI (flu-like illness)";
  applyFilters();

  [datasetSelect, yearSelect, virusSelect].forEach((el) =>
    el.addEventListener("change", applyFilters)
  );

  const context = await loadERVISSContext();
  renderEuropeanContext(context);
}

main();
