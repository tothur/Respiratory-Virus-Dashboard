"""Extract key surveillance metrics from NNGYK respiratory bulletin PDFs.

The script is designed to:
- Download or read a given PDF bulletin.
- Pull out season/week metadata and headline virological counts.
- Emit a dashboard-ready JSON snapshot (``nngyk_latest.json``).

It relies on lightweight regex heuristics so that even text-based PDFs work.
If you need higher-fidelity table parsing, install ``pdfminer.six`` (used for
text extraction) and iterate on the regex patterns below.
"""
from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Tuple
from urllib.parse import urlparse
from urllib.request import Request, urlopen

USER_AGENT = "NNGYK-PDF-Extractor/1.0 (dashboard helper)"

# Common Hungarian tokens seen in bulletins
WEEK_PATTERN = re.compile(r"(?P<week>\d{1,2})\.?\s*h[eé]t", re.IGNORECASE)
SEASON_PATTERN = re.compile(r"(?P<year>20\d{2})/\d{2}")

VIRUS_PATTERNS: Dict[str, List[re.Pattern[str]]] = {
    "Influenza A": [
        re.compile(r"influenza\s*A[^\d]*(?P<count>\d{1,3}(?:[ .]\d{3})*)", re.IGNORECASE),
    ],
    "Influenza B": [
        re.compile(r"influenza\s*B[^\d]*(?P<count>\d{1,3}(?:[ .]\d{3})*)", re.IGNORECASE),
    ],
    "RSV": [
        re.compile(r"RSV[^\d]*(?P<count>\d{1,3}(?:[ .]\d{3})*)"),
        re.compile(r"respirat[oó]ri\s+syncytial[^\d]*(?P<count>\d{1,3}(?:[ .]\d{3})*)", re.IGNORECASE),
    ],
    "SARS-CoV-2": [
        re.compile(r"SARS[-\s]?CoV[-\s]?2[^\d]*(?P<count>\d{1,3}(?:[ .]\d{3})*)", re.IGNORECASE),
        re.compile(r"covid[^\d]*(?P<count>\d{1,3}(?:[ .]\d{3})*)", re.IGNORECASE),
    ],
}

METRIC_PATTERNS: List[Tuple[str, re.Pattern[str]]] = [
    (
        "ili_rate_per_100k",
        re.compile(
            r"ILI[^\d]*(?P<value>\d{1,3}(?:[.,]\d{1,2})?)\s*(?:/|per)\s*100\s*000",
            re.IGNORECASE,
        ),
    ),
    (
        "ari_rate_per_100k",
        re.compile(
            r"ARI[^\d]*(?P<value>\d{1,3}(?:[.,]\d{1,2})?)\s*(?:/|per)\s*100\s*000",
            re.IGNORECASE,
        ),
    ),
    (
        "samples_tested",
        re.compile(r"vizsg[aá]lt\s+mint[aá]k[^\d]*(?P<value>\d{1,3}(?:[ .]\d{3})*)", re.IGNORECASE),
    ),
    (
        "lab_confirmed_cases",
        re.compile(r"laborat[oó]riumban[^\d]*(?P<value>\d{1,3}(?:[ .]\d{3})*)\s+azonos[ií]tott", re.IGNORECASE),
    ),
]


@dataclass
class ExtractionResult:
    text: str
    week: int | None
    season_year: int | None
    virus_counts: Dict[str, int]
    metrics: Dict[str, float | int]

    def to_dashboard_payload(self) -> Dict[str, object]:
        years = [self.season_year] if self.season_year else []
        viruses = list(self.virus_counts.keys())
        weekly_rows = []
        for virus, count in self.virus_counts.items():
            if self.week is None:
                continue
            weekly_rows.append(
                {
                    "dataset": "NNGYK",
                    "year": self.season_year or 0,
                    "virus": virus,
                    "week": self.week,
                    "cases": count,
                    "region": "National",
                }
            )

        return {
            "datasets": {
                "NNGYK": {
                    "name": "NNGYK (Hungary)",
                    "description": "Structured from NNGYK Légúti Figyelőszolgálat PDF bulletin.",
                }
            },
            "years": years,
            "viruses": viruses,
            "weekly": weekly_rows,
            "metrics": self.metrics,
            "metadata": {
                "week": self.week,
                "season_year": self.season_year,
            },
            "raw_text": self.text[:8000],
        }


def download_pdf(url: str, destination: Path) -> Path:
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req) as resp:  # noqa: S310 - trusted source configured by operator
        destination.write_bytes(resp.read())
    return destination


def extract_text(pdf_path: Path) -> str:
    from pdfminer.high_level import extract_text as pdf_extract_text

    return pdf_extract_text(pdf_path)


def detect_week(text: str) -> int | None:
    match = WEEK_PATTERN.search(text)
    if match:
        return int(match.group("week"))
    return None


def detect_season_year(text: str) -> int | None:
    match = SEASON_PATTERN.search(text)
    if match:
        return int(match.group("year"))
    return None


def _parse_int(token: str) -> int:
    cleaned = token.replace(" ", "").replace(".", "").replace(",", "")
    return int(cleaned)


def _parse_float(token: str) -> float:
    normalized = token.replace(" ", "").replace(",", ".")
    return float(normalized)


def detect_virus_counts(text: str) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for virus, patterns in VIRUS_PATTERNS.items():
        for pattern in patterns:
            match = pattern.search(text)
            if match:
                counts[virus] = _parse_int(match.group("count"))
                break
    return counts


def detect_metrics(text: str) -> Dict[str, float | int]:
    metrics: Dict[str, float | int] = {}
    for name, pattern in METRIC_PATTERNS:
        match = pattern.search(text)
        if not match:
            continue
        token = match.group("value")
        if "," in token or "." in token:
            metrics[name] = _parse_float(token)
        else:
            metrics[name] = _parse_int(token)
    return metrics


def parse_bulletin(text: str) -> ExtractionResult:
    week = detect_week(text)
    season_year = detect_season_year(text)
    virus_counts = detect_virus_counts(text)
    metrics = detect_metrics(text)
    return ExtractionResult(text=text, week=week, season_year=season_year, virus_counts=virus_counts, metrics=metrics)


def parse_args(argv: Iterable[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "source",
        help="Path or URL to an NNGYK PDF (e.g., bulletin link)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("nngyk_latest.json"),
        help="Where to write the dashboard snapshot (default: nngyk_latest.json)",
    )
    parser.add_argument(
        "--save-pdf",
        type=Path,
        default=None,
        help="Optional path to persist the downloaded PDF locally",
    )
    return parser.parse_args(argv)


def resolve_pdf(source: str, save_pdf: Path | None) -> Path:
    parsed = urlparse(source)
    if parsed.scheme in {"http", "https"}:
        target = save_pdf or Path("nngyk_source.pdf")
        return download_pdf(source, target)
    return Path(source)


def main(argv: Iterable[str] | None = None) -> int:
    args = parse_args(argv)
    pdf_path = resolve_pdf(args.source, args.save_pdf)
    text = extract_text(pdf_path)
    result = parse_bulletin(text)
    payload = result.to_dashboard_payload()
    args.output.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"Parsed week: {result.week or 'unknown'} · season: {result.season_year or 'unknown'}")
    print(f"Virus counts: {result.virus_counts}")
    print(f"Metrics: {result.metrics}")
    print(f"Wrote snapshot to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
