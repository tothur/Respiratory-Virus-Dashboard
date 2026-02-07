import type { DataZoomComponentOption, EChartsOption, SeriesOption } from "echarts";
import { graphic } from "echarts";
import type { WeeklyIliPoint } from "../domain/model";

interface BuildIliTrendOptionArgs {
  points: WeeklyIliPoint[];
  threshold: number;
  compact: boolean;
  dark?: boolean;
  labels?: {
    iliCases: string;
    alertThreshold: string;
    crossing: string;
    noData: string;
    seasonStart: string;
    holidays: string;
  };
}

interface SeasonMarker {
  week: number;
  text: string;
}

const numberFormatter = new Intl.NumberFormat("en-US");

function weekLabel(week: number): string {
  return `W${String(week).padStart(2, "0")}`;
}

function findThresholdCrossing(points: WeeklyIliPoint[], threshold: number): WeeklyIliPoint | null {
  if (points.length < 2) return null;
  for (let idx = 1; idx < points.length; idx += 1) {
    if (points[idx].cases >= threshold && points[idx - 1].cases < threshold) return points[idx];
  }
  return null;
}

export function buildIliTrendOption({
  points,
  threshold,
  compact,
  dark = false,
  labels: labelsOverride,
}: BuildIliTrendOptionArgs): EChartsOption {
  const palette = dark
    ? {
        axisLine: "rgba(148, 163, 184, 0.45)",
        axisLabel: "#cbd5e1",
        legend: "#e2e8f0",
        grid: "rgba(148, 163, 184, 0.22)",
        markerLine: "rgba(148, 163, 184, 0.38)",
        markerLabel: "#cbd5e1",
        markerBg: "rgba(15, 23, 42, 0.88)",
        sliderBorder: "rgba(148, 163, 184, 0.35)",
        sliderFill: "rgba(59, 130, 246, 0.35)",
        sliderText: "#cbd5e1",
        legendBg: "rgba(15, 23, 42, 0.82)",
        legendBorder: "rgba(148, 163, 184, 0.32)",
      }
    : {
        axisLine: "rgba(15, 23, 42, 0.20)",
        axisLabel: "#334155",
        legend: "#0f172a",
        grid: "rgba(15, 23, 42, 0.14)",
        markerLine: "rgba(15, 23, 42, 0.16)",
        markerLabel: "#64748b",
        markerBg: "rgba(255, 255, 255, 0.85)",
        sliderBorder: "rgba(15, 23, 42, 0.18)",
        sliderFill: "rgba(37, 99, 235, 0.20)",
        sliderText: "#475569",
        legendBg: "rgba(248, 250, 252, 0.92)",
        legendBorder: "rgba(148, 163, 184, 0.38)",
      };
  const text = labelsOverride ?? {
    iliCases: "ILI cases",
    alertThreshold: "Alert threshold",
    crossing: "Threshold crossing",
    noData: "No data",
    seasonStart: "Season start",
    holidays: "Holiday period",
  };
  const seasonMarkers: SeasonMarker[] = [
    { week: 40, text: text.seasonStart },
    { week: 52, text: text.holidays },
    { week: 1, text: text.holidays },
  ];

  const xLabels = points.map((point) => point.label);
  const values = points.map((point) => point.cases);
  const hasData = xLabels.length > 0;
  const crossing = findThresholdCrossing(points, threshold);

  const markerLines = seasonMarkers.map((marker) => {
    const label = weekLabel(marker.week);
    if (!xLabels.includes(label)) return null;
    return { name: marker.text, xAxis: label };
  }).filter((entry): entry is { name: string; xAxis: string } => entry !== null);

  const series: SeriesOption[] = [
    {
      name: text.iliCases,
      type: "bar",
      data: hasData ? values : [0],
      barMaxWidth: 24,
      itemStyle: {
        color: new graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: dark ? "rgba(96, 165, 250, 0.96)" : "rgba(37, 99, 235, 0.95)" },
          { offset: 1, color: dark ? "rgba(96, 165, 250, 0.38)" : "rgba(147, 197, 253, 0.56)" },
        ]),
        borderColor: dark ? "rgba(191, 219, 254, 0.74)" : "rgba(29, 78, 216, 0.72)",
        borderWidth: 1,
        borderRadius: [10, 10, 3, 3],
        shadowBlur: dark ? 12 : 9,
        shadowColor: dark ? "rgba(30, 64, 175, 0.36)" : "rgba(30, 64, 175, 0.24)",
      },
      emphasis: {
        itemStyle: {
          color: new graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: dark ? "rgba(125, 211, 252, 0.98)" : "rgba(37, 99, 235, 0.98)" },
            { offset: 1, color: dark ? "rgba(96, 165, 250, 0.54)" : "rgba(147, 197, 253, 0.68)" },
          ]),
          shadowBlur: dark ? 16 : 12,
          shadowColor: dark ? "rgba(14, 116, 144, 0.42)" : "rgba(37, 99, 235, 0.28)",
        },
      },
      z: 2,
    },
    {
      name: text.alertThreshold,
      type: "line",
      data: hasData ? xLabels.map(() => threshold) : [threshold],
      symbol: "none",
      lineStyle: {
        color: "#dc2626",
        type: "dashed",
        width: 2,
      },
      markLine: markerLines.length
        ? {
            symbol: ["none", "none"],
            silent: true,
            lineStyle: {
              color: palette.markerLine,
              width: 1,
              type: "solid",
            },
            label: {
              color: palette.markerLabel,
              formatter: "{b}",
              position: "insideStartTop",
              padding: [2, 4],
              backgroundColor: palette.markerBg,
              borderRadius: 4,
            },
            data: markerLines,
          }
        : undefined,
      z: 4,
    },
  ];

  if (crossing) {
    series.push({
      name: text.crossing,
      type: "scatter",
      data: [{ value: [crossing.label, crossing.cases] }],
      symbolSize: 10,
      itemStyle: {
        color: "#dc2626",
        borderColor: "#7f1d1d",
        borderWidth: 1,
      },
      label: compact
        ? undefined
        : {
            show: true,
            position: "top",
            formatter: text.crossing,
            color: "#7f1d1d",
            fontWeight: 700,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            borderRadius: 5,
            padding: [2, 6],
          },
      z: 6,
    });
  }

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
      top: compact ? 42 : 78,
      right: 20,
      bottom: compact && dataZoom ? 58 : 36,
      left: 54,
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: unknown) => {
        const rows = Array.isArray(params) ? params : [];
        if (!rows.length) return "";
        const first = rows[0] as { axisValueLabel?: string };
        const header = first.axisValueLabel ?? "";
        const lines = rows
          .map((row) => {
            const item = row as { marker?: string; seriesName?: string; data?: number | [string, number] | null };
            const valueRaw = Array.isArray(item.data) ? item.data[1] : item.data;
            const value = typeof valueRaw === "number" && Number.isFinite(valueRaw) ? numberFormatter.format(valueRaw) : "–";
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
      data: [text.iliCases, text.alertThreshold],
      itemWidth: 14,
      itemHeight: 8,
      itemGap: 12,
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
      icon: "roundRect",
    },
    xAxis: {
      type: "category",
      data: hasData ? xLabels : [text.noData],
      axisTick: { alignWithLabel: true },
      axisLine: { lineStyle: { color: palette.axisLine } },
      axisLabel: {
        color: palette.axisLabel,
        interval: compact ? "auto" : 0,
        hideOverlap: true,
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
        lineStyle: { color: palette.grid },
      },
    },
    dataZoom,
    series,
  };
}
