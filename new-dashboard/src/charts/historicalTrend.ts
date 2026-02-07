import type { DataZoomComponentOption, EChartsOption } from "echarts";
import type { HistoricalMetricComparison } from "../domain/model";

interface BuildHistoricalTrendOptionArgs {
  metric: HistoricalMetricComparison;
  compareSeasonLabel: string;
  currentSeasonLabel: string;
  compact: boolean;
  dark?: boolean;
  language?: "en" | "hu";
  labels?: {
    delta: string;
    noData: string;
  };
}

const numberFormatter = new Intl.NumberFormat("en-US");

function localizeWeekToken(token: string, language: "en" | "hu"): string {
  const match = /^W(\d{1,2})$/i.exec(String(token ?? "").trim());
  if (!match) return token;
  const code = String(match[1]).padStart(2, "0");
  return language === "hu" ? `H${code}` : `W${code}`;
}

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
  language = "en",
  labels: labelsOverride,
}: BuildHistoricalTrendOptionArgs): EChartsOption {
  const palette = dark
    ? {
        axisLine: "rgba(148, 163, 184, 0.45)",
        axisLabel: "#cbd5e1",
        legend: "#e2e8f0",
        grid: "rgba(148, 163, 184, 0.16)",
        baseline: "rgba(203, 213, 225, 0.58)",
        sliderBorder: "rgba(148, 163, 184, 0.35)",
        sliderFill: "rgba(59, 130, 246, 0.35)",
        sliderText: "#cbd5e1",
        legendBg: "rgba(15, 23, 42, 0.82)",
        legendBorder: "rgba(148, 163, 184, 0.32)",
        currentWeekLine: "rgba(125, 211, 252, 0.55)",
        tooltipBg: "rgba(15, 23, 42, 0.96)",
        tooltipBorder: "rgba(148, 163, 184, 0.48)",
        tooltipText: "#e2e8f0",
      }
    : {
        axisLine: "rgba(15, 23, 42, 0.20)",
        axisLabel: "#334155",
        legend: "#0f172a",
        grid: "rgba(15, 23, 42, 0.1)",
        baseline: "rgba(15, 23, 42, 0.52)",
        sliderBorder: "rgba(15, 23, 42, 0.18)",
        sliderFill: "rgba(37, 99, 235, 0.20)",
        sliderText: "#475569",
        legendBg: "rgba(248, 250, 252, 0.92)",
        legendBorder: "rgba(148, 163, 184, 0.38)",
        currentWeekLine: "rgba(37, 99, 235, 0.45)",
        tooltipBg: "rgba(15, 23, 42, 0.94)",
        tooltipBorder: "rgba(30, 41, 59, 0.24)",
        tooltipText: "#f8fafc",
      };
  const text = labelsOverride ?? { delta: "Delta %", noData: "No data" };
  const xLabels = metric.points.map((point) => point.label);
  const previousValues = metric.points.map((point) => point.previous);
  const currentValues = metric.points.map((point) => point.current);
  const hasData = xLabels.length > 0;
  const currentWeekLabel = hasData ? xLabels[xLabels.length - 1] : null;

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
      {
        type: "slider",
        xAxisIndex: 0,
        bottom: 8,
        height: 18,
        startValue: xLabels[startIndex],
        endValue: xLabels[xLabels.length - 1],
        brushSelect: false,
        showDataShadow: false,
        borderColor: palette.sliderBorder,
        fillerColor: palette.sliderFill,
        moveHandleSize: 6,
        textStyle: {
          color: palette.sliderText,
        },
      },
    ];
  }

  return {
    animation: false,
    aria: { enabled: true },
    grid: {
      top: compact ? 36 : 72,
      right: 18,
      bottom: compact && dataZoom ? 58 : 46,
      left: 50,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: palette.tooltipBg,
      borderColor: palette.tooltipBorder,
      borderWidth: 1,
      textStyle: { color: palette.tooltipText, fontWeight: 600 },
      extraCssText: "box-shadow: 0 14px 30px rgba(2, 6, 23, 0.28);",
      formatter: (params: unknown) => {
        const rows = Array.isArray(params) ? params : [];
        if (!rows.length) return "";
        const first = rows[0] as { axisValueLabel?: string };
        const header = localizeWeekToken(first.axisValueLabel ?? "", language);
        const lines = rows
          .map((row) => {
            const item = row as { marker?: string; seriesName?: string; data?: number | null };
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
        formatter: (value: string) => localizeWeekToken(String(value), language),
      },
    },
    yAxis: {
      type: "value",
      min: 0,
      axisLabel: {
        color: palette.axisLabel,
        formatter: (value: number) => numberFormatter.format(value),
      },
      splitLine: {
        lineStyle: { color: palette.grid, type: [4, 5] },
      },
    },
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
        markLine: currentWeekLabel
          ? {
              symbol: ["none", "none"],
              silent: true,
              lineStyle: { color: palette.currentWeekLine, width: 1.3, type: "dashed" },
              label: { show: false },
              data: [{ xAxis: currentWeekLabel }],
            }
          : undefined,
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
    ],
  };
}
