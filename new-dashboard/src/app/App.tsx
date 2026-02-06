import { useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import { buildDashboardSnapshot } from "../data/adapter";
import { buildIliTrendOption } from "../charts/iliTrend";
import { buildHistoricalTrendOption, formatSignedPercent } from "../charts/historicalTrend";
import { EChartsPanel } from "../components/EChartsPanel";

function formatWeek(week: number | null): string {
  if (typeof week !== "number" || !Number.isFinite(week)) return "-";
  return `W${String(week).padStart(2, "0")}`;
}

function useCompactViewport(maxWidth = 820): boolean {
  const query = `(max-width: ${maxWidth}px)`;
  const [compact, setCompact] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setCompact(event.matches);
    setCompact(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return compact;
}

export function App() {
  const compact = useCompactViewport();
  const initial = useMemo(() => buildDashboardSnapshot(), []);
  const [selectedYear, setSelectedYear] = useState<number>(initial.selectedYear);

  const snapshot = useMemo(() => buildDashboardSnapshot(selectedYear), [selectedYear]);

  const iliOption = useMemo<EChartsOption>(
    () => buildIliTrendOption({ points: snapshot.iliSeries, threshold: snapshot.iliThreshold, compact }),
    [compact, snapshot.iliSeries, snapshot.iliThreshold]
  );

  const sariOption = useMemo<EChartsOption>(() => {
    return {
      animation: false,
      grid: { top: 40, right: 18, bottom: 34, left: 42 },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: {
        bottom: 0,
        textStyle: { color: "#0f172a", fontWeight: 600 },
      },
      xAxis: {
        type: "category",
        data: snapshot.sariSeries.map((point) => point.label),
        axisLabel: { color: "#334155" },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "#334155" },
        splitLine: { lineStyle: { color: "rgba(15, 23, 42, 0.15)" } },
      },
      series: [
        {
          name: "SARI admissions",
          type: "bar",
          data: snapshot.sariSeries.map((point) => point.admissions),
          itemStyle: { color: "rgba(37, 99, 235, 0.45)", borderColor: "#2563eb", borderWidth: 1.2 },
          barMaxWidth: 24,
        },
        {
          name: "SARI ICU",
          type: "bar",
          data: snapshot.sariSeries.map((point) => point.icu),
          itemStyle: { color: "rgba(220, 38, 38, 0.35)", borderColor: "#dc2626", borderWidth: 1.2 },
          barMaxWidth: 24,
        },
      ],
    };
  }, [snapshot.sariSeries]);

  const historicalIliOption = useMemo<EChartsOption | null>(() => {
    if (!snapshot.historical.available || !snapshot.historical.compareSeasonLabel) return null;
    return buildHistoricalTrendOption({
      metric: snapshot.historical.ili,
      compareSeasonLabel: snapshot.historical.compareSeasonLabel,
      currentSeasonLabel: snapshot.historical.currentSeasonLabel,
      compact,
    });
  }, [compact, snapshot.historical]);

  const historicalSariOption = useMemo<EChartsOption | null>(() => {
    if (!snapshot.historical.available || !snapshot.historical.compareSeasonLabel) return null;
    return buildHistoricalTrendOption({
      metric: snapshot.historical.sariAdmissions,
      compareSeasonLabel: snapshot.historical.compareSeasonLabel,
      currentSeasonLabel: snapshot.historical.currentSeasonLabel,
      compact,
    });
  }, [compact, snapshot.historical]);

  const historicalIcuOption = useMemo<EChartsOption | null>(() => {
    if (!snapshot.historical.available || !snapshot.historical.compareSeasonLabel) return null;
    return buildHistoricalTrendOption({
      metric: snapshot.historical.sariIcu,
      compareSeasonLabel: snapshot.historical.compareSeasonLabel,
      currentSeasonLabel: snapshot.historical.currentSeasonLabel,
      compact,
    });
  }, [compact, snapshot.historical]);

  const latestIliSignal = snapshot.stats.latestIliCases >= snapshot.iliThreshold ? "Above threshold" : "Below threshold";
  const signalClassName = snapshot.stats.latestIliCases >= snapshot.iliThreshold ? "signal-chip danger" : "signal-chip ok";

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Respiratory Dashboard Next</h1>
          <p className="subtitle">Phase 1C. Parallel engine with historical season comparison charts.</p>
        </div>
        <div className="controls">
          <label htmlFor="year-select">Season</label>
          <select
            id="year-select"
            value={snapshot.selectedYear}
            onChange={(event) => setSelectedYear(Number(event.target.value))}
          >
            {snapshot.availableYears.map((year) => (
              <option key={year} value={year}>
                {year}-{year + 1}
              </option>
            ))}
          </select>
        </div>
      </header>

      <section className={signalClassName} role="status" aria-live="polite">
        <h2>ILI threshold signal</h2>
        <p>
          Latest {formatWeek(snapshot.stats.latestWeek)}: {snapshot.stats.latestIliCases.toLocaleString()} cases ({latestIliSignal},{" "}
          threshold {snapshot.iliThreshold.toLocaleString()}).
        </p>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <h3>Total ILI cases</h3>
          <strong>{snapshot.stats.totalIliCases.toLocaleString()}</strong>
        </article>
        <article className="stat-card">
          <h3>Peak ILI week / cases</h3>
          <strong>
            {formatWeek(snapshot.stats.peakIliWeek)} / {snapshot.stats.peakIliCases?.toLocaleString() ?? "-"}
          </strong>
        </article>
        <article className="stat-card">
          <h3>First threshold crossing</h3>
          <strong>{formatWeek(snapshot.stats.firstIliThresholdCrossingWeek)}</strong>
        </article>
        <article className="stat-card">
          <h3>Weeks above threshold</h3>
          <strong>{snapshot.stats.weeksAboveIliThreshold.toLocaleString()}</strong>
        </article>
        <article className="stat-card">
          <h3>Latest SARI admissions / ICU</h3>
          <strong>
            {snapshot.stats.latestSariAdmissions ?? "-"} / {snapshot.stats.latestSariIcu ?? "-"}
          </strong>
        </article>
      </section>

      <section className="charts-grid">
        <EChartsPanel
          title="Influenzaszerű megbetegedések"
          subtitle={`Season ${snapshot.seasonLabel} (threshold ${snapshot.iliThreshold.toLocaleString()})`}
          option={iliOption}
        />
        <EChartsPanel
          title="SARI kórházi felvételek"
          subtitle={`Season ${snapshot.seasonLabel}`}
          option={sariOption}
        />
      </section>

      <section className="historical-section">
        <header className="historical-header">
          <h2>Historical season comparison</h2>
          {snapshot.historical.available && snapshot.historical.compareSeasonLabel ? (
            <p>
              {snapshot.historical.currentSeasonLabel} vs {snapshot.historical.compareSeasonLabel}
            </p>
          ) : (
            <p>Select a season that has a prior year available to render comparison trends.</p>
          )}
        </header>

        {snapshot.historical.available &&
        snapshot.historical.compareSeasonLabel &&
        historicalIliOption &&
        historicalSariOption &&
        historicalIcuOption ? (
          <div className="historical-grid">
            <EChartsPanel
              title="ILI comparison"
              subtitle={`Latest delta: ${formatSignedPercent(snapshot.historical.ili.latestDeltaPercent)}`}
              option={historicalIliOption}
            />
            <EChartsPanel
              title="SARI admissions comparison"
              subtitle={`Latest delta: ${formatSignedPercent(snapshot.historical.sariAdmissions.latestDeltaPercent)}`}
              option={historicalSariOption}
            />
            <EChartsPanel
              title="SARI ICU comparison"
              subtitle={`Latest delta: ${formatSignedPercent(snapshot.historical.sariIcu.latestDeltaPercent)}`}
              option={historicalIcuOption}
            />
          </div>
        ) : (
          <article className="historical-empty">
            Historical comparison is unavailable because the previous season is missing from the loaded data source.
          </article>
        )}
      </section>

      {snapshot.warnings.length ? (
        <section className="warning-panel" role="status" aria-live="polite">
          <h3>Data warnings</h3>
          <ul>
            {snapshot.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
