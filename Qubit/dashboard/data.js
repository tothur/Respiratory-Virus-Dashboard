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
  variants: [],
};

export const seasonLabels = {
  2025: "2025-2026",
};
