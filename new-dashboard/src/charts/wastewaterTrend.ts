import type { EChartsOption, SeriesOption } from "echarts";
import type { WastewaterPoint } from "../domain/model";
import { displayVirusLabel, type UiLanguage } from "./virologyTrend";

interface WastewaterTrendArgs {
  points: WastewaterPoint[];
  language: UiLanguage;
  dark: boolean;
}

const COLORS: Record<string, { light: string; dark: string }> = {
  "Influenza A": { light: "#db2777", dark: "#f472b6" },
  "Influenza B": { light: "#9333ea", dark: "#c084fc" },
  RSV: { light: "#0f766e", dark: "#2dd4bf" },
  "SARS-CoV-2": { light: "#2563eb", dark: "#60a5fa" },
};

export function buildWastewaterTrendOption({ points, language, dark }: WastewaterTrendArgs): EChartsOption {
  const weeks = Array.from(new Set(points.map((point) => `${point.year}-W${String(point.week).padStart(2, "0")}`))).sort();
  const viruses = Array.from(new Set(points.map((point) => point.virus))).sort();
  const numberFormatter = new Intl.NumberFormat(language === "hu" ? "hu-HU" : "en-US", { maximumFractionDigits: 0 });
  const series: SeriesOption[] = viruses.map((virus) => {
    const values = new Map(
      points.filter((point) => point.virus === virus).map((point) => [`${point.year}-W${String(point.week).padStart(2, "0")}`, point.concentration])
    );
    const palette = COLORS[virus] ?? { light: "#64748b", dark: "#94a3b8" };
    return {
      name: displayVirusLabel(virus, language),
      type: "line",
      data: weeks.map((week) => values.get(week) ?? null),
      smooth: 0.2,
      connectNulls: false,
      symbol: "circle",
      symbolSize: 6,
      lineStyle: { width: 2.4, color: dark ? palette.dark : palette.light },
      itemStyle: { color: dark ? palette.dark : palette.light },
      emphasis: { focus: "series" },
    };
  });

  return {
    animationDuration: 450,
    aria: { enabled: true },
    color: viruses.map((virus) => (dark ? COLORS[virus]?.dark : COLORS[virus]?.light) ?? (dark ? "#94a3b8" : "#64748b")),
    grid: { left: 66, right: 24, top: 72, bottom: 52 },
    legend: {
      top: 8,
      type: "scroll",
      textStyle: { color: dark ? "#e2e8f0" : "#0f172a" },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: dark ? "rgba(15,23,42,.96)" : "rgba(255,255,255,.98)",
      borderColor: dark ? "rgba(148,163,184,.45)" : "rgba(15,23,42,.18)",
      textStyle: { color: dark ? "#e2e8f0" : "#0f172a" },
      valueFormatter: (value) => `${numberFormatter.format(Number(value))} GC/L`,
    },
    xAxis: {
      type: "category",
      data: weeks,
      boundaryGap: false,
      axisLabel: { color: dark ? "#cbd5e1" : "#475569", hideOverlap: true },
      axisLine: { lineStyle: { color: dark ? "rgba(148,163,184,.45)" : "rgba(15,23,42,.2)" } },
    },
    yAxis: {
      type: "log",
      logBase: 10,
      min: 1000,
      name: "GC/L",
      nameTextStyle: { color: dark ? "#cbd5e1" : "#475569" },
      axisLabel: {
        color: dark ? "#cbd5e1" : "#475569",
        formatter: (value: number) => numberFormatter.format(value),
      },
      splitLine: { lineStyle: { color: dark ? "rgba(148,163,184,.16)" : "rgba(15,23,42,.1)" } },
    },
    series,
  };
}
