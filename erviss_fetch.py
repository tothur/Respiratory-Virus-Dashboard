"""Build a small ERVISS snapshot for the dashboard.

The ERVISS explorer lets you download CSVs for "Aggregate weekly detections"
and "Aggregate weekly test positivity". Point this script at those CSV URLs to
emit `erviss_latest.json`, which the dashboard will load automatically if
present.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import urllib.request
from typing import Dict, Iterable, List


def fetch_csv(url: str) -> List[Dict[str, str]]:
    request = urllib.request.Request(url, headers={"User-Agent": "erviss-fetch/1.0"})
    with urllib.request.urlopen(request, timeout=45) as response:
        encoding = response.headers.get_content_charset() or "utf-8"
        text = response.read().decode(encoding)
    return list(csv.DictReader(io.StringIO(text)))


def filter_country(rows: Iterable[Dict[str, str]], country: str, country_field: str) -> List[Dict[str, str]]:
    if not country:
        return list(rows)
    wanted = country.upper()
    return [row for row in rows if row.get(country_field, "").upper() == wanted]


def latest_week(rows: Iterable[Dict[str, str]], week_field: str) -> str:
    weeks = [row[week_field] for row in rows if row.get(week_field)]
    return max(weeks) if weeks else ""


def summarize_detections(rows: List[Dict[str, str]], virus_field: str, value_field: str, week_field: str) -> List[Dict[str, object]]:
    week = latest_week(rows, week_field)
    filtered = [row for row in rows if row.get(week_field) == week]
    summaries = []
    for row in filtered:
        try:
            value = int(float(row.get(value_field, 0)))
        except ValueError:
            value = 0
        summaries.append({
            "virus": row.get(virus_field, ""),
            "week": week,
            "detections": value,
        })
    return sorted(summaries, key=lambda r: r["detections"], reverse=True)


def summarize_positivity(rows: List[Dict[str, str]], virus_field: str, positivity_field: str, tests_field: str, week_field: str) -> List[Dict[str, object]]:
    week = latest_week(rows, week_field)
    filtered = [row for row in rows if row.get(week_field) == week]
    summaries = []
    for row in filtered:
        try:
            positivity = round(float(row.get(positivity_field, 0)), 2)
        except ValueError:
            positivity = 0.0
        try:
            tests = int(float(row.get(tests_field, 0))) if tests_field else None
        except ValueError:
            tests = None
        entry = {
            "virus": row.get(virus_field, ""),
            "week": week,
            "positivity": positivity,
        }
        if tests is not None:
            entry["tests"] = tests
        summaries.append(entry)
    return sorted(summaries, key=lambda r: r["positivity"], reverse=True)


def build_context(args: argparse.Namespace) -> Dict[str, object]:
    detections_rows = fetch_csv(args.detections_url)
    positivity_rows = fetch_csv(args.positivity_url)

    raw_detections = detections_rows
    raw_positivity = positivity_rows

    if args.country:
        detections_rows = filter_country(detections_rows, args.country, args.country_field)
        positivity_rows = filter_country(positivity_rows, args.country, args.country_field)

        if not detections_rows:
            print(
                f"Warning: no detection rows for '{args.country}' using {args.country_field}; falling back to unfiltered data."
            )
            detections_rows = raw_detections

        if not positivity_rows:
            print(
                f"Warning: no positivity rows for '{args.country}' using {args.country_field}; falling back to unfiltered data."
            )
            positivity_rows = raw_positivity

    context = {
        "detections": summarize_detections(
            detections_rows,
            virus_field=args.virus_field,
            value_field=args.detection_field,
            week_field=args.week_field,
        ),
        "positivity": summarize_positivity(
            positivity_rows,
            virus_field=args.virus_field,
            positivity_field=args.positivity_field,
            tests_field=args.tests_field,
            week_field=args.week_field,
        ),
    }
    return context


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate ERVISS context JSON for the dashboard.")
    parser.add_argument("--detections-url", required=True, help="CSV download for Aggregate weekly detections")
    parser.add_argument("--positivity-url", required=True, help="CSV download for Aggregate weekly test positivity")
    parser.add_argument("--output", default="erviss_latest.json", help="Path for the output JSON file")
    parser.add_argument("--country", default="EU/EEA", help="Country or region code to filter (matches country_field)")
    parser.add_argument("--country-field", default="country", help="Column containing country codes")
    parser.add_argument("--virus-field", default="virus", help="Column containing virus/pathogen names")
    parser.add_argument("--week-field", default="year_week", help="Column containing ISO year-week strings")
    parser.add_argument("--detection-field", default="detections", help="Column with weekly detections")
    parser.add_argument("--positivity-field", default="positivity_rate", help="Column with positivity percentage")
    parser.add_argument("--tests-field", default="total_tests", help="Column with total tests (optional)")
    args = parser.parse_args(argv)

    context = build_context(args)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(context, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(context['detections'])} detection rows and {len(context['positivity'])} positivity rows to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
