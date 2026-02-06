import type { DataZoomComponentOption, EChartsOption, SeriesOption } from "echarts";
import type { WeeklyIliPoint } from "../domain/model";

interface BuildIliTrendOptionArgs {
  points: WeeklyIliPoint[];
  threshold: number;
  compact: boolean;
}

interface SeasonMarker {
  week: number;
  text: string;
}

const SEASON_MARKERS: SeasonMarker[] = [
  { week: 40, text: "Season start" },
  { week: 52, text: "Holiday period" },
  { week: 1, text: "Holiday period" },
];

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

export function buildIliTrendOption({ points, threshold, compact }: BuildIliTrendOptionArgs): EChartsOption {
  const labels = points.map((point) => point.label);
  const values = points.map((point) => point.cases);
  const hasData = labels.length > 0;
  const crossing = findThresholdCrossing(points, threshold);

  const markerLines = SEASON_MARKERS.map((marker) => {
    const label = weekLabel(marker.week);
    if (!labels.includes(label)) return null;
    return { name: marker.text, xAxis: label };
  }).filter((entry): entry is { name: string; xAxis: string } => entry !== null);

  const series: SeriesOption[] = [
    {
      name: "ILI cases",
      type: "bar",
      data: hasData ? values : [0],
      barMaxWidth: 24,
      itemStyle: {
        color: "rgba(37, 99, 235, 0.18)",
        borderColor: "#2563eb",
        borderWidth: 1.2,
        borderRadius: [6, 6, 2, 2],
      },
      emphasis: {
        itemStyle: {
          color: "rgba(37, 99, 235, 0.32)",
        },
      },
      z: 2,
    },
    {
      name: "Alert threshold",
      type: "line",
      data: hasData ? labels.map(() => threshold) : [threshold],
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
              color: "rgba(15, 23, 42, 0.16)",
              width: 1,
              type: "solid",
            },
            label: {
              color: "#64748b",
              formatter: "{b}",
              position: "insideStartTop",
              padding: [2, 4],
              backgroundColor: "rgba(255, 255, 255, 0.85)",
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
      name: "Threshold crossing",
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
            formatter: "Crossing",
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
  if (compact && labels.length > 12) {
    const startIndex = Math.max(0, labels.length - 12);
    dataZoom = [
      {
        type: "inside",
        xAxisIndex: 0,
        startValue: labels[startIndex],
        endValue: labels[labels.length - 1],
      },
      {
        type: "slider",
        xAxisIndex: 0,
        bottom: 8,
        height: 18,
        startValue: labels[startIndex],
        endValue: labels[labels.length - 1],
        brushSelect: false,
        showDataShadow: false,
        borderColor: "rgba(15, 23, 42, 0.18)",
        fillerColor: "rgba(37, 99, 235, 0.20)",
        moveHandleSize: 6,
        textStyle: {
          color: "#475569",
        },
      },
    ];
  }

  return {
    animation: false,
    aria: { enabled: true },
    grid: {
      top: compact ? 42 : 46,
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
      bottom: 2,
      data: ["ILI cases", "Alert threshold"],
      textStyle: {
        color: "#0f172a",
        fontWeight: 600,
      },
      icon: "roundRect",
    },
    xAxis: {
      type: "category",
      data: hasData ? labels : ["No data"],
      axisTick: { alignWithLabel: true },
      axisLine: { lineStyle: { color: "rgba(15, 23, 42, 0.20)" } },
      axisLabel: {
        color: "#334155",
        interval: compact ? "auto" : 0,
      },
    },
    yAxis: {
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
    dataZoom,
    series,
  };
}
