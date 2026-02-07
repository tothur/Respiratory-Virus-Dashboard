import type { DashboardDataSource, IliAgeSplitPoint } from "./adapter";
import { createBundledDataSource } from "./adapter";
import { RespiratoryDataSchema } from "./contracts";

const DEFAULT_DATASET = "NNGYK";
const DEFAULT_ILI_VIRUS = "ILI (flu-like illness)";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toFiniteNumber(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

function normalizeVirusName(name: unknown): string {
  const raw = toOptionalString(name);
  if (!raw) return DEFAULT_ILI_VIRUS;

  const normalized = raw
    .normalize("NFKC")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (/^ili\s*\(\s*flu[-\s]*like illness\s*\)$/i.test(normalized)) return DEFAULT_ILI_VIRUS;
  if (/^influenza$/i.test(normalized)) return "Influenza";
  if (/^influenza\s+a$/i.test(normalized)) return "Influenza A";
  if (/^influenza\s+b$/i.test(normalized)) return "Influenza B";
  if (/^influenza\s+untyped$/i.test(normalized)) return "Influenza (untyped)";
  if (/^influenza\s+a\s*\(\s*h1n1pdm09\s*\)$/i.test(normalized) || /^influenza\s+a\s*\(\s*h1pdm09\s*\)$/i.test(normalized)) {
    return "Influenza A(H1N1pdm09)";
  }
  if (/^a\s*\(\s*h1\s*\)\s*pdm09$/i.test(normalized)) return "Influenza A(H1N1pdm09)";
  if (/^influenza\s+a\s*\(\s*h3\s*\)$/i.test(normalized)) return "Influenza A(H3)";
  if (/^a\s*\(\s*h3\s*\)$/i.test(normalized)) return "Influenza A(H3)";
  if (/^influenza\s+a\s*\(\s*nt\s*\)$/i.test(normalized)) return "Influenza A(NT)";
  if (/^a\s*\(\s*unknown\s*\)$/i.test(normalized)) return "Influenza A(NT)";
  if (/^sars[-\s]*cov[-\s]*2$/i.test(normalized)) return "SARS-CoV-2";
  if (/^rs[-\s]*v(i[íi]rus)?$/i.test(normalized)) return "RSV";

  return normalized;
}

function parsePercentToken(value: string): number | null {
  const parsed = Number(String(value).replace(",", "."));
  if (!Number.isFinite(parsed)) return null;
  if (parsed < 0 || parsed > 100) return null;
  return parsed;
}

function extractIliAgeSplit(rawText: unknown): Omit<IliAgeSplitPoint, "year" | "week"> | null {
  if (typeof rawText !== "string") return null;

  const normalized = rawText
    .normalize("NFKC")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return null;

  const context =
    /Az influenzaszer[űu] megbeteged[ée]s[\s\S]{0,560}/i.exec(normalized)?.[0] ?? normalized.slice(0, 900);
  const match =
    /(\d{1,2}(?:[.,]\d+)?)%\S*\s*0-14[\s\S]{0,140}?(\d{1,2}(?:[.,]\d+)?)%\S*\s*15-34[\s\S]{0,140}?(\d{1,2}(?:[.,]\d+)?)%\S*[\s\S]{0,140}?35-59[\s\S]{0,140}?(\d{1,2}(?:[.,]\d+)?)%\S*[\s\S]{0,140}?60/i.exec(
      context
    );
  if (!match) return null;

  const age0to14 = parsePercentToken(match[1]);
  const age15to34 = parsePercentToken(match[2]);
  const age35to59 = parsePercentToken(match[3]);
  const age60plus = parsePercentToken(match[4]);
  if (age0to14 == null || age15to34 == null || age35to59 == null || age60plus == null) return null;

  const total = age0to14 + age15to34 + age35to59 + age60plus;
  if (total < 85 || total > 115) return null;

  return {
    age0to14,
    age15to34,
    age35to59,
    age60plus,
  };
}

function weekSortValue(week: number): number {
  return week >= 40 ? week : week + 53;
}

function weekCompare(a: number, b: number): number {
  return weekSortValue(a) - weekSortValue(b);
}

function inferFsCandidate(relativePath: string): string | null {
  try {
    if (!import.meta.env.DEV) return null;
    const absolute = new URL(/* @vite-ignore */ relativePath, import.meta.url).pathname;
    if (!absolute) return null;
    return `/@fs${absolute}`;
  } catch {
    return null;
  }
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function loadRawNngykPayload(): Promise<{ payload: unknown; location: string } | null> {
  const fsCandidate = inferFsCandidate("../../nngyk_all.json");
  const candidates = ["./nngyk_all.json", "/nngyk_all.json", ...(fsCandidate ? [fsCandidate] : [])];

  for (const candidate of candidates) {
    const payload = await fetchJson(candidate);
    if (payload != null) return { payload, location: candidate };
  }

  try {
    const mod = await import("@nngyk-all");
    return { payload: mod.default, location: "@nngyk-all" };
  } catch {
    return null;
  }
}

async function loadRawErvissPayload(): Promise<{ payload: unknown; location: string } | null> {
  const fsCandidates = [
    inferFsCandidate("../../erviss_data/erviss_sari.json"),
    inferFsCandidate("../../erviss_sari.json"),
  ].filter((value): value is string => typeof value === "string");
  const candidates = ["./erviss_data/erviss_sari.json", "/erviss_data/erviss_sari.json", "./erviss_sari.json", "/erviss_sari.json", ...fsCandidates];

  for (const candidate of candidates) {
    const payload = await fetchJson(candidate);
    if (payload != null) return { payload, location: candidate };
  }

  try {
    const mod = await import("@erviss-sari");
    return { payload: mod.default, location: "@erviss-sari" };
  } catch {
    return null;
  }
}

function buildDataSourceFromNngyk(payload: unknown, location: string): DashboardDataSource | null {
  if (!Array.isArray(payload)) return null;

  const weekly = new Map<string, { dataset: string; year: number; week: number; virus: string; cases: number; region: string }>();
  const sari = new Map<string, { year: number; week: number; admissions: number | null; icu: number | null }>();
  const viroDetections = new Map<string, { year: number; week: number; virus: string; detections: number }>();
  const viroPositivity = new Map<string, { year: number; week: number; virus: string; positivity: number }>();
  const iliAgeSplits = new Map<string, IliAgeSplitPoint>();
  const years = new Set<number>();
  const viruses = new Set<string>();

  for (const entry of payload) {
    if (!isRecord(entry)) continue;
    const payloadObj = isRecord(entry.payload) ? entry.payload : null;
    if (!payloadObj) continue;

    const weeklyRowsRaw = Array.isArray(payloadObj.weekly) ? payloadObj.weekly : [];
    const metadata = isRecord(payloadObj.metadata) ? payloadObj.metadata : null;
    const seasonYear =
      toFiniteNumber(entry.season_year) ??
      toFiniteNumber(metadata?.season_year) ??
      toFiniteNumber(isRecord(weeklyRowsRaw[0]) ? weeklyRowsRaw[0].year : null);
    const baseWeek =
      toFiniteNumber(entry.week) ?? toFiniteNumber(isRecord(weeklyRowsRaw[0]) ? weeklyRowsRaw[0].week : null);

    if (seasonYear != null && baseWeek != null) {
      const ageSplit = extractIliAgeSplit(payloadObj.raw_text);
      if (ageSplit) {
        iliAgeSplits.set(`${seasonYear}::${baseWeek}`, {
          year: seasonYear,
          week: baseWeek,
          ...ageSplit,
        });
      }
    }

    for (const rowValue of weeklyRowsRaw) {
      if (!isRecord(rowValue)) continue;
      const year = toFiniteNumber(rowValue.year) ?? seasonYear;
      const week = toFiniteNumber(rowValue.week) ?? baseWeek;
      if (year == null || week == null) continue;

      const dataset = toOptionalString(rowValue.dataset) ?? DEFAULT_DATASET;
      const virus = normalizeVirusName(rowValue.virus);
      const region = toOptionalString(rowValue.region) ?? "National";
      const cases = toFiniteNumber(rowValue.cases) ?? 0;

      const key = `${dataset}::${year}::${week}::${virus}::${region}`;
      const current = weekly.get(key);
      if (current) {
        current.cases += cases;
      } else {
        weekly.set(key, { dataset, year, week, virus, cases, region });
      }
      years.add(year);
      viruses.add(virus);
    }

    const sariObj = isRecord(payloadObj.sari) ? payloadObj.sari : null;
    if (sariObj && seasonYear != null) {
      const week = toFiniteNumber(sariObj.week) ?? baseWeek;
      const admissions = toFiniteNumber(sariObj.admissions);
      const icu = toFiniteNumber(sariObj.icu);
      if (week != null && (admissions != null || icu != null)) {
        const key = `${seasonYear}::${week}`;
        const current = sari.get(key) ?? { year: seasonYear, week, admissions: null, icu: null };
        if (admissions != null) current.admissions = (current.admissions ?? 0) + admissions;
        if (icu != null) current.icu = (current.icu ?? 0) + icu;
        sari.set(key, current);
        years.add(seasonYear);
      }
    }

    const virologyObj = isRecord(payloadObj.virology) ? payloadObj.virology : null;
    if (virologyObj && seasonYear != null && baseWeek != null) {
      const detections = Array.isArray(virologyObj.detections) ? virologyObj.detections : [];
      const positivity = Array.isArray(virologyObj.positivity) ? virologyObj.positivity : [];

      for (const rowValue of detections) {
        if (!isRecord(rowValue)) continue;
        const virus = normalizeVirusName(rowValue.virus);
        const detectionsValue = toFiniteNumber(rowValue.detections);
        if (detectionsValue == null) continue;
        const key = `${seasonYear}::${baseWeek}::${virus}`;
        const current = viroDetections.get(key);
        if (current) {
          current.detections += detectionsValue;
        } else {
          viroDetections.set(key, { year: seasonYear, week: baseWeek, virus, detections: detectionsValue });
        }
      }

      for (const rowValue of positivity) {
        if (!isRecord(rowValue)) continue;
        const virus = normalizeVirusName(rowValue.virus);
        const positivityValue = toFiniteNumber(rowValue.positivity);
        if (positivityValue == null) continue;
        const key = `${seasonYear}::${baseWeek}::${virus}`;
        const current = viroPositivity.get(key);
        if (!current || positivityValue > current.positivity) {
          viroPositivity.set(key, { year: seasonYear, week: baseWeek, virus, positivity: positivityValue });
        }
      }
    }
  }

  if (!weekly.size) return null;

  const inferredSeasonLabels: Record<string, string> = {};
  const sortedYears = Array.from(years).sort((a, b) => a - b);
  for (const year of sortedYears) {
    inferredSeasonLabels[String(year)] = `${year}-${year + 1}`;
  }

  const candidate = RespiratoryDataSchema.parse({
    years: sortedYears,
    weekly: Array.from(weekly.values()).sort(
      (a, b) => a.year - b.year || weekCompare(a.week, b.week) || a.virus.localeCompare(b.virus)
    ),
    sariWeekly: Array.from(sari.values()).sort((a, b) => a.year - b.year || weekCompare(a.week, b.week)),
    virologyDetections: Array.from(viroDetections.values()).sort(
      (a, b) => a.year - b.year || weekCompare(a.week, b.week) || a.virus.localeCompare(b.virus)
    ),
    virologyPositivity: Array.from(viroPositivity.values()).sort(
      (a, b) => a.year - b.year || weekCompare(a.week, b.week) || a.virus.localeCompare(b.virus)
    ),
    ervissDetections: [],
    ervissPositivity: [],
    viruses: Array.from(viruses).sort((a, b) => a.localeCompare(b)),
    datasets: {
      NNGYK: {
        name: "NNGYK (Hungary)",
        description: "Structured from parsed NNGYK bulletins (latest run).",
      },
    },
  });

  return {
    source: "nngyk_all",
    respiratoryData: candidate,
    seasonLabels: inferredSeasonLabels,
    iliAgeSplits: Array.from(iliAgeSplits.values()).sort((a, b) => a.year - b.year || weekCompare(a.week, b.week)),
    note: `Loaded live bulletin extract from ${location}.`,
  };
}

function withNote(base: DashboardDataSource, note: string): DashboardDataSource {
  const existing = base.note ? `${base.note} ${note}` : note;
  return {
    ...base,
    note: existing,
  };
}

function applyErvissPayload(base: DashboardDataSource, payload: unknown, location: string): DashboardDataSource | null {
  if (!isRecord(payload)) return null;
  const latestYear = toFiniteNumber(payload.latest_year);
  const detectionsRaw = Array.isArray(payload.detections) ? payload.detections : [];
  const positivityRaw = Array.isArray(payload.positivity) ? payload.positivity : [];

  const detections = detectionsRaw
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const year = toFiniteNumber(entry.year) ?? latestYear;
      const week = toFiniteNumber(entry.week);
      const detectionsValue = toFiniteNumber(entry.detections);
      const virus = normalizeVirusName(entry.virus);
      if (year == null || week == null || detectionsValue == null || !virus) return null;
      return { year, week, virus, detections: detectionsValue };
    })
    .filter((row): row is { year: number; week: number; virus: string; detections: number } => row !== null)
    .sort((a, b) => a.year - b.year || a.week - b.week || a.virus.localeCompare(b.virus));

  const positivity = positivityRaw
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const year = toFiniteNumber(entry.year) ?? latestYear;
      const week = toFiniteNumber(entry.week);
      const positivityValue = toFiniteNumber(entry.positivity);
      const virus = normalizeVirusName(entry.virus);
      if (year == null || week == null || positivityValue == null || !virus) return null;
      return { year, week, virus, positivity: positivityValue };
    })
    .filter((row): row is { year: number; week: number; virus: string; positivity: number } => row !== null)
    .sort((a, b) => a.year - b.year || a.week - b.week || a.virus.localeCompare(b.virus));

  if (!detections.length && !positivity.length) return null;

  const merged = RespiratoryDataSchema.parse({
    ...base.respiratoryData,
    ervissDetections: detections,
    ervissPositivity: positivity,
    datasets: {
      ...(isRecord(base.respiratoryData.datasets) ? base.respiratoryData.datasets : {}),
      ERVISS: {
        name: "ERVISS (EU/EEA)",
        description: "EU/EEA SARI virological detections and positivity from ECDC ERVISS.",
      },
    },
  });

  return withNote(
    {
      ...base,
      respiratoryData: merged,
    },
    `Loaded ERVISS feed from ${location}.`
  );
}

export async function loadRuntimeDataSource(): Promise<DashboardDataSource> {
  const loadedNngyk = await loadRawNngykPayload();
  let base: DashboardDataSource;

  if (!loadedNngyk) {
    base = createBundledDataSource("nngyk_all.json not found; using bundled sample.");
  } else {
    const parsed = buildDataSourceFromNngyk(loadedNngyk.payload, loadedNngyk.location);
    base =
      parsed ??
      createBundledDataSource("nngyk_all.json present but invalid for weekly aggregation; using bundled sample.");
  }

  const loadedErviss = await loadRawErvissPayload();
  if (!loadedErviss) {
    return withNote(base, "ERVISS feed not found.");
  }

  const merged = applyErvissPayload(base, loadedErviss.payload, loadedErviss.location);
  if (!merged) {
    return withNote(base, "ERVISS feed present but invalid.");
  }

  return merged;
}
