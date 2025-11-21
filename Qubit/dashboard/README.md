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

### European ERVISS context panes

Two small cards show EU/EEA aggregate weekly detections and test positivity for ILI/ARI virological data. To feed them with live values:

```bash
python erviss_fetch.py \
  --detections-url "<CSV download for Aggregate weekly detections>" \
  --positivity-url "<CSV download for Aggregate weekly test positivity>" \
  --output erviss_latest.json
```

- Download links are available from the ERVISS data explorer ("Virological" → "Aggregate weekly detections" / "Aggregate weekly test positivity" → Export → CSV).
- The script defaults to the EU/EEA aggregate rows; adjust `--country` or `--country-field` if the CSV uses other labels.
- The dashboard automatically falls back to sample values in `data.js` when `erviss_latest.json` is absent.

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

To keep the monitor running unattended, add a cron entry (runs every 2 hours):

```
0 */2 * * * cd /path/to/dashboard && /usr/bin/python3 nngyk_monitor.py --once >> nngyk_monitor.log 2>&1
```

The script records previously seen PDF URLs in the JSON state file so it only reports newly posted bulletins.

## Extracting structured metrics from NNGYK bulletins

Use `nngyk_extract.py` to turn a bulletin PDF into a `nngyk_latest.json` snapshot that the dashboard will auto-load (it merges into the filter dropdowns and weekly series when present alongside `index.html`).

```bash
# Ensure pdfminer is available for text extraction
python -m pip install pdfminer.six

# Convert a PDF URL (or local file) into dashboard-ready JSON
python nngyk_extract.py \
  "https://example.com/path/to/bulletin.pdf" \
  --output nngyk_latest.json \
  --save-pdf bulletin_week12.pdf
```

The helper currently looks for:
- Season context such as `2025/26` and the Hungarian `hét` label to infer the ISO week.
- Headline virological detections for **Influenza A**, **Influenza B**, **RSV**, and **SARS-CoV-2**.
- Additional sentinel metrics (ILI/ARI incidence per 100k, samples tested, lab-confirmed cases) captured into a `metrics` block for future cards.

Because the PDF layouts can change, the extractor uses regex heuristics to stay resilient. If a new bulletin layout appears, tweak the patterns in `nngyk_extract.py` and rerun to refresh `nngyk_latest.json`.
