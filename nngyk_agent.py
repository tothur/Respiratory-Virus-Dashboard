"""Combined NNGYK monitor + extractor.

Features:
- Polls the NNGYK season page for new bulletin PDFs (default every 3 hours).
- Downloads newly posted PDFs (or all known links when --sync-all is used).
- Extracts weekly metrics from every PDF in the download folder and writes nngyk_all.json.

Usage examples:
  python3 nngyk_agent.py --once
  python3 nngyk_agent.py --interval-hours 3   # continuous loop
  python3 nngyk_agent.py --sync-all --once    # redownload all listed PDFs, then extract
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Iterable, List
from urllib.error import HTTPError, URLError

from nngyk_monitor import CATEGORY_URL, MonitorState, _download_pdf, fetch_pdf_links
from erviss_sari_fetch import DEFAULT_URL as ERVISS_URL, DEFAULT_OUTPUT as ERVISS_OUTPUT, DEFAULT_CSV_COPY, main as fetch_erviss
from nngyk_extract import ExtractionResult, extract_text, parse_bulletin

DEFAULT_INTERVAL_HOURS = 3


def extract_folder(pdf_dir: Path, output: Path) -> int:
    """Parse all PDFs in a folder and write aggregated JSON list."""
    pdfs = sorted(p for p in pdf_dir.glob("*.pdf") if p.is_file())
    if not pdfs:
        print(f"No PDFs found in {pdf_dir}", file=sys.stderr)
        return 1

    aggregated: List[dict] = []
    for pdf_path in pdfs:
        try:
            text = extract_text(pdf_path)
            result: ExtractionResult = parse_bulletin(text)
            payload = result.to_dashboard_payload()
            aggregated.append(
                {
                    "file": str(pdf_path),
                    "week": result.week,
                    "season_year": result.season_year,
                    "payload": payload,
                }
            )
            print(f"[ok] {pdf_path.name} -> week {result.week or 'unknown'}, season {result.season_year or 'unknown'}")
        except Exception as exc:  # noqa: BLE001
            print(f"[fail] {pdf_path}: {exc}", file=sys.stderr)

    output.write_text(json.dumps(aggregated, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Parsed {len(aggregated)} PDFs from {pdf_dir} -> {output}")
    return 0


def download_pdfs(urls: List[str], download_dir: Path) -> List[Path]:
    saved: List[Path] = []
    for url in urls:
        try:
            saved.append(_download_pdf(url, download_dir))
            print(f"[downloaded] {url}")
        except Exception as exc:  # noqa: BLE001
            print(f"[download failed] {url}: {exc}", file=sys.stderr)
    return saved


def check_and_extract(
    state_path: Path,
    download_dir: Path,
    output: Path,
    sync_all: bool = False,
    fetch_erviss_url: str | None = None,
    erviss_output: Path | None = None,
    erviss_csv_copy: Path | None = None,
) -> int:
    state = MonitorState.load(state_path)
    all_urls = fetch_pdf_links()

    target_urls = all_urls if sync_all else [u for u in all_urls if u not in state.seen_urls]
    if target_urls:
        download_pdfs(target_urls, download_dir)
    else:
        print("No new PDFs to download.")

    # Always update state to include current listings so we don't re-alert on next run
    state.seen_urls.update(all_urls)
    state.save(state_path)

    # Extract all PDFs currently in the folder
    result = extract_folder(download_dir, output)
    if fetch_erviss_url and erviss_output:
        try:
            print(f"Fetching ERVISS SARI CSV: {fetch_erviss_url}")
            args = ["--url", fetch_erviss_url, "--output", str(erviss_output)]
            if erviss_csv_copy:
                args.extend(["--csv-copy", str(erviss_csv_copy)])
            fetch_erviss(args)
        except Exception as exc:  # noqa: BLE001
            print(f"[warn] Failed to fetch ERVISS SARI data: {exc}", file=sys.stderr)
    return result


def parse_args(argv: Iterable[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--state-file", type=Path, default=Path("nngyk_seen.json"), help="Path for seen-URL state")
    parser.add_argument("--download-dir", type=Path, default=Path("nngyk_pdfs"), help="Where to store downloaded PDFs")
    parser.add_argument("--output", type=Path, default=Path("nngyk_all.json"), help="Aggregated JSON output path")
    parser.add_argument("--interval-hours", type=float, default=DEFAULT_INTERVAL_HOURS, help="Polling interval when looping")
    parser.add_argument("--once", action="store_true", help="Run a single cycle (fetch+download+extract) and exit")
    parser.add_argument(
        "--sync-all",
        action="store_true",
        help="Redownload all listed PDFs (not just new links) before extracting",
    )
    parser.add_argument(
        "--skip-erviss",
        action="store_true",
        help="Disable fetching ERVISS SARI CSV during this run (defaults to on).",
    )
    parser.add_argument(
        "--erviss-url",
        default=ERVISS_URL,
        help="CSV URL for ERVISS SARI virological EU/EEA data (set empty to skip)",
    )
    parser.add_argument(
        "--erviss-output",
        type=Path,
        default=Path(ERVISS_OUTPUT),
        help="Where to write the ERVISS JSON snapshot",
    )
    parser.add_argument(
        "--erviss-csv-copy",
        type=Path,
        default=Path(DEFAULT_CSV_COPY),
        help="Where to save a copy of the downloaded ERVISS CSV",
    )
    return parser.parse_args(argv)


def main(argv: Iterable[str] | None = None) -> int:
    args = parse_args(argv)

    def run_cycle() -> int:
        print(f"Checking {CATEGORY_URL}")
        fetch_url = None if args.skip_erviss else (args.erviss_url or None)
        if fetch_url:
            args.erviss_output.parent.mkdir(parents=True, exist_ok=True)
            args.erviss_csv_copy.parent.mkdir(parents=True, exist_ok=True)
        return check_and_extract(
            args.state_file,
            args.download_dir,
            args.output,
            sync_all=args.sync_all,
            fetch_erviss_url=fetch_url,
            erviss_output=args.erviss_output if fetch_url else None,
            erviss_csv_copy=args.erviss_csv_copy if fetch_url else None,
        )

    if args.once:
        try:
            return run_cycle()
        except (HTTPError, URLError) as err:
            print(f"Request error: {err}", file=sys.stderr)
            return 1
        except Exception as exc:  # noqa: BLE001
            print(f"Unexpected error: {exc}", file=sys.stderr)
            return 1

    print(f"Starting continuous monitor of {CATEGORY_URL}")
    print(f"Polling every {args.interval_hours} hours. Output: {args.output} | PDFs: {args.download_dir}")
    while True:
        try:
            run_cycle()
        except (HTTPError, URLError) as err:
            print(f"Request error: {err}", file=sys.stderr)
        except Exception as exc:  # noqa: BLE001
            print(f"Unexpected error: {exc}", file=sys.stderr)
        time.sleep(max(int(args.interval_hours * 3600), 60))


if __name__ == "__main__":
    raise SystemExit(main())
