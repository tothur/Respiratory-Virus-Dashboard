# Respiratory Virus Dashboard

A modern, static browser dashboard for visualizing Hungarian NNGYK flu-like illness (ILI), SARI, and virology trends with EU/EEA ERVISS context. The page includes bilingual UI and theme controls alongside weekly signals, alerts, and trend charts.

Live dashboard: https://tothur.github.io/Respiratory-Virus-Dashboard/

## What you see on the page

- **Header controls:** Theme, language, and season selector.
- **Alerts:** ILI threshold status plus leading virus by positivity (Hungary and EU/EEA).
- **Season at a glance:** Peak vs latest, 3-week slope, WoW change, season phase, season-to-date burden, and severity ratios.
- **Metric cards:** Total cases, peak week, latest week cases, SARI admissions, and SARI ICU.
- **Weekly trend signals:** Which pathogens are surging or easing.
- **ILI + SARI trend charts:** Weekly ILI curve and SARI admissions/ICU load.
- **Historical comparisons:** Prior-season vs current-season charts (when multiple seasons are available).
- **Virology panels:** Hungary sentinel detections/positivity with pathogen picker, plus EU/EEA detections and positivity.
- **Accessible data table:** Full record list with sorting and context columns.

Open `index.html` in a browser to see the full layout with the bundled sample; if `nngyk_all.json` exists, it replaces the sample with parsed bulletin data.  
Hungarian UI: open `index.html?lang=hu` (or `index.hu.html`, which redirects with the same language toggle).  
If `erviss_data/erviss_sari.json` exists, EU/EEA detection and positivity panels will populate automatically.

## Running locally

1. Open `index.html` directly in a modern browser, or serve the folder with any static file server.
2. Select the season to update the visuals and table. The ILI chart and Season at a glance card are pinned to NNGYK data for the selected season (2025/2026 sample provided, or parsed PDFs if `nngyk_all.json` exists).

## Parallel Next-Gen App (Phase 1F)

A new React + TypeScript + Vite scaffold is available in `new-dashboard/`.  
It is intentionally isolated so the current dashboard keeps running unchanged.

```bash
cd new-dashboard
npm install
npm run dev
```

See `new-dashboard/README.md` for details.

## Serving over HTTP

If you prefer hitting the dashboard via `http://localhost:8000`, you can serve the repo root with Python’s built-in static server:

```bash
cd /workspaces/Respiratory-Virus-Dashboard
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8000/index.html` in your browser. Any updated `nngyk_all.json` or `erviss_data/erviss_sari.json` files will be read on refresh.

## Connecting real data (one-shot or continuous)

Use the combined agent to monitor, download, and extract PDFs into the dashboard JSON:

```bash
# one-off: fetch new PDFs (or all with --sync-all) and extract to nngyk_all.json (+ ERVISS into erviss_data/)
python3 nngyk_agent.py --once

# continuous: poll every 3 hours (default) and include ERVISS EU/EEA virology
python3 nngyk_agent.py --interval-hours 3

# force re-download all listed PDFs before extracting
python3 nngyk_agent.py --sync-all --once

# CI-friendly: merge only newly downloaded PDFs into an existing nngyk_all.json
# (useful when you don't persist the nngyk_pdfs/ folder between runs)
python3 nngyk_agent.py --once --incremental
```

Outputs:
- PDFs saved to `nngyk_pdfs/`
- Parsed weekly data saved to `nngyk_all.json` (consumed automatically by the dashboard)
- State of seen URLs kept in `nngyk_seen.json`
- EU/EEA ERVISS SARI virological snapshot saved to `erviss_data/erviss_sari.json` (fetched each run, disable with `--skip-erviss`; CSV copy saved alongside)

Dependencies: Python 3 + `pdfminer.six` (`python3 -m pip install --user pdfminer.six`).

### EU/EEA ERVISS SARI feed (virological detections + positivity)

The agent now also pulls weekly EU/EEA SARI virological data from the ERVISS GitHub CSV:
https://github.com/EU-ECDC/Respiratory_viruses_weekly_data/blob/main/data/SARITestsDetectionsPositivity.csv

You can run it standalone if you only need the EU feed:

```bash
python3 erviss_sari_fetch.py \
  --url https://raw.githubusercontent.com/EU-ECDC/Respiratory_viruses_weekly_data/main/data/SARITestsDetectionsPositivity.csv \
  --output erviss_data/erviss_sari.json \
  --csv-copy erviss_data/SARITestsDetectionsPositivity.csv
```

Rows kept: indicator starts with `SARI virological` and country is `EU/EEA` (all viruses, per week/year). The dashboard automatically consumes `erviss_sari.json` for the sentinel detections/positivity panels and the leading-virus alert.

Shape of each row in `nngyk_all.json` payload:

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

The dashboard automatically recalculates totals, season-at-a-glance metrics, and all ILI/SARI charts when `nngyk_all.json` is present.

### Seasonal influenza alerting

The dashboard computes the latest ILI total for the selected season. If the most recent week exceeds the default alert threshold of 28,900 cases (≈289/100k for a ~10M population), a warning banner appears above the metric cards. Adjust the threshold in `app.js` (`ILI_THRESHOLD`) to match official guidance.

## Background scheduling

- macOS (simple terminal background):  
  `nohup python3 nngyk_agent.py --interval-hours 3 > ~/nngyk_agent.log 2>&1 &`

- Cron (Ubuntu/server): add an entry such as  
  `0 */3 * * * cd /path/to/dashboard && /usr/bin/python3 nngyk_agent.py --once >> /var/log/nngyk_agent.log 2>&1`

- systemd timer: point the service to run `nngyk_agent.py --once` every 3 hours and keep state/output in the project directory.

## Feature ideas you can add next

- **Hover comparisons:** Add chart tooltips that show week-over-week deltas and the previous season’s value for the same week to spotlight unusual jumps.
- **Print/export mode:** Provide a “Download snapshot” button that exports the current filters into a PDF (using `window.print` or a client-side PDF library) for briefing packets.
- **Mobile-first refinements:** Introduce a single-column layout breakpoint for the cards/charts and larger touch targets on filters to keep the view readable on phones.
