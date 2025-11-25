"""Fetch EU/EEA SARI virological data from ECDC/ERVISS and emit a dashboard JSON snapshot.

Data source (updated weekly):
https://github.com/EU-ECDC/Respiratory_viruses_weekly_data/blob/main/data/SARITestsDetectionsPositivity.csv

We only keep rows where:
- indicator starts with "SARI virological"
- country equals "EU/EEA"
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import sys
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

DEFAULT_URL = "https://raw.githubusercontent.com/EU-ECDC/Respiratory_viruses_weekly_data/main/data/SARITestsDetectionsPositivity.csv"
DEFAULT_DIR = "erviss_data"
DEFAULT_OUTPUT = f"{DEFAULT_DIR}/erviss_sari.json"
DEFAULT_CSV_COPY = f"{DEFAULT_DIR}/SARITestsDetectionsPositivity.csv"
DEFAULT_YEARS = [2025, 2026]


def fetch_csv(url: str) -> Tuple[str, List[Dict[str, str]]]:
  request = urllib.request.Request(url, headers={"User-Agent": "erviss-sari-fetch/1.0"})
  with urllib.request.urlopen(request, timeout=45) as response:  # noqa: S310 - trusted static source
    encoding = response.headers.get_content_charset() or "utf-8"
    text = response.read().decode(encoding)
  return text, list(csv.DictReader(io.StringIO(text)))


def parse_year_week(iso_week: str) -> Tuple[Optional[int], Optional[int]]:
  """Parse strings like '2024-W10' or '2024W10' -> (2024, 10)."""
  if not iso_week:
    return None, None
  token = iso_week.replace("-", "").upper()
  if "W" not in token:
    return None, None
  try:
    year_part, week_part = token.split("W")
    year = int(year_part.strip())
    week = int(week_part.strip())
    return year, week
  except ValueError:
    return None, None


def parse_number(row: Dict[str, str], keys: Iterable[str], as_int: bool = True) -> Optional[float]:
  for key in keys:
    if key not in row:
      continue
    raw = row.get(key)
    if raw in (None, ""):
      continue
    try:
      val = float(raw)
      return int(val) if as_int else val
    except ValueError:
      continue
  return None


def extract_virus(row: Dict[str, str]) -> str:
  """Prefer subtype, but fall back to pathogen/type when subtype is a total/NA bucket."""

  def cleaned(value: Optional[str]) -> str:
    return (value or "").strip()

  subtype = cleaned(row.get("pathogensubtype"))
  pathogen = cleaned(row.get("pathogen"))
  ptype = cleaned(row.get("pathogentype"))

  subtype_lower = subtype.lower()
  if subtype and subtype_lower not in {"total", "na", "n/a", "unknown"}:
    return subtype
  if pathogen:
    return pathogen
  if ptype:
    return ptype
  return ""


@dataclass
class SariRow:
  week: int
  year: int
  virus: str
  detections: Optional[int] = None
  total_tests: Optional[int] = None
  positivity: Optional[float] = None


def filter_rows(rows: List[Dict[str, str]], *, year_filter: Optional[Iterable[int]] = None) -> List[SariRow]:
  kept: List[SariRow] = []
  allowed_years = set(year_filter) if year_filter is not None else None
  for row in rows:
    indicator_raw = row.get("indicator") or ""
    indicator = indicator_raw.lower().strip()
    if indicator not in {"detections", "positivity", "tests"}:
      continue

    country = (
      row.get("countryname")
      or row.get("country")
      or row.get("country_code")
      or row.get("reporting_country")
      or row.get("region")
      or row.get("location")
      or ""
    )
    country_upper = country.upper()
    if "EU/EEA" not in country_upper:
      # If the explicit country field is empty, check any value that might contain EU/EEA
      if not any(isinstance(v, str) and "EU/EEA" in v.upper() for v in row.values()):
        continue

    age = (row.get("age") or "").strip().lower()
    if age and age != "total":
      # Keep only the total (all-age) rows to match the dashboard rollups.
      continue

    survtype = (row.get("survtype") or row.get("pathogentype") or row.get("surveillance_system") or "").lower()
    if "sari" not in survtype:
      continue

    year_week = row.get("year_week") or row.get("yearweek")
    year, week = parse_year_week(year_week or "")
    if not year or not week:
      continue
    if allowed_years is not None and year not in allowed_years:
      continue

    virus = extract_virus(row) or "Unknown"
    val = parse_number(row, ["value", "detections", "positive", "positives", "cases", "count"], as_int=True)
    positivity_val = parse_number(
      row, ["value", "positivity_rate", "positivity", "percent_positive", "positivity_percent"], as_int=False
    )
    tests_val = parse_number(row, ["value", "total_tests", "tests", "samples_tested"], as_int=True)

    detections = val if indicator == "detections" else None
    positivity = round(positivity_val, 2) if indicator == "positivity" and positivity_val is not None else None
    total_tests = tests_val if indicator == "tests" else None

    kept.append(
      SariRow(
        week=week,
        year=year,
        virus=virus,
        detections=detections,
        total_tests=total_tests,
        positivity=positivity,
      )
    )
  return kept


def build_payload(rows: List[SariRow]) -> Dict[str, object]:
  merged: Dict[Tuple[int, int, str], SariRow] = {}
  for row in rows:
    key = (row.year, row.week, row.virus)
    existing = merged.get(key) or SariRow(week=row.week, year=row.year, virus=row.virus)
    if row.detections is not None:
      existing.detections = (existing.detections or 0) + row.detections
    if row.total_tests is not None:
      existing.total_tests = (existing.total_tests or 0) + row.total_tests
    if row.positivity is not None:
      existing.positivity = row.positivity
    merged[key] = existing

  detections = []
  positivity = []
  for row in merged.values():
    if row.detections is not None:
      detections.append(
        {
          "dataset": "ERVISS",
          "region": "EU/EEA",
          "year": row.year,
          "week": row.week,
          "virus": row.virus,
          "detections": row.detections,
        }
      )
    if row.positivity is not None:
      entry = {
        "dataset": "ERVISS",
        "region": "EU/EEA",
        "year": row.year,
        "week": row.week,
        "virus": row.virus,
        "positivity": row.positivity,
      }
      if row.total_tests is not None:
        entry["tests"] = row.total_tests
      positivity.append(entry)

  latest_week = max((r.week for r in rows), default=None)
  latest_year = max((r.year for r in rows), default=None)

  return {
    "source": DEFAULT_URL,
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "region": "EU/EEA",
    "latest_year": latest_year,
    "latest_week": latest_week,
    "detections": detections,
    "positivity": positivity,
  }


def main(argv: List[str] | None = None) -> int:
  parser = argparse.ArgumentParser(description="Fetch ECDC/ERVISS SARI virological EU/EEA data.")
  parser.add_argument("--url", default=DEFAULT_URL, help="CSV URL to fetch")
  parser.add_argument(
    "--output",
    default=DEFAULT_OUTPUT,
    help="Output JSON path (default: erviss_data/erviss_sari.json)",
  )
  parser.add_argument(
    "--csv-copy",
    default=DEFAULT_CSV_COPY,
    help="Optional path to save the downloaded CSV alongside the JSON (default: erviss_data/SARITestsDetectionsPositivity.csv)",
  )
  parser.add_argument(
    "--year",
    dest="years",
    type=int,
    nargs="+",
    default=DEFAULT_YEARS,
    help="Restrict rows to these ISO years (space separated; default: 2025 2026)",
  )
  args = parser.parse_args(argv)

  try:
    raw_text, rows = fetch_csv(args.url)
  except Exception as exc:  # noqa: BLE001
    print(f"Failed to fetch CSV: {exc}", file=sys.stderr)
    return 1

  filtered = filter_rows(rows, year_filter=args.years)
  if not filtered:
    indicators = sorted({(r.get("indicator") or "").strip() for r in rows})
    countries = sorted({(r.get("countryname") or r.get("country") or r.get("country_code") or r.get("reporting_country") or r.get("region") or "").strip() for r in rows})
    fields = list(rows[0].keys()) if rows else []
    print(
      "No EU/EEA SARI virological rows found in CSV. "
      f"Indicators seen: {indicators[:5]}{'...' if len(indicators) > 5 else ''}. "
      f"Countries seen: {countries[:5]}{'...' if len(countries) > 5 else ''}. "
      f"Columns: {fields}",
      file=sys.stderr,
    )
    return 1

  payload = build_payload(filtered)
  out_path = Path(args.output)
  out_path.parent.mkdir(parents=True, exist_ok=True)
  with open(out_path, "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)
  if args.csv_copy:
    csv_path = Path(args.csv_copy)
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    csv_path.write_text(raw_text, encoding="utf-8")
  print(
    f"Saved {len(payload['detections'])} detection rows and {len(payload['positivity'])} positivity rows to {args.output}"
  )
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
