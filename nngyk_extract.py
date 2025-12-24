"""Extract key surveillance metrics from NNGYK respiratory bulletin PDFs.

The script is designed to:
- Download or read a given PDF bulletin.
- Pull out season/week metadata and headline virological counts.
- Emit a dashboard-ready JSON snapshot (``nngyk_latest.json``).
- Batch mode: point ``--folder`` at a directory of PDFs to parse them all.

It relies on lightweight regex heuristics so that even text-based PDFs work.
If you need higher-fidelity table parsing, install ``pdfminer.six`` (used for
text extraction) and iterate on the regex patterns below.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
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
    "ILI (flu-like illness)": [
        re.compile(
            r"(?P<count>\d{1,3}(?:[ .]\d{3})*)\s*f[őo]?\s*fordult\s+orvoshoz\s+influenzaszer[űu]",
            re.IGNORECASE,
        ),
        re.compile(
            r"influenzaszer[űu][^\d]{0,20}(?P<count>\d{1,3}(?:[ .]\d{3})*)\s*f[őo]",
            re.IGNORECASE,
        ),
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
    (
        "sari_admissions",
        re.compile(
            r"(?P<value>\d{1,3}(?:[ .]\d{3})*)\s*f[őo]t\s+vettek\s+fel.*?(SARI|súlyos[^\\n]{0,30}légúti)",
            re.IGNORECASE | re.DOTALL,
        ),
    ),
    (
        "sari_icu",
        re.compile(
            r"k[öo]z[üu]l[üu]k?.{0,200}?(?P<value>\d{1,3}(?:[ .]\d{3})*)\s*f[őo].{0,200}?intenz",
            re.IGNORECASE | re.DOTALL,
        ),
    ),
    (
        "pos_influenza",
        re.compile(
            r"influenza[\s\S]{0,120}?pozitivit[aá]si\s+ar[aá]ny\s+(?P<value>\d{1,2}(?:[.,]\d)?)%",
            re.IGNORECASE,
        ),
    ),
    (
        "pos_rsv",
        re.compile(
            r"RSV[\s\S]{0,120}?pozitivit[aá]si\s+ar[aá]ny\s+(?P<value>\d{1,2}(?:[.,]\d)?)%",
            re.IGNORECASE,
        ),
    ),
    (
        "pos_sars2",
        re.compile(
            r"SARS[-\s]?CoV[-\s]?2[\s\S]{0,120}?pozitivit[aá]si\s+ar[aá]ny\s+(?P<value>\d{1,2}(?:[.,]\d)?)%",
            re.IGNORECASE,
        ),
    ),
]


@dataclass
class ExtractionResult:
    text: str
    week: int | None
    season_year: int | None
    virus_counts: Dict[str, int]
    metrics: Dict[str, float | int]
    sari_admissions: int | None = None
    sari_icu: int | None = None
    virology: Dict[str, object] | None = None

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
            "sari": {
                "week": self.week,
                "admissions": self.sari_admissions,
                "icu": self.sari_icu,
            },
            "virology": self.virology or {},
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
    matches = [int(m.group("year")) for m in SEASON_PATTERN.finditer(text)]
    return max(matches) if matches else None


def infer_season_year_from_filename(pdf_path: Path, week: int | None) -> int | None:
    """Infer the season start year from a filename + week number.

    NNGYK bulletins are typically named with the calendar year (e.g., Figyelo_2025_03_het.pdf).
    For early-year weeks (W01..), the season start year is usually the previous year.
    """
    match = re.search(r"(20\d{2})", pdf_path.stem)
    if not match or week is None:
        return None
    year = int(match.group(1))
    return year if week >= 40 else year - 1


def _parse_int(token: str) -> int:
    cleaned = token.replace(" ", "").replace(".", "").replace(",", "")
    return int(cleaned)


def _parse_float(token: str) -> float:
    normalized = token.replace(" ", "").replace(",", ".")
    return float(normalized)


def _parse_hu_number(token: str) -> int | None:
    """Parse small Hungarian number words (e.g., 'egy', 'két', 'húsz')."""
    if not token:
        return None
    norm = (
        token.strip()
        .lower()
        .replace("á", "a")
        .replace("é", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ö", "o")
        .replace("ő", "o")
        .replace("ú", "u")
        .replace("ü", "u")
        .replace("ű", "u")
        .replace("-", "")
    )
    mapping = {
        "egy": 1,
        "ket": 2,
        "kett": 2,
        "ketto": 2,
        "harom": 3,
        "negy": 4,
        "ot": 5,
        "hat": 6,
        "het": 7,
        "nyolc": 8,
        "kilenc": 9,
        "tiz": 10,
        "tizenegy": 11,
        "tizenketto": 12,
        "tizenharom": 13,
        "tizennegy": 14,
        "tizenot": 15,
        "tizenhat": 16,
        "tizenhet": 17,
        "tizennyolc": 18,
        "tizenkilenc": 19,
        "husz": 20,
    }
    if norm in mapping:
        return mapping[norm]

    units = {
        "egy": 1,
        "ket": 2,
        "kett": 2,
        "ketto": 2,
        "harom": 3,
        "negy": 4,
        "ot": 5,
        "hat": 6,
        "het": 7,
        "nyolc": 8,
        "kilenc": 9,
    }
    tens = {
        "huszon": 20,
        "husz": 20,
        "harminc": 30,
        "negyven": 40,
        "otven": 50,
        "hatvan": 60,
        "hetven": 70,
        "nyolcvan": 80,
        "kilencven": 90,
    }
    for prefix in sorted(tens, key=len, reverse=True):
        if not norm.startswith(prefix):
            continue
        remainder = norm[len(prefix) :]
        if not remainder:
            return tens[prefix]
        unit_val = units.get(remainder)
        if unit_val is not None:
            return tens[prefix] + unit_val
    return None


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


def detect_sari_admissions(text: str) -> int | None:
    """Handle SARI admission phrasing even when 'fel' and 'SARI' are separated by line breaks."""
    patterns = [
        re.compile(
            r"(?P<value>\d{1,3}(?:[ .]\d{3})*)\s*f[őo]t\s+vettek\s+fel.{0,200}?(SARI|súlyos[^\\n]{0,50}légúti)",
            re.IGNORECASE | re.DOTALL,
        ),
        re.compile(
            r"(?P<value>\d{1,3}(?:[ .]\d{3})*)\s*f[őo]t\s+vettek.{0,200}?(SARI|súlyos[^\\n]{0,50}légúti).{0,120}?fel",
            re.IGNORECASE | re.DOTALL,
        ),
        re.compile(r"(?P<value>\d{1,3}(?:[ .]\d{3})*)\s+SARI\s+beteg", re.IGNORECASE),
    ]
    for pattern in patterns:
        match = pattern.search(text)
        if not match:
            continue
        try:
            return _parse_int(match.group("value"))
        except Exception:  # noqa: BLE001
            continue
    return None


def detect_sari_icu_fallback(text: str) -> int | None:
    """Handle layouts where the ICU count is separated from the intensív phrase."""
    lower = text.lower()
    intens_idx = lower.find("intenz")
    pattern = re.compile(
        r"k[öo]z[üu]l[üu]k?.{0,40}?(?P<count>\d{1,3}(?:[ .]\d{3})*)\s*f[őo]",
        re.IGNORECASE | re.DOTALL,
    )
    matches: list[tuple[int, int]] = []
    for m in pattern.finditer(text):
        try:
            matches.append((m.start(), _parse_int(m.group("count"))))
        except Exception:  # noqa: BLE001
            continue
    if not matches:
        return None
    if intens_idx != -1:
        return min(matches, key=lambda x: abs(x[0] - intens_idx))[1]
    return matches[0][1]


def detect_virology(text: str) -> Dict[str, object]:
    """Extract sentinel detections (with subtypes) and positivity percentages."""
    detections = []
    positivity = []

    count_pattern = re.compile(
        r"(?P<count_token>(?:\d{1,3}(?:[ .]\d{3})*)|[A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű-]+)"
        r"\s+betegn[ée]l[\s\S]{0,140}?(?P<virus>influenza\s+[A-Za-z0-9()]+|influenza|RSV|SARS[-\s]?CoV[-\s]?2)",
        re.IGNORECASE,
    )
    for m in count_pattern.finditer(text):
        token = m.group("count_token")
        virus_label = m.group("virus").strip()
        val = None
        try:
            val = _parse_int(token)
        except Exception:  # noqa: BLE001
            val = _parse_hu_number(token)
        if val is not None:
            if virus_label.lower().startswith("influenza"):
                virus_label = virus_label.replace("influenza", "Influenza").replace("  ", " ").strip()
            elif "rsv" in virus_label.lower():
                virus_label = "RSV"
            elif "sars" in virus_label.lower():
                virus_label = "SARS-CoV-2"
            detections.append({"virus": virus_label, "detections": val})

    positivity_patterns = [
        (
            "Influenza",
            re.compile(
                r"influenza[\s\S]{0,120}?pozitivit[aá]si\s+ar[aá]ny\s+(?P<val>\d{1,2}(?:[.,]\d)?)%",
                re.IGNORECASE,
            ),
        ),
        (
            "RSV",
            re.compile(
                r"RSV[\s\S]{0,120}?pozitivit[aá]si\s+ar[aá]ny\s+(?P<val>\d{1,2}(?:[.,]\d)?)%",
                re.IGNORECASE,
            ),
        ),
        (
            "SARS-CoV-2",
            re.compile(
                r"SARS[-\s]?CoV[-\s]?2[\s\S]{0,120}?pozitivit[aá]si\s+ar[aá]ny\s+(?P<val>\d{1,2}(?:[.,]\d)?)%",
                re.IGNORECASE,
            ),
        ),
    ]
    for virus_label, pat in positivity_patterns:
        m = pat.search(text)
        if m:
            try:
                positivity.append({"virus": virus_label, "positivity": _parse_float(m.group("val"))})
            except Exception:  # noqa: BLE001
                continue

    if detections:
        collapsed = {}
        for entry in detections:
            virus = entry["virus"]
            val = entry["detections"]
            current = collapsed.get(virus)
            if current is None or val > current["detections"]:
                collapsed[virus] = entry
        detections = list(collapsed.values())

    return {"detections": detections, "positivity": positivity}


def parse_bulletin(text: str) -> ExtractionResult:
    week = detect_week(text)
    season_year = detect_season_year(text)
    virus_counts = detect_virus_counts(text)
    metrics = detect_metrics(text)
    sari_adm = metrics.get("sari_admissions") or detect_sari_admissions(text)
    if sari_adm is not None:
        metrics["sari_admissions"] = sari_adm
    sari_icu = metrics.get("sari_icu") or detect_sari_icu_fallback(text)
    virology = detect_virology(text)

    return ExtractionResult(
        text=text,
        week=week,
        season_year=season_year,
        virus_counts=virus_counts,
        metrics=metrics,
        sari_admissions=sari_adm,
        sari_icu=sari_icu,
        virology=virology or None,
    )


def parse_args(argv: Iterable[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "source",
        nargs="?",
        default=None,
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
    parser.add_argument(
        "--folder",
        type=Path,
        default=None,
        help="Parse all PDF files in the given folder (ignores --save-pdf)",
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
    if not args.source and not args.folder:
        print("error: provide a source PDF/URL or use --folder to parse a directory", file=sys.stderr)
        return 2

    def _parse_pdf_path(pdf_path: Path) -> ExtractionResult:
        text = extract_text(pdf_path)
        result = parse_bulletin(text)
        if result.season_year is None:
            result.season_year = infer_season_year_from_filename(pdf_path, result.week)
        return result

    if args.folder:
        pdf_dir = args.folder
        pdfs = sorted(p for p in pdf_dir.glob("*.pdf") if p.is_file())
        if not pdfs:
            print(f"No PDF files found in {pdf_dir}", file=sys.stderr)
            return 1

        aggregated = []
        for pdf_path in pdfs:
            try:
                result = _parse_pdf_path(pdf_path)
                payload = result.to_dashboard_payload()
                aggregated.append(
                    {
                        "file": str(pdf_path),
                        "week": result.week,
                        "season_year": result.season_year,
                        "payload": payload,
                    }
                )
                print(
                    f"[ok] {pdf_path.name} -> week {result.week or 'unknown'}, season {result.season_year or 'unknown'}"
                )
            except Exception as exc:  # noqa: BLE001
                print(f"[fail] {pdf_path}: {exc}", file=sys.stderr)

        args.output.write_text(json.dumps(aggregated, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Parsed {len(aggregated)} PDFs from {pdf_dir} -> {args.output}")
        return 0

    pdf_path = resolve_pdf(args.source, args.save_pdf)
    result = _parse_pdf_path(pdf_path)
    payload = result.to_dashboard_payload()
    args.output.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"Parsed week: {result.week or 'unknown'} · season: {result.season_year or 'unknown'}")
    print(f"Virus counts: {result.virus_counts}")
    print(f"Metrics: {result.metrics}")
    print(f"Wrote snapshot to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
