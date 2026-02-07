import type { DataZoomComponentOption, EChartsOption, SeriesOption } from "echarts";
import type { VirologyDetectionRow, VirologyPositivityRow } from "../domain/model";
import { INFLUENZA_ALL_KEY, VIRO_ALL_KEY } from "../data/adapter";

export type UiLanguage = "en" | "hu";

interface BuildDetectionsOptionArgs {
  rows: VirologyDetectionRow[];
  selectedVirus: string;
  compact: boolean;
  weekOrder?: "season" | "numeric";
  language?: UiLanguage;
  dark?: boolean;
}

interface BuildPositivityOptionArgs {
  rows: VirologyPositivityRow[];
  compact: boolean;
  weekOrder?: "season" | "numeric";
  language?: UiLanguage;
  dark?: boolean;
}

const numberFormatter = new Intl.NumberFormat("en-US");
const percentFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

function seasonWeekIndex(week: number): number {
  return week >= 40 ? week : week + 53;
}

function seasonWeekCompare(a: number, b: number): number {
  return seasonWeekIndex(a) - seasonWeekIndex(b);
}

function numericWeekCompare(a: number, b: number): number {
  return a - b;
}

const VIRUS_LABELS_HU: Record<string, string> = {
  "ILI (flu-like illness)": "ILI (influenzaszerű megbetegedés)",
  Influenza: "Influenza",
  "Influenza A": "Influenza A",
  "Influenza B": "Influenza B",
  "Influenza A(H1N1pdm09)": "Influenza A(H1N1pdm09)",
  "Influenza A(H3)": "Influenza A(H3)",
  "Influenza A(NT)": "Influenza A(NT)",
  RSV: "RSV",
  "SARS-CoV-2": "SARS-CoV-2",
  [INFLUENZA_ALL_KEY]: "Influenza (összes)",
};

export function displayVirusLabel(virus: string, language: UiLanguage = "en"): string {
  if (language === "hu") return VIRUS_LABELS_HU[virus] ?? virus;
  if (virus === INFLUENZA_ALL_KEY) return "Influenza (all)";
  return virus;
}

function detectionColor(virus: string, index: number): string {
  const palette: Record<string, string> = {
    "SARS-CoV-2": "#22c55e",
    "Influenza A(H1N1pdm09)": "#f97316",
    "Influenza A(NT)": "#38bdf8",
    "Influenza B": "#a855f7",
    [INFLUENZA_ALL_KEY]: "#ec4899",
    RSV: "#14b8a6",
  };
  const fallback = ["#eab308", "#ef4444", "#6366f1", "#0ea5e9", "#84cc16"];
  return palette[virus] ?? fallback[index % fallback.length];
}

function positivityColor(index: number): string {
  const fallback = ["#a855f7", "#22d3ee", "#f97316", "#14b8a6", "#e11d48"];
  return fallback[index % fallback.length];
}

function buildCompactDataZoom(
  labels: string[],
  compact: boolean,
  palette: { sliderBorder: string; sliderFill: string; sliderText: string }
): DataZoomComponentOption[] | undefined {
  if (!compact || labels.length <= 12) return undefined;
  const startIndex = Math.max(0, labels.length - 12);
  return [
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
      borderColor: palette.sliderBorder,
      fillerColor: palette.sliderFill,
      moveHandleSize: 6,
      textStyle: { color: palette.sliderText },
    },
  ];
}

export function buildVirologyDetectionsOption({
  rows,
  selectedVirus,
  compact,
  weekOrder = "season",
  language = "en",
  dark = false,
}: BuildDetectionsOptionArgs): EChartsOption {
  const palette = dark
    ? {
        axisLine: "rgba(148, 163, 184, 0.45)",
        axisLabel: "#cbd5e1",
        legend: "#e2e8f0",
        grid: "rgba(148, 163, 184, 0.22)",
        sliderBorder: "rgba(148, 163, 184, 0.35)",
        sliderFill: "rgba(59, 130, 246, 0.35)",
        sliderText: "#cbd5e1",
        legendBg: "rgba(15, 23, 42, 0.82)",
        legendBorder: "rgba(148, 163, 184, 0.32)",
        legendPage: "#93c5fd",
      }
    : {
        axisLine: "rgba(15, 23, 42, 0.20)",
        axisLabel: "#334155",
        legend: "#0f172a",
        grid: "rgba(15, 23, 42, 0.14)",
        sliderBorder: "rgba(15, 23, 42, 0.18)",
        sliderFill: "rgba(37, 99, 235, 0.20)",
        sliderText: "#475569",
        legendBg: "rgba(248, 250, 252, 0.92)",
        legendBorder: "rgba(148, 163, 184, 0.38)",
        legendPage: "#1d4ed8",
      };
  const compareWeeks = weekOrder === "numeric" ? numericWeekCompare : seasonWeekCompare;
  const weeks = Array.from(new Set(rows.map((row) => row.week))).sort((a, b) => compareWeeks(a, b));
  const labels = weeks.map((week) => `W${String(week).padStart(2, "0")}`);
  const noDataLabel = language === "hu" ? "Nincs adat" : "No data";

  const viruses =
    selectedVirus === VIRO_ALL_KEY
      ? Array.from(new Set(rows.map((row) => row.virus))).sort((a, b) => {
          if (a === INFLUENZA_ALL_KEY) return -1;
          if (b === INFLUENZA_ALL_KEY) return 1;
          return a.localeCompare(b);
        })
      : [selectedVirus];

  const dataZoom = buildCompactDataZoom(labels, compact, palette);

  const series: SeriesOption[] = viruses.map((virus, idx) => {
    const map = new Map<number, number>();
    for (const row of rows) {
      if (row.virus !== virus) continue;
      map.set(row.week, row.detections);
    }
    const color = detectionColor(virus, idx);
    return {
      name: displayVirusLabel(virus, language),
      type: "line" as const,
      data: weeks.map((week) => map.get(week) ?? null),
      smooth: 0.25,
      connectNulls: false,
      symbolSize: 5,
      lineStyle: { color, width: 2.2 },
      itemStyle: { color },
    };
  });

  return {
    animation: false,
    aria: { enabled: true },
    grid: {
      top: compact ? 40 : 90,
      right: 18,
      bottom: compact && dataZoom ? 58 : 36,
      left: 48,
    },
    tooltip: {
      trigger: "axis",
      formatter: (params: unknown) => {
        const rowsForPoint = Array.isArray(params) ? params : [];
        if (!rowsForPoint.length) return "";
        const header = (rowsForPoint[0] as { axisValueLabel?: string }).axisValueLabel ?? "";
        const lines = rowsForPoint
          .map((entry) => {
            const row = entry as { marker?: string; seriesName?: string; data?: number | null };
            const value = typeof row.data === "number" && Number.isFinite(row.data) ? numberFormatter.format(row.data) : "–";
            return `${row.marker ?? ""} ${row.seriesName ?? ""}: ${value}`;
          })
          .join("<br/>");
        return `${header}<br/>${lines}`;
      },
    },
    legend: {
      show: !compact,
      type: "scroll",
      top: 4,
      left: 8,
      right: 8,
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 10,
      padding: [6, 10],
      backgroundColor: palette.legendBg,
      borderColor: palette.legendBorder,
      borderWidth: 1,
      borderRadius: 10,
      pageIconColor: palette.legendPage,
      pageIconInactiveColor: palette.axisLine,
      pageTextStyle: { color: palette.axisLabel },
      textStyle: { color: palette.legend, fontWeight: 600, fontSize: 12, lineHeight: 16 },
    },
    xAxis: {
      type: "category",
      data: labels.length ? labels : [noDataLabel],
      axisLine: { lineStyle: { color: palette.axisLine } },
      axisLabel: { color: palette.axisLabel, interval: compact ? "auto" : 0, hideOverlap: true },
    },
    yAxis: {
      type: "value",
      min: 0,
      axisLabel: { color: palette.axisLabel, formatter: (value: number) => numberFormatter.format(value) },
      splitLine: { lineStyle: { color: palette.grid } },
    },
    dataZoom,
    series,
  };
}

export function buildVirologyPositivityOption({
  rows,
  compact,
  weekOrder = "season",
  language = "en",
  dark = false,
}: BuildPositivityOptionArgs): EChartsOption {
  const palette = dark
    ? {
        axisLine: "rgba(148, 163, 184, 0.45)",
        axisLabel: "#cbd5e1",
        legend: "#e2e8f0",
        grid: "rgba(148, 163, 184, 0.22)",
        sliderBorder: "rgba(148, 163, 184, 0.35)",
        sliderFill: "rgba(59, 130, 246, 0.35)",
        sliderText: "#cbd5e1",
        legendBg: "rgba(15, 23, 42, 0.82)",
        legendBorder: "rgba(148, 163, 184, 0.32)",
        legendPage: "#93c5fd",
      }
    : {
        axisLine: "rgba(15, 23, 42, 0.20)",
        axisLabel: "#334155",
        legend: "#0f172a",
        grid: "rgba(15, 23, 42, 0.14)",
        sliderBorder: "rgba(15, 23, 42, 0.18)",
        sliderFill: "rgba(37, 99, 235, 0.20)",
        sliderText: "#475569",
        legendBg: "rgba(248, 250, 252, 0.92)",
        legendBorder: "rgba(148, 163, 184, 0.38)",
        legendPage: "#1d4ed8",
      };
  const compareWeeks = weekOrder === "numeric" ? numericWeekCompare : seasonWeekCompare;
  const weeks = Array.from(new Set(rows.map((row) => row.week))).sort((a, b) => compareWeeks(a, b));
  const labels = weeks.map((week) => `W${String(week).padStart(2, "0")}`);
  const noDataLabel = language === "hu" ? "Nincs adat" : "No data";
  const positivitySuffix = language === "hu" ? " pozitivitás" : " positivity";
  const viruses = Array.from(new Set(rows.map((row) => row.virus))).sort((a, b) => a.localeCompare(b));
  const dataZoom = buildCompactDataZoom(labels, compact, palette);

  const series: SeriesOption[] = viruses.map((virus, idx) => {
    const map = new Map<number, number>();
    for (const row of rows) {
      if (row.virus !== virus) continue;
      map.set(row.week, row.positivity);
    }
    const color = positivityColor(idx);
    return {
      name: `${displayVirusLabel(virus, language)}${positivitySuffix}`,
      type: "line" as const,
      data: weeks.map((week) => map.get(week) ?? null),
      smooth: 0.25,
      connectNulls: false,
      symbolSize: 5,
      lineStyle: { color, width: 2.2 },
      itemStyle: { color },
    };
  });

  return {
    animation: false,
    aria: { enabled: true },
    grid: {
      top: compact ? 40 : 90,
      right: 18,
      bottom: compact && dataZoom ? 58 : 36,
      left: 48,
    },
    tooltip: {
      trigger: "axis",
      formatter: (params: unknown) => {
        const rowsForPoint = Array.isArray(params) ? params : [];
        if (!rowsForPoint.length) return "";
        const header = (rowsForPoint[0] as { axisValueLabel?: string }).axisValueLabel ?? "";
        const lines = rowsForPoint
          .map((entry) => {
            const row = entry as { marker?: string; seriesName?: string; data?: number | null };
            const value = typeof row.data === "number" && Number.isFinite(row.data) ? `${percentFormatter.format(row.data)}%` : "–";
            return `${row.marker ?? ""} ${row.seriesName ?? ""}: ${value}`;
          })
          .join("<br/>");
        return `${header}<br/>${lines}`;
      },
    },
    legend: {
      show: !compact,
      type: "scroll",
      top: 4,
      left: 8,
      right: 8,
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 10,
      padding: [6, 10],
      backgroundColor: palette.legendBg,
      borderColor: palette.legendBorder,
      borderWidth: 1,
      borderRadius: 10,
      pageIconColor: palette.legendPage,
      pageIconInactiveColor: palette.axisLine,
      pageTextStyle: { color: palette.axisLabel },
      textStyle: { color: palette.legend, fontWeight: 600, fontSize: 12, lineHeight: 16 },
    },
    xAxis: {
      type: "category",
      data: labels.length ? labels : [noDataLabel],
      axisLine: { lineStyle: { color: palette.axisLine } },
      axisLabel: { color: palette.axisLabel, interval: compact ? "auto" : 0, hideOverlap: true },
    },
    yAxis: {
      type: "value",
      min: 0,
      axisLabel: { color: palette.axisLabel, formatter: (value: number) => `${value}%` },
      splitLine: { lineStyle: { color: palette.grid } },
    },
    dataZoom,
    series,
  };
}
