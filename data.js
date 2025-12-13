export const respiratoryData = {
  datasets: {
    NNGYK: {
      name: "NNGYK (Hungary)",
      description: "Aggregated national respiratory surveillance (ILI focus).",
    },
  },
  years: [2025],
  viruses: ["ILI (flu-like illness)"],
  weekly: [
    { dataset: "NNGYK", year: 2025, virus: "ILI (flu-like illness)", week: 40, cases: 2100, region: "National" },
    { dataset: "NNGYK", year: 2025, virus: "ILI (flu-like illness)", week: 42, cases: 2480, region: "National" },
    { dataset: "NNGYK", year: 2025, virus: "ILI (flu-like illness)", week: 44, cases: 3120, region: "National" },
    { dataset: "NNGYK", year: 2025, virus: "ILI (flu-like illness)", week: 46, cases: 3890, region: "National" },
    { dataset: "NNGYK", year: 2025, virus: "ILI (flu-like illness)", week: 48, cases: 4510, region: "National" },
  ],
  sariWeekly: [
    { week: 40, admissions: 94, icu: 10 },
    { week: 42, admissions: 120, icu: 14 },
    { week: 44, admissions: 180, icu: 22 },
    { week: 46, admissions: 220, icu: 28 },
  ],
  virologyDetections: [
    { week: 40, virus: "SARS-CoV-2", detections: 20 },
    { week: 46, virus: "Influenza A(H1N1pdm09)", detections: 2 },
    { week: 46, virus: "RSV", detections: 1 },
  ],
  virologyPositivity: [
    { week: 40, virus: "SARS-CoV-2", positivity: 19.4 },
    { week: 46, virus: "Influenza", positivity: 1.5 },
    { week: 46, virus: "RSV", positivity: 0.7 },
  ],
  variants: [],
};

export const seasonLabels = {
  2025: "2025-2026",
};
