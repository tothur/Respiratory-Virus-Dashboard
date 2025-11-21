import { respiratoryData } from "./data.js";

const datasetSelect = document.getElementById("dataset");
const yearSelect = document.getElementById("year");
const virusSelect = document.getElementById("virus");
const totalCases = document.getElementById("total-cases");
const peakWeek = document.getElementById("peak-week");
const datasetBadge = document.getElementById("dataset-badge");
const datasetDescription = document.getElementById("dataset-description");
const tableBody = document.getElementById("table-body");
const chipsRow = document.getElementById("chips");

let trendChart;
let regionChart;

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

function groupByRegion(data) {
  const regionMap = new Map();
  data.forEach((row) => {
    regionMap.set(row.region, (regionMap.get(row.region) || 0) + row.cases);
  });
  return Array.from(regionMap.entries()).map(([region, cases]) => ({ region, cases }));
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

function renderCharts(data) {
  const ctx = document.getElementById("trend-chart").getContext("2d");
  const regionCtx = document.getElementById("region-chart").getContext("2d");

  const sorted = [...data].sort((a, b) => a.week - b.week);
  const labels = sorted.map((d) => `W${d.week}`);
  const values = sorted.map((d) => d.cases);

  const regionData = groupByRegion(sorted);

  if (trendChart) trendChart.destroy();
  if (regionChart) regionChart.destroy();

  trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Weekly cases",
          data: values,
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

  regionChart = new Chart(regionCtx, {
    type: "bar",
    data: {
      labels: regionData.map((r) => r.region),
      datasets: [
        {
          label: "Regional cases",
          data: regionData.map((r) => r.cases),
          backgroundColor: "rgba(249, 115, 22, 0.2)",
          borderColor: "#f97316",
          borderWidth: 2,
          borderRadius: 8,
        },
      ],
    },
    options: {
      plugins: {
        legend: { labels: { color: "#e5e7eb" } },
        tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y.toLocaleString()} cases` } },
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
  renderCharts(filtered);
  renderChips(filtered);
}

function main() {
  populateFilters();
  datasetSelect.value = "NNGYK";
  yearSelect.value = respiratoryData.years[respiratoryData.years.length - 1];
  virusSelect.value = respiratoryData.viruses[0];
  applyFilters();

  [datasetSelect, yearSelect, virusSelect].forEach((el) =>
    el.addEventListener("change", applyFilters)
  );
}

main();
