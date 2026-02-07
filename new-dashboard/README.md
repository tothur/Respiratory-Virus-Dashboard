# New Dashboard (Phase 1F)

This folder contains a parallel React + TypeScript + Vite scaffold for the next dashboard engine.

## Goals of this phase

- Keep the current legacy dashboard (`index.html` + `app.js`) fully intact.
- Establish a typed frontend foundation.
- Add a data adapter that reads the existing legacy source (`../data.js`) through runtime validation.
- Render first charts with ECharts in a separate app shell.
- Migrate the ILI trend chart to production-style behavior (threshold line, seasonal markers, threshold crossing marker, compact/mobile zoom).
- Add historical comparison charts (ILI, SARI admissions, SARI ICU) with current vs previous season and delta series.
- Load runtime bulletin extraction (`nngyk_all.json`) with safe fallback to bundled sample data.
- Add sentinel virology module (detections + positivity trends, latest-week summary, virus filter).
- Add EU/EEA ERVISS virology module (detections + positivity trends and latest-week summaries).

## Run (when Node.js is available)

```bash
cd new-dashboard
npm install
npm run dev
```

Then open the local URL shown by Vite (typically `http://localhost:5173`).

## Current structure

- `src/data/contracts.ts`: runtime schemas for legacy payload validation.
- `src/data/adapter.ts`: maps legacy payload into typed view model.
- `src/data/runtime-source.ts`: runtime loader that prefers `nngyk_all.json` and falls back to bundled sample.
- `src/charts/iliTrend.ts`: ILI chart option builder with threshold + marker logic.
- `src/charts/historicalTrend.ts`: historical comparison chart builder with dual-axis delta overlay.
- `src/charts/virologyTrend.ts`: sentinel virology detections and positivity option builders.
- `src/app/App.tsx`: app shell with season controls, sentinel + EU/EEA virology modules, threshold signal, and historical comparisons.
- `src/components/EChartsPanel.tsx`: reusable ECharts wrapper.

## Notes

- The legacy dashboard remains unchanged and continues to run from the repo root.
- This phase is intentionally additive; no routing/cutover yet.
- Runtime load order:
  1. `./nngyk_all.json` and `./erviss_data/erviss_sari.json` (or root variants)
  2. Vite dev `@fs` path (workspace root files)
  3. bundled import alias fallback
