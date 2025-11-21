# Respiratory Virus Dashboard

A modern, static browser dashboard for visualizing respiratory virus trends using Hungarian NNGYK and European ERVISS/ECDC surveillance data.

## Running locally

1. Open `dashboard/index.html` directly in a modern browser, or serve the folder with any static file server.
2. Interact with the dataset, year, and virus filters to update the visuals and table.

## Connecting real data

Replace the placeholder records in `data.js` with live feeds from:
- NNGYK weekly influenza and RSV bulletin (Hungarian).
- ERVISS/ECDC respiratory virus surveillance feeds (European).

Each data row expects the shape:

```js
{
  dataset: "NNGYK" | "ERVISS",
  year: 2024,
  virus: "Influenza A",
  week: 10,
  cases: 1234,
  region: "Central"
}
```

The dashboard automatically recalculates totals, peak week, median, charts, and the table.
