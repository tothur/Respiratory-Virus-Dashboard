# Respiratory Virus Dashboard

A modern, static browser dashboard for visualizing respiratory virus trends using Hungarian NNGYK and European ERVISS/ECDC surveillance data.

The page highlights weekly surges, total cases, and (when provided) variant/lineage shares for the selected pathogen. A seasonal influenza alert lets you know when combined flu detections cross an epidemic threshold. Dedicated charts contrast NNGYK flu-like illness (ILI) trends with Europe-wide influenza, RSV, and COVID-19 test positivity.

## What you see on the page

- **Sticky header + filters:** Top bar with title, season filter, dataset/virus selector, and quick badges for surge signals.
- **Epidemic alert:** A color-coded flu alert banner that appears when the latest combined influenza A/B total exceeds the configured threshold.
- **Metric cards:** A grid of totals (cases, peak week, median, positivity) and a “rising vs easing” surge callout for the current filter.
- **Surge + variant panels:** Left column highlights which pathogens are surging or easing; right column shows variant/lineage shares when provided in the data.
- **European context cards:** Two small summary panes for ERVISS EU/EEA aggregate weekly detections and test positivity (influenza, RSV, SARS-CoV-2).
- **Side-by-side trend charts:** Left: NNGYK ILI weekly trend for the selected season. Right: ERVISS EU/EEA positivity trend plotting influenza, RSV, and COVID-19 on the same axes.
- **Accessible data table:** Full record list with sorting and filter-aware totals beneath the charts.

Open `index.html` in a browser to see the full layout with the bundled 2024/2025 samples, including current-season ILI and multi-pathogen European positivity lines.

## Running locally

1. Open `dashboard/index.html` directly in a modern browser, or serve the folder with any static file server.
2. Interact with the dataset, year, and virus filters to update the visuals and table. The ILI chart is pinned to NNGYK data for the selected season (2024/2025 samples provided).

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

The dashboard automatically recalculates totals, peak week, median, ILI trend chart, and the table.

### European ERVISS context panes

Two small cards show EU/EEA aggregate weekly detections and test positivity for ILI/ARI virological data (influenza, RSV, SARS-CoV-2). To feed them with live values:

```bash
python erviss_fetch.py \
  --detections-url "<CSV download for Aggregate weekly detections>" \
  --positivity-url "<CSV download for Aggregate weekly test positivity>" \
  --output erviss_latest.json
```

- Download links are available from the ERVISS data explorer ("Virological" → "Aggregate weekly detections" / "Aggregate weekly test positivity" → Export → CSV).
- The script defaults to the EU/EEA aggregate rows; adjust `--country` or `--country-field` if the CSV uses other labels.
- The dashboard automatically falls back to sample values in `data.js` when `erviss_latest.json` is absent.

Tips for reliable ERVISS pulls:
- Use the "Copy link" option in the CSV export menu so the script can download directly without manual steps.
- Keep the default `--country EU/EEA` to mirror Europe-wide trends; switch it to specific ISO-like codes if you want country-level context instead.
- Schedule the script weekly (e.g., via cron) to keep the European cards aligned with the latest published week.

### Seasonal influenza alerting

The dashboard computes the latest combined influenza A and B totals for the selected dataset/year. If the most recent week exceeds the default epidemic threshold of 2,000 cases, a warning banner appears above the metric cards. Adjust the threshold in `app.js` (`INFLUENZA_THRESHOLD`) to match official national guidance.

## Feature ideas you can add next

- **Live ERVISS fetch on load:** Call `erviss_fetch.py` from a small wrapper endpoint or a scheduled job that drops `erviss_latest.json` so the dashboard always opens on fresh European numbers.
- **Auto-refreshing NNGYK data:** Parse newly downloaded PDFs into structured weekly records and merge them into `data.js` (or a JSON feed) so ILI trends update without manual edits.
- **Hover comparisons:** Add chart tooltips that show week-over-week deltas and the previous season’s value for the same week to spotlight unusual jumps.
- **Print/export mode:** Provide a “Download snapshot” button that exports the current filters into a PDF (using `window.print` or a client-side PDF library) for briefing packets.
- **Mobile-first refinements:** Introduce a single-column layout breakpoint for the cards/charts and larger touch targets on filters to keep the view readable on phones.

## Monitoring NNGYK PDF bulletins

Use `nngyk_monitor.py` to watch the Légúti Figyelőszolgálat adatai page for new PDF uploads:

```bash
python nngyk_monitor.py --once  # single check, prints new links and saves state to nngyk_seen.json
python nngyk_monitor.py         # continuous check every 120 minutes
```

Customize the polling cadence and state file location if you prefer:

```bash
python nngyk_monitor.py --interval-minutes 180 --state-file /var/tmp/nngyk_seen.json
```

Newly detected PDFs are saved into `nngyk_pdfs/` by default. Override with `--download-dir /path/to/folder` if you want them somewhere else.

If the season page lists “Download” links without a `.pdf` filename, the monitor still picks them up by matching the download handler URLs (look for `download=` or `format=pdf`).

To keep the monitor running unattended, add a cron entry (runs every 2 hours):

```
0 */2 * * * cd /path/to/dashboard && /usr/bin/python3 nngyk_monitor.py --once >> nngyk_monitor.log 2>&1
```

On macOS you can also keep it alive in a terminal without cron:

```bash
cd /path/to/dashboard
nohup python nngyk_monitor.py --interval-minutes 360 > ~/Library/Logs/nngyk_monitor.log 2>&1 &
disown
```

This keeps checking every 6 hours (tweak the interval to once or twice per week) and writes new PDFs to `nngyk_pdfs/`. The script records previously seen PDF URLs in the JSON state file so it only reports newly posted bulletins.
