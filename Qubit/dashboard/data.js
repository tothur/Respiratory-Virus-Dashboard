export const respiratoryData = {
  datasets: {
    NNGYK: {
      name: "NNGYK (Hungary)",
      description: "Aggregated national respiratory virus surveillance shared by the National Public Health Center.",
    },
    ERVISS: {
      name: "ERVISS/ECDC (Europe)",
      description: "European Respiratory Virus Surveillance Summary consolidated by ECDC.",
    },
  },
  years: [2023, 2024],
  viruses: ["Influenza A", "Influenza B", "RSV", "SARS-CoV-2"],
  weekly: [
    // Simplified synthetic sample data inspired by published seasonal curves.
    { dataset: "NNGYK", year: 2023, virus: "Influenza A", week: 40, cases: 210, region: "Central" },
    { dataset: "NNGYK", year: 2023, virus: "Influenza A", week: 44, cases: 560, region: "Central" },
    { dataset: "NNGYK", year: 2023, virus: "Influenza A", week: 48, cases: 1420, region: "Western" },
    { dataset: "NNGYK", year: 2023, virus: "Influenza A", week: 52, cases: 2890, region: "Eastern" },
    { dataset: "NNGYK", year: 2023, virus: "Influenza B", week: 52, cases: 1020, region: "Central" },
    { dataset: "NNGYK", year: 2023, virus: "RSV", week: 46, cases: 940, region: "Southern" },
    { dataset: "NNGYK", year: 2024, virus: "Influenza A", week: 2, cases: 3100, region: "Central" },
    { dataset: "NNGYK", year: 2024, virus: "Influenza B", week: 2, cases: 1290, region: "Western" },
    { dataset: "NNGYK", year: 2024, virus: "RSV", week: 6, cases: 880, region: "Northern" },
    { dataset: "NNGYK", year: 2024, virus: "SARS-CoV-2", week: 10, cases: 730, region: "Central" },
    { dataset: "ERVISS", year: 2023, virus: "Influenza A", week: 40, cases: 490, region: "Baltic" },
    { dataset: "ERVISS", year: 2023, virus: "Influenza A", week: 52, cases: 2340, region: "Nordic" },
    { dataset: "ERVISS", year: 2023, virus: "RSV", week: 45, cases: 1140, region: "Iberia" },
    { dataset: "ERVISS", year: 2024, virus: "Influenza B", week: 4, cases: 880, region: "Central Europe" },
    { dataset: "ERVISS", year: 2024, virus: "Influenza A", week: 8, cases: 2670, region: "Central Europe" },
    { dataset: "ERVISS", year: 2024, virus: "SARS-CoV-2", week: 10, cases: 640, region: "Baltic" },
  ],
};

export const europeanContextSample = {
  detections: [
    { virus: "Influenza A", week: "2024-W07", detections: 12876 },
    { virus: "Influenza B", week: "2024-W07", detections: 4620 },
    { virus: "RSV", week: "2024-W07", detections: 2431 },
    { virus: "SARS-CoV-2", week: "2024-W07", detections: 1894 },
  ],
  positivity: [
    { virus: "Influenza A/B", week: "2024-W07", positivity: 18.4, tests: 9450 },
    { virus: "RSV", week: "2024-W07", positivity: 11.1, tests: 3100 },
    { virus: "SARS-CoV-2", week: "2024-W07", positivity: 6.3, tests: 4870 },
  ],
};
