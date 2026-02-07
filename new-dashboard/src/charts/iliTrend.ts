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
    weekPrefix?: string;
  };
}

interface SeasonMarker {
  week: number;
  text: string;
}

const numberFormatter = new Intl.NumberFormat("en-US");

function weekLabel(week: number, weekPrefix = "W"): string {
  const code = String(week).padStart(2, "0");
  if (weekPrefix === "W") return `W${code}`;
  return `${weekPrefix}${code}`;
}

function localizeWeekToken(token: string, weekPrefix: string): string {
  const match = /^W(\d{1,2})$/i.exec(String(token ?? "").trim());
  if (!match) return token;
  const code = String(match[1]).padStart(2, "0");
  if (weekPrefix === "W") return `W${code}`;
  return `${weekPrefix}${code}`;
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
        grid: "rgba(148, 163, 184, 0.16)",
        markerLine: "rgba(148, 163, 184, 0.38)",
        markerLabel: "#cbd5e1",
        markerBg: "rgba(15, 23, 42, 0.88)",
        currentWeekLine: "rgba(125, 211, 252, 0.55)",
        sliderBorder: "rgba(148, 163, 184, 0.35)",
        sliderFill: "rgba(59, 130, 246, 0.35)",
        sliderText: "#cbd5e1",
        legendBg: "rgba(15, 23, 42, 0.82)",
        legendBorder: "rgba(148, 163, 184, 0.32)",
        tooltipBg: "rgba(15, 23, 42, 0.96)",
        tooltipBorder: "rgba(148, 163, 184, 0.48)",
        tooltipText: "#e2e8f0",
      }
    : {
        axisLine: "rgba(15, 23, 42, 0.20)",
        axisLabel: "#334155",
        legend: "#0f172a",
        grid: "rgba(15, 23, 42, 0.1)",
        markerLine: "rgba(15, 23, 42, 0.16)",
        markerLabel: "#64748b",
        markerBg: "rgba(255, 255, 255, 0.85)",
        currentWeekLine: "rgba(37, 99, 235, 0.45)",
        sliderBorder: "rgba(15, 23, 42, 0.18)",
        sliderFill: "rgba(37, 99, 235, 0.20)",
        sliderText: "#475569",
        legendBg: "rgba(248, 250, 252, 0.92)",
        legendBorder: "rgba(148, 163, 184, 0.38)",
        tooltipBg: "rgba(15, 23, 42, 0.94)",
        tooltipBorder: "rgba(30, 41, 59, 0.24)",
        tooltipText: "#f8fafc",
      };
  const text = labelsOverride ?? {
    iliCases: "ILI cases",
    alertThreshold: "Alert threshold",
    crossing: "Threshold crossing",
    noData: "No data",
    seasonStart: "Season start",
    holidays: "Holiday period",
  };
  const weekPrefix = labelsOverride?.weekPrefix ?? "W";
  const seasonMarkers: SeasonMarker[] = [
    { week: 40, text: text.seasonStart },
    { week: 52, text: text.holidays },
    { week: 1, text: text.holidays },
  ];

  const xLabelsRaw = points.map((point) => point.label);
  const xLabels = xLabelsRaw.map((label) => localizeWeekToken(label, weekPrefix));
  const values = points.map((point) => point.cases);
  const hasData = xLabels.length > 0;
  const currentWeekLabel = hasData ? xLabels[xLabels.length - 1] : null;

  const markerLines = seasonMarkers.map((marker) => {
    const label = weekLabel(marker.week, weekPrefix);
    if (!xLabels.includes(label)) return null;
    return { name: marker.text, xAxis: label };
  }).filter((entry): entry is { name: string; xAxis: string } => entry !== null);

  const series: SeriesOption[] = [
    {
      name: text.iliCases,
      type: "line",
      data: hasData ? values : [0],
      smooth: 0.24,
      showSymbol: false,
      symbol: "circle",
      symbolSize: 7,
      lineStyle: {
        width: 3,
        color: dark ? "#7dd3fc" : "#2563eb",
        cap: "round",
      },
      areaStyle: {
        color: new graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: dark ? "rgba(125, 211, 252, 0.42)" : "rgba(59, 130, 246, 0.28)" },
          { offset: 1, color: dark ? "rgba(56, 189, 248, 0.06)" : "rgba(147, 197, 253, 0.03)" },
        ]),
      },
      emphasis: {
        focus: "series",
        lineStyle: {
          width: 3.6,
        },
      },
      markLine: currentWeekLabel
        ? {
            symbol: ["none", "none"],
            silent: true,
            lineStyle: {
              color: palette.currentWeekLine,
              width: 1.3,
              type: "dashed",
            },
            label: { show: false },
            data: [{ xAxis: currentWeekLabel }],
          }
        : undefined,
      z: 3,
    },
    {
      name: text.alertThreshold,
      type: "line",
      data: hasData ? xLabels.map(() => threshold) : [threshold],
      symbol: "none",
      itemStyle: {
        color: "#dc2626",
      },
      lineStyle: {
        color: "#dc2626",
        type: "dashed",
        width: 2,
      },
      emphasis: {
        lineStyle: {
          color: "#dc2626",
          width: 2.2,
        },
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
      z: 5,
    },
  ];

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
      axisPointer: {
        type: "line",
        lineStyle: {
          color: palette.currentWeekLine,
          type: "dashed",
          width: 1.1,
        },
      },
      backgroundColor: palette.tooltipBg,
      borderColor: palette.tooltipBorder,
      borderWidth: 1,
      textStyle: { color: palette.tooltipText, fontWeight: 600 },
      extraCssText: "box-shadow: 0 14px 30px rgba(2, 6, 23, 0.28);",
      formatter: (params: unknown) => {
        const rows = Array.isArray(params) ? params : [];
        if (!rows.length) return "";
        const first = rows[0] as { axisValueLabel?: string };
        const header = first.axisValueLabel ?? "";
        const lines = rows
          .filter((row) => {
            const item = row as { seriesName?: string };
            return item.seriesName !== text.crossing;
          })
          .map((row) => {
            const item = row as { marker?: string; seriesName?: string; data?: number | [string, number] | null };
            const valueRaw = Array.isArray(item.data) ? item.data[1] : item.data;
            const value = typeof valueRaw === "number" && Number.isFinite(valueRaw) ? numberFormatter.format(valueRaw) : "–";
            return `${item.marker ?? ""} ${item.seriesName ?? ""}: ${value}`;
          })
          .join("<br/>");
        return lines ? `${header}<br/>${lines}` : header;
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
      icon: "circle",
    },
    xAxis: {
      type: "category",
      data: hasData ? xLabels : [text.noData],
      boundaryGap: false,
      axisTick: { show: false },
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
        lineStyle: { color: palette.grid, type: [4, 5] },
      },
    },
    dataZoom,
    series,
  };
}
