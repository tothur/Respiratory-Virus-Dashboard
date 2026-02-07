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

function formatWeekLabel(week: number, language: UiLanguage): string {
  const code = String(week).padStart(2, "0");
  return language === "hu" ? `H${code}` : `W${code}`;
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

type PathogenFamily = "influenza" | "sarscov2" | "rsv" | "hmpv" | "other";

const FAMILY_SERIES_COLORS: Record<Exclude<PathogenFamily, "other">, { light: string; dark: string }> = {
  influenza: { light: "#ec4899", dark: "#f472b6" },
  sarscov2: { light: "#2563eb", dark: "#60a5fa" },
  rsv: { light: "#14b8a6", dark: "#2dd4bf" },
  hmpv: { light: "#f97316", dark: "#fb923c" },
};

const OTHER_SERIES_COLORS = {
  light: ["#8b5cf6", "#0ea5e9", "#ef4444", "#84cc16", "#f59e0b"],
  dark: ["#a78bfa", "#38bdf8", "#f87171", "#a3e635", "#fbbf24"],
};

function hashKey(value: string): number {
  let hash = 0;
  for (let idx = 0; idx < value.length; idx += 1) {
    hash = (hash * 31 + value.charCodeAt(idx)) >>> 0;
  }
  return hash;
}

function resolvePathogenFamily(virus: string | null | undefined): PathogenFamily {
  const normalized = String(virus ?? "").trim().toLowerCase();
  if (!normalized) return "other";
  if (
    normalized === INFLUENZA_ALL_KEY.toLowerCase() ||
    normalized.includes("influenza") ||
    normalized.includes("flu-like") ||
    normalized.startsWith("ili")
  ) {
    return "influenza";
  }
  if (normalized.includes("sars") || normalized.includes("cov")) return "sarscov2";
  if (/\brsv\b/.test(normalized)) return "rsv";
  if (normalized.includes("hmpv") || normalized.includes("metapneumo")) return "hmpv";
  return "other";
}

function pathogenSeriesColor(virus: string | null | undefined, dark = false): string {
  const family = resolvePathogenFamily(virus);
  if (family !== "other") {
    const palette = FAMILY_SERIES_COLORS[family];
    return dark ? palette.dark : palette.light;
  }
  const fallback = dark ? OTHER_SERIES_COLORS.dark : OTHER_SERIES_COLORS.light;
  const key = String(virus ?? "").trim() || "other";
  return fallback[hashKey(key) % fallback.length];
}

export function displayVirusLabel(virus: string, language: UiLanguage = "en"): string {
  if (language === "hu") return VIRUS_LABELS_HU[virus] ?? virus;
  if (virus === INFLUENZA_ALL_KEY) return "Influenza (all)";
  return virus;
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
        grid: "rgba(148, 163, 184, 0.16)",
        sliderBorder: "rgba(148, 163, 184, 0.35)",
        sliderFill: "rgba(59, 130, 246, 0.35)",
        sliderText: "#cbd5e1",
        legendBg: "rgba(15, 23, 42, 0.82)",
        legendBorder: "rgba(148, 163, 184, 0.32)",
        legendPage: "#93c5fd",
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
        sliderBorder: "rgba(15, 23, 42, 0.18)",
        sliderFill: "rgba(37, 99, 235, 0.20)",
        sliderText: "#475569",
        legendBg: "rgba(248, 250, 252, 0.92)",
        legendBorder: "rgba(148, 163, 184, 0.38)",
        legendPage: "#1d4ed8",
        currentWeekLine: "rgba(37, 99, 235, 0.45)",
        tooltipBg: "rgba(15, 23, 42, 0.94)",
        tooltipBorder: "rgba(30, 41, 59, 0.24)",
        tooltipText: "#f8fafc",
      };
  const compareWeeks = weekOrder === "numeric" ? numericWeekCompare : seasonWeekCompare;
  const weeks = Array.from(new Set(rows.map((row) => row.week))).sort((a, b) => compareWeeks(a, b));
  const labels = weeks.map((week) => formatWeekLabel(week, language));
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

  const currentWeekLabel = labels.length ? labels[labels.length - 1] : null;
  const series: SeriesOption[] = viruses.map((virus, idx) => {
    const map = new Map<number, number>();
    for (const row of rows) {
      if (row.virus !== virus) continue;
      map.set(row.week, row.detections);
    }
    const color = pathogenSeriesColor(virus, dark);
    return {
      name: displayVirusLabel(virus, language),
      type: "line" as const,
      data: weeks.map((week) => map.get(week) ?? null),
      smooth: 0.25,
      connectNulls: false,
      symbolSize: 5,
      lineStyle: { color, width: 2.2 },
      itemStyle: { color },
      markLine:
        idx === 0 && currentWeekLabel
          ? {
              symbol: ["none", "none"],
              silent: true,
              lineStyle: { color: palette.currentWeekLine, width: 1.3, type: "dashed" },
              label: { show: false },
              data: [{ xAxis: currentWeekLabel }],
            }
          : undefined,
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
      backgroundColor: palette.tooltipBg,
      borderColor: palette.tooltipBorder,
      borderWidth: 1,
      textStyle: { color: palette.tooltipText, fontWeight: 600 },
      extraCssText: "box-shadow: 0 14px 30px rgba(2, 6, 23, 0.28);",
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
      splitLine: { lineStyle: { color: palette.grid, type: [4, 5] } },
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
        grid: "rgba(148, 163, 184, 0.16)",
        sliderBorder: "rgba(148, 163, 184, 0.35)",
        sliderFill: "rgba(59, 130, 246, 0.35)",
        sliderText: "#cbd5e1",
        legendBg: "rgba(15, 23, 42, 0.82)",
        legendBorder: "rgba(148, 163, 184, 0.32)",
        legendPage: "#93c5fd",
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
        sliderBorder: "rgba(15, 23, 42, 0.18)",
        sliderFill: "rgba(37, 99, 235, 0.20)",
        sliderText: "#475569",
        legendBg: "rgba(248, 250, 252, 0.92)",
        legendBorder: "rgba(148, 163, 184, 0.38)",
        legendPage: "#1d4ed8",
        currentWeekLine: "rgba(37, 99, 235, 0.45)",
        tooltipBg: "rgba(15, 23, 42, 0.94)",
        tooltipBorder: "rgba(30, 41, 59, 0.24)",
        tooltipText: "#f8fafc",
      };
  const compareWeeks = weekOrder === "numeric" ? numericWeekCompare : seasonWeekCompare;
  const weeks = Array.from(new Set(rows.map((row) => row.week))).sort((a, b) => compareWeeks(a, b));
  const labels = weeks.map((week) => formatWeekLabel(week, language));
  const noDataLabel = language === "hu" ? "Nincs adat" : "No data";
  const positivitySuffix = language === "hu" ? " pozitivitás" : " positivity";
  const viruses = Array.from(new Set(rows.map((row) => row.virus))).sort((a, b) => a.localeCompare(b));
  const dataZoom = buildCompactDataZoom(labels, compact, palette);

  const currentWeekLabel = labels.length ? labels[labels.length - 1] : null;
  const series: SeriesOption[] = viruses.map((virus, idx) => {
    const map = new Map<number, number>();
    for (const row of rows) {
      if (row.virus !== virus) continue;
      map.set(row.week, row.positivity);
    }
    const color = pathogenSeriesColor(virus, dark);
    return {
      name: `${displayVirusLabel(virus, language)}${positivitySuffix}`,
      type: "line" as const,
      data: weeks.map((week) => map.get(week) ?? null),
      smooth: 0.25,
      connectNulls: false,
      symbolSize: 5,
      lineStyle: { color, width: 2.2 },
      itemStyle: { color },
      markLine:
        idx === 0 && currentWeekLabel
          ? {
              symbol: ["none", "none"],
              silent: true,
              lineStyle: { color: palette.currentWeekLine, width: 1.3, type: "dashed" },
              label: { show: false },
              data: [{ xAxis: currentWeekLabel }],
            }
          : undefined,
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
      backgroundColor: palette.tooltipBg,
      borderColor: palette.tooltipBorder,
      borderWidth: 1,
      textStyle: { color: palette.tooltipText, fontWeight: 600 },
      extraCssText: "box-shadow: 0 14px 30px rgba(2, 6, 23, 0.28);",
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
      splitLine: { lineStyle: { color: palette.grid, type: [4, 5] } },
    },
    dataZoom,
    series,
  };
}
