# Respiratory Virus Dashboard

A modern, static browser dashboard for visualizing Hungarian NNGYK flu-like illness (ILI) trends. The page highlights weekly surges, totals, and (when provided) variant/lineage shares for the selected season.

## What you see on the page

- **Sticky header + filter:** Top bar with title and season selector plus quick badges.
- **ILI alert:** Color-coded alert banner when the latest ILI total exceeds the threshold.
- **Metric cards:** Totals (cases, peak week, median) and a “rising vs easing” surge callout.
- **Surge + variant panels:** Highlights which pathogens are surging or easing; lineage pane shows data when provided.
- **ILI trend chart:** Weekly ILI curve for the selected season.
- **Accessible data table:** Full record list with sorting and filter-aware totals.

Open `index.html` in a browser to see the full layout with the bundled 2024/2025 samples, including current-season ILI and multi-pathogen European positivity lines.

## Running locally

1. Open `dashboard/index.html` directly in a modern browser, or serve the folder with any static file server.
2. Select the season to update the visuals and table. The ILI chart is pinned to NNGYK data for the selected season (2025/2026 sample provided, or parsed PDFs if `nngyk_all.json` exists).

## Connecting real data

Replace the placeholder records in `data.js` (or drop a generated `nngyk_all.json`) with live NNGYK data from the weekly bulletin parser.

Each data row expects the shape:

```js
{
  dataset: "NNGYK",
  year: 2025,
  virus: "ILI (flu-like illness)",
  week: 46,
  cases: 1234,
  region: "National"
}
```

The dashboard automatically recalculates totals, peak week, median, and the ILI trend chart.

### Seasonal influenza alerting

The dashboard computes the latest ILI total for the selected season. If the most recent week exceeds the default alert threshold of 2,000 cases, a warning banner appears above the metric cards. Adjust the threshold in `app.js` (`ILI_THRESHOLD`) to match official guidance.

## Feature ideas you can add next

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
