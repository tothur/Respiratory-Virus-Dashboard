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
