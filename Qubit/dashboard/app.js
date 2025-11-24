import { respiratoryData, seasonLabels } from "./data.js";

const yearSelect = document.getElementById("year");
const totalCases = document.getElementById("total-cases");
const peakWeek = document.getElementById("peak-week");
const datasetBadge = document.getElementById("dataset-badge");
const datasetDescription = document.getElementById("dataset-description");
const tableBody = document.getElementById("table-body");
const chipsRow = document.getElementById("chips");
const surgeList = document.getElementById("surge-list");
const variantList = document.getElementById("variant-list");
const variantNote = document.getElementById("variant-note");
const fluAlert = document.getElementById("flu-alert");
const fluAlertText = document.getElementById("flu-alert-text");
const fluAlertChip = document.getElementById("flu-alert-chip");
const iliYearBadge = document.getElementById("ili-year-badge");

const ILI_THRESHOLD = 2000;
const DEFAULT_VIRUS = "ILI (flu-like illness)";
const DATASET = "NNGYK";

let trendChart;

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
  const text = exceeds
    ? `Week W${weekLabel}: ILI activity (${latest.total.toLocaleString()} cases) is above the alert threshold (${ILI_THRESHOLD}).`
    : `Week W${weekLabel}: ILI activity (${latest.total.toLocaleString()} cases) remains below the alert threshold (${ILI_THRESHOLD}).`;

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
    .filter((row) => row.dataset === DATASET && row.year === year && row.virus === DEFAULT_VIRUS)
    .sort((a, b) => a.week - b.week);

  const labels = rows.map((d) => `W${d.week.toString().padStart(2, "0")}`);
  const values = rows.map((d) => d.cases);

  if (trendChart) trendChart.destroy();

  const seasonLabel = seasonLabels[year] || `${year} season`;
  iliYearBadge.textContent = rows.length ? seasonLabel : "Awaiting data";

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

async function loadNNGYKData() {
  try {
    const response = await fetch("./nngyk_all.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const parsed = await response.json();
    if (!Array.isArray(parsed)) throw new Error("Unexpected payload");

    const weekly = [];
    const years = new Set();

    parsed.forEach((entry) => {
      const rows = entry?.payload?.weekly || [];
      rows.forEach((row) => {
        weekly.push(row);
        years.add(row.year);
      });
    });

    if (weekly.length) {
      const aggregated = new Map();
      weekly.forEach((row) => {
        const key = `${row.year}-${row.week}`;
        const current = aggregated.get(key) || {
          dataset: DATASET,
          year: row.year,
          week: row.week,
          virus: DEFAULT_VIRUS,
          cases: 0,
          region: "National",
        };
        current.cases += Number(row.cases ?? 0);
        aggregated.set(key, current);
      });

      respiratoryData.weekly = Array.from(aggregated.values()).sort((a, b) => a.week - b.week);
      respiratoryData.viruses = [DEFAULT_VIRUS];
      respiratoryData.years = Array.from(years).sort();
      respiratoryData.datasets.NNGYK.description = "Structured from parsed NNGYK bulletins (latest run).";
      console.info(`Loaded ${weekly.length} NNGYK rows from nngyk_all.json (aggregated to ILI view)`);
    } else {
      console.warn("nngyk_all.json loaded but no weekly rows found");
    }
  } catch (error) {
    console.warn("Falling back to bundled sample NNGYK data", error);
  }
}

async function main() {
  await loadNNGYKData();
  populateFilters();

  const fallbackYear = respiratoryData.years[respiratoryData.years.length - 1];
  const latestNNGYKYear =
    Math.max(
      ...respiratoryData.weekly.filter((row) => row.dataset === DATASET).map((row) => row.year),
      fallbackYear
    ) || fallbackYear;

  yearSelect.value = latestNNGYKYear;

  applyFilters();

  yearSelect.addEventListener("change", applyFilters);
}

main();
