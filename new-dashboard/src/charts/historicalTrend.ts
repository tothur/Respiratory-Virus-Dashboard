import type { DataZoomComponentOption, EChartsOption } from "echarts";
import type { HistoricalMetricComparison } from "../domain/model";

interface BuildHistoricalTrendOptionArgs {
  metric: HistoricalMetricComparison;
  compareSeasonLabel: string;
  currentSeasonLabel: string;
  compact: boolean;
  dark?: boolean;
  labels?: {
    delta: string;
    noData: string;
  };
}

const numberFormatter = new Intl.NumberFormat("en-US");

export function formatSignedPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "–";
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

export function buildHistoricalTrendOption({
  metric,
  compareSeasonLabel,
  currentSeasonLabel,
  compact,
  dark = false,
  labels: labelsOverride,
}: BuildHistoricalTrendOptionArgs): EChartsOption {
  const palette = dark
    ? {
        axisLine: "rgba(148, 163, 184, 0.45)",
        axisLabel: "#cbd5e1",
        legend: "#e2e8f0",
        grid: "rgba(148, 163, 184, 0.22)",
        baseline: "rgba(203, 213, 225, 0.58)",
        legendBg: "rgba(15, 23, 42, 0.82)",
        legendBorder: "rgba(148, 163, 184, 0.32)",
      }
    : {
        axisLine: "rgba(15, 23, 42, 0.20)",
        axisLabel: "#334155",
        legend: "#0f172a",
        grid: "rgba(15, 23, 42, 0.14)",
        baseline: "rgba(15, 23, 42, 0.52)",
        legendBg: "rgba(248, 250, 252, 0.92)",
        legendBorder: "rgba(148, 163, 184, 0.38)",
      };
  const text = labelsOverride ?? { delta: "Delta %", noData: "No data" };
  const xLabels = metric.points.map((point) => point.label);
  const previousValues = metric.points.map((point) => point.previous);
  const currentValues = metric.points.map((point) => point.current);
  const deltaValues = metric.points.map((point) => point.deltaPercent);
  const hasData = xLabels.length > 0;

  let dataZoom: DataZoomComponentOption[] | undefined;
  if (compact && xLabels.length > 12) {
    const startIndex = Math.max(0, xLabels.length - 12);
    dataZoom = [
      {
        type: "inside",
        xAxisIndex: 0,
        startValue: xLabels[startIndex],
        endValue: xLabels[xLabels.length - 1],
      },
    ];
  }

  return {
    animation: false,
    aria: { enabled: true },
    grid: {
      top: compact ? 36 : 72,
      right: 54,
      bottom: compact ? 26 : 46,
      left: 50,
    },
    tooltip: {
      trigger: "axis",
      formatter: (params: unknown) => {
        const rows = Array.isArray(params) ? params : [];
        if (!rows.length) return "";
        const first = rows[0] as { axisValueLabel?: string };
        const header = first.axisValueLabel ?? "";
        const lines = rows
          .map((row) => {
            const item = row as {
              marker?: string;
              seriesName?: string;
              data?: number | null;
              seriesIndex?: number;
            };
            if (item.seriesIndex === 2) {
              return `${item.marker ?? ""} ${item.seriesName ?? ""}: ${formatSignedPercent(
                typeof item.data === "number" ? item.data : null
              )}`;
            }
            const value = typeof item.data === "number" && Number.isFinite(item.data) ? numberFormatter.format(item.data) : "–";
            return `${item.marker ?? ""} ${item.seriesName ?? ""}: ${value}`;
          })
          .join("<br/>");
        return `${header}<br/>${lines}`;
      },
    },
    legend: {
      show: !compact,
      top: 2,
      left: 8,
      right: 8,
      itemWidth: 12,
      itemHeight: 8,
      itemGap: 10,
      padding: [6, 10],
      backgroundColor: palette.legendBg,
      borderColor: palette.legendBorder,
      borderWidth: 1,
      borderRadius: 10,
      textStyle: {
        color: palette.legend,
        fontSize: 12,
        lineHeight: 16,
        fontWeight: 600,
      },
    },
    xAxis: {
      type: "category",
      data: hasData ? xLabels : [text.noData],
      axisLine: { lineStyle: { color: palette.axisLine } },
      axisLabel: {
        color: palette.axisLabel,
        interval: compact ? "auto" : 0,
        hideOverlap: true,
      },
    },
    yAxis: [
      {
        type: "value",
        min: 0,
        axisLabel: {
          color: palette.axisLabel,
          formatter: (value: number) => numberFormatter.format(value),
        },
        splitLine: {
          lineStyle: { color: palette.grid },
        },
      },
      {
        type: "value",
        position: "right",
        axisLabel: {
          color: palette.axisLabel,
          formatter: (value: number) => `${value}%`,
        },
        splitLine: {
          show: false,
        },
      },
    ],
    dataZoom,
    series: [
      {
        name: compareSeasonLabel,
        type: "line",
        data: hasData ? previousValues : [null],
        smooth: 0.25,
        connectNulls: false,
        symbolSize: 5,
        lineStyle: {
          color: palette.baseline,
          width: 2,
        },
        itemStyle: {
          color: palette.baseline,
        },
      },
      {
        name: currentSeasonLabel,
        type: "line",
        data: hasData ? currentValues : [null],
        smooth: 0.25,
        connectNulls: false,
        symbolSize: 5,
        lineStyle: {
          color: "#2563eb",
          width: 2.4,
        },
        itemStyle: {
          color: "#2563eb",
        },
      },
      {
        name: text.delta,
        type: "line",
        yAxisIndex: 1,
        data: hasData ? deltaValues : [null],
        smooth: 0.2,
        connectNulls: false,
        symbolSize: 0,
        lineStyle: {
          color: "#dc2626",
          width: 2,
          type: "dashed",
        },
        itemStyle: {
          color: "#dc2626",
        },
      },
    ],
  };
}
