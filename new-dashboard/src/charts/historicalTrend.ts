import type { DataZoomComponentOption, EChartsOption } from "echarts";
import type { HistoricalMetricComparison } from "../domain/model";

interface BuildHistoricalTrendOptionArgs {
  metric: HistoricalMetricComparison;
  compareSeasonLabel: string;
  currentSeasonLabel: string;
  compact: boolean;
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
}: BuildHistoricalTrendOptionArgs): EChartsOption {
  const labels = metric.points.map((point) => point.label);
  const previousValues = metric.points.map((point) => point.previous);
  const currentValues = metric.points.map((point) => point.current);
  const deltaValues = metric.points.map((point) => point.deltaPercent);
  const hasData = labels.length > 0;

  let dataZoom: DataZoomComponentOption[] | undefined;
  if (compact && labels.length > 12) {
    const startIndex = Math.max(0, labels.length - 12);
    dataZoom = [
      {
        type: "inside",
        xAxisIndex: 0,
        startValue: labels[startIndex],
        endValue: labels[labels.length - 1],
      },
    ];
  }

  return {
    animation: false,
    aria: { enabled: true },
    grid: {
      top: 36,
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
      bottom: 2,
      textStyle: {
        color: "#0f172a",
        fontWeight: 600,
      },
    },
    xAxis: {
      type: "category",
      data: hasData ? labels : ["No data"],
      axisLine: { lineStyle: { color: "rgba(15, 23, 42, 0.20)" } },
      axisLabel: {
        color: "#334155",
        interval: compact ? "auto" : 0,
      },
    },
    yAxis: [
      {
        type: "value",
        min: 0,
        axisLabel: {
          color: "#334155",
          formatter: (value: number) => numberFormatter.format(value),
        },
        splitLine: {
          lineStyle: { color: "rgba(15, 23, 42, 0.14)" },
        },
      },
      {
        type: "value",
        position: "right",
        axisLabel: {
          color: "#334155",
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
          color: "rgba(15, 23, 42, 0.52)",
          width: 2,
        },
        itemStyle: {
          color: "rgba(15, 23, 42, 0.52)",
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
        name: "Delta %",
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
