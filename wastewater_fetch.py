#!/usr/bin/env python3
"""Fetch NNGYK national respiratory-virus wastewater time series."""

from __future__ import annotations

import argparse
import json
import re
import ssl
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable
from urllib.request import Request, urlopen

DEFAULT_URL = "https://jarvpub.nngyk.gov.hu/hu/szennyviz-jelentes"
DEFAULT_OUTPUT = "wastewater.json"
USER_AGENT = "Respiratory-Virus-Dashboard/1.0"


class _TableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.tables: list[list[list[str]]] = []
        self.page_text: list[str] = []
        self._table: list[list[str]] | None = None
        self._row: list[str] | None = None
        self._cell: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        del attrs
        tag = tag.lower()
        if tag in {"table", "dap-ds-table"}:
            self._table = []
        elif tag in {"tr", "dap-ds-table-row"} and self._table is not None:
            self._row = []
        elif tag in {"th", "td", "dap-ds-table-header", "dap-ds-table-cell"} and self._row is not None:
            self._cell = []

    def handle_data(self, data: str) -> None:
        text = data.strip()
        if text:
            self.page_text.append(text)
            if self._cell is not None:
                self._cell.append(text)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in {"th", "td", "dap-ds-table-header", "dap-ds-table-cell"} and self._cell is not None and self._row is not None:
            self._row.append(" ".join(self._cell))
            self._cell = None
        elif tag in {"tr", "dap-ds-table-row"} and self._row is not None and self._table is not None:
            if self._row:
                self._table.append(self._row)
            self._row = None
        elif tag in {"table", "dap-ds-table"} and self._table is not None:
            if self._table:
                self.tables.append(self._table)
            self._table = None


def _normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\xa0", " ")).strip()


def _parse_number(value: str) -> float | None:
    token = re.sub(r"[^0-9,.-]", "", value.replace("\xa0", "").replace(" ", ""))
    if not token:
        return None
    if "," in token:
        token = token.replace(".", "").replace(",", ".")
    try:
        parsed = float(token)
    except ValueError:
        return None
    return parsed if parsed >= 0 else None


def _parse_year_week(value: str) -> tuple[int, int] | None:
    match = re.search(r"(20\d{2})\D+(\d{1,2})\.?\s*h[eé]t", _normalize(value), re.IGNORECASE)
    if not match:
        return None
    year, week = int(match.group(1)), int(match.group(2))
    if not 1 <= week <= 53:
        return None
    return year, week


def _virus_for_header(value: str) -> str | None:
    normalized = _normalize(value).lower()
    if "influenza a" in normalized and "koncentr" in normalized:
        return "Influenza A"
    if "influenza b" in normalized and "koncentr" in normalized:
        return "Influenza B"
    if ("sars-cov-2" in normalized or "sars-cov" in normalized) and "koncentr" in normalized:
        return "SARS-CoV-2"
    if "rsv" in normalized and "koncentr" in normalized:
        return "RSV"
    return None


def parse_wastewater_html(html: str, *, source_url: str = DEFAULT_URL) -> dict:
    parser = _TableParser()
    parser.feed(html)

    observations: dict[tuple[int, int, str], dict] = {}
    for table in parser.tables:
        header_index = next(
            (index for index, row in enumerate(table) if row and "hét" in _normalize(row[0]).lower()),
            None,
        )
        if header_index is None:
            continue
        headers = table[header_index]
        virus_columns = [(index, _virus_for_header(header)) for index, header in enumerate(headers)]
        virus_columns = [(index, virus) for index, virus in virus_columns if virus]
        if not virus_columns:
            continue

        for row in table[header_index + 1 :]:
            if not row:
                continue
            year_week = _parse_year_week(row[0])
            if year_week is None:
                continue
            year, week = year_week
            for index, virus in virus_columns:
                if index >= len(row):
                    continue
                concentration = _parse_number(row[index])
                if concentration is None:
                    continue
                observations[(year, week, virus)] = {
                    "year": year,
                    "week": week,
                    "virus": virus,
                    "concentration": concentration,
                    "unit": "GC/L",
                }

    if not observations:
        raise ValueError("No national wastewater concentration tables found")

    page_text = " ".join(parser.page_text)
    report_match = re.search(r"Szennyv[íi]z\s*jelent[ée]s\s*(20\d{2}-\d{2}-\d{2})", page_text, re.IGNORECASE)
    rows = sorted(observations.values(), key=lambda row: (row["year"], row["week"], row["virus"]))
    latest = max(rows, key=lambda row: (row["year"], row["week"]))
    return {
        "source": source_url,
        "source_updated_at": report_match.group(1) if report_match else None,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "latest_year": latest["year"],
        "latest_week": latest["week"],
        "provisional": True,
        "national": rows,
    }


def fetch_wastewater(url: str = DEFAULT_URL, timeout: int = 30) -> dict:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    context = ssl.create_default_context()
    with urlopen(request, timeout=timeout, context=context) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        html = response.read().decode(charset, errors="replace")
    return parse_wastewater_html(html, source_url=url)


def parse_args(argv: Iterable[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--output", type=Path, default=Path(DEFAULT_OUTPUT))
    return parser.parse_args(argv)


def main(argv: Iterable[str] | None = None) -> int:
    args = parse_args(argv)
    payload = fetch_wastewater(args.url)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(
        f"Fetched {len(payload['national'])} wastewater observations through "
        f"{payload['latest_year']}-W{payload['latest_week']:02d} -> {args.output}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
